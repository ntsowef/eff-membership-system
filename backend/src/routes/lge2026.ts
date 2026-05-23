import { Router, Request, Response } from 'express';
import Joi from 'joi';
import ExcelJS from 'exceljs';
import { Lge2026Model } from '../models/lge2026';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { validate } from '../middleware/validation';

const router = Router();

// =====================================================
// Validation Schemas
// =====================================================

const wardCodeSchema = Joi.object({
  ward_code: Joi.string().required()
});

const candidateIdSchema = Joi.object({
  candidate_id: Joi.number().integer().required()
});

const nominateSchema = Joi.object({
  member_id: Joi.number().integer().required(),
  notes: Joi.string().allow('', null).optional(),
  campaign_statement: Joi.string().allow('', null).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'withdrawn').required(),
  notes: Joi.string().allow('', null).optional()
});

// Helper to resolve the acting user_id consistently with other routes.
const getUserId = (req: Request): number => {
  const user: any = (req as any).user;
  return user?.user_id ?? user?.id;
};

// =====================================================
// Cross-ward Candidate List & Export
// These routes MUST be defined before /ward/:ward_code/*
// to avoid Express treating "candidates" as a ward_code param.
// =====================================================

const EXPORT_COLUMNS = [
  'Candidate Name', 'Surname', 'ID Number', 'Cell Number', 'Email',
  'Ward Code', 'Ward Name', 'Municipality', 'Province',
  'Status', 'Nominated Date', 'Approved Date', 'Voting District',
];

/**
 * GET /api/v1/lge2026/candidates
 * Paginated cross-ward candidate list with optional filters.
 */
router.get('/candidates',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 200, 1000);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const { candidates, total } = await Lge2026Model.getAllCandidates({
      province_code: req.query.province as string | undefined,
      municipality_code: req.query.municipality as string | undefined,
      ward_code: req.query.ward as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      limit,
      offset,
    });

    sendSuccess(res, { candidates, total, limit, offset }, 'Candidates retrieved successfully');
  })
);

/**
 * GET /api/v1/lge2026/candidates/export
 * Export all matching candidates as CSV or XLSX.
 */
router.get('/candidates/export',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const format = (req.query.format as string) === 'xlsx' ? 'xlsx' : 'csv';

    const { candidates } = await Lge2026Model.getAllCandidates({
      province_code: req.query.province as string | undefined,
      municipality_code: req.query.municipality as string | undefined,
      ward_code: req.query.ward as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      limit: 100000,
      offset: 0,
    });

    const dateStr = new Date().toISOString().split('T')[0];

    const rowMapper = (c: any) => [
      c.member_firstname ?? '',
      c.member_surname ?? '',
      c.id_number ?? '',
      c.cell_number ?? '',
      c.email ?? '',
      c.ward_code ?? '',
      c.ward_name ?? '',
      c.municipality_name ?? '',
      (c as any).province_name ?? (c as any).province_code ?? '',
      c.status ?? '',
      c.nominated_at ? new Date(c.nominated_at).toISOString().split('T')[0] : '',
      c.decided_at && c.status === 'approved' ? new Date(c.decided_at).toISOString().split('T')[0] : '',
      c.voting_district_name ?? c.voting_district_code ?? '',
    ];

    if (format === 'csv') {
      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      let csv = EXPORT_COLUMNS.map(escapeCsv).join(',') + '\n';
      for (const c of candidates) {
        csv += rowMapper(c).map(String).map(escapeCsv).join(',') + '\n';
      }

      const filename = `lge2026_candidates_${dateStr}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      return;
    }

    // XLSX
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EFF Membership System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Candidates');
    sheet.columns = EXPORT_COLUMNS.map((header, i) => ({
      header,
      key: `col${i}`,
      width: header.length + 6,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    for (const c of candidates) {
      const vals = rowMapper(c);
      const rowData: Record<string, string> = {};
      vals.forEach((v, i) => { rowData[`col${i}`] = v; });
      sheet.addRow(rowData);
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    const filename = `lge2026_candidates_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(xlsxBuffer));
  })
);

// =====================================================
// LGE2026 Ward Candidate Selection
// Geographic cascade (Province -> Municipality -> Ward) is served by the
// existing /api/v1/ward-audit/municipalities and /api/v1/ward-audit/wards
// endpoints, so this router only owns candidate-management endpoints.
// =====================================================

/**
 * GET /api/v1/lge2026/ward/:ward_code/candidates
 * List the full candidate history for a ward (active + historical).
 */
router.get('/ward/:ward_code/candidates',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const candidates = await Lge2026Model.getCandidatesByWard(ward_code);
    sendSuccess(res, candidates, 'LGE2026 candidates retrieved successfully');
  })
);

/**
 * GET /api/v1/lge2026/ward/:ward_code/candidate
 * Get the single active candidate for a ward (nominated or approved),
 * or null if none.
 */
router.get('/ward/:ward_code/candidate',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const candidate = await Lge2026Model.getActiveCandidateByWard(ward_code);
    sendSuccess(res, candidate, candidate
      ? 'Active LGE2026 candidate retrieved successfully'
      : 'No active LGE2026 candidate for this ward');
  })
);

/**
 * GET /api/v1/lge2026/ward/:ward_code/eligible-members
 * Eligible members within the ward, annotated with any existing candidacy.
 */
router.get('/ward/:ward_code/eligible-members',
  authenticate,
  requirePermission('ward_audit.read'),
  validate({ params: wardCodeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const members = await Lge2026Model.getEligibleWardMembers(ward_code);
    sendSuccess(res, members, 'Eligible ward members retrieved successfully');
  })
);

/**
 * POST /api/v1/lge2026/ward/:ward_code/candidate
 * Nominate a single Ward Councillor Candidate for the ward.
 * Enforces exactly one active candidate per ward.
 */
router.post('/ward/:ward_code/candidate',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  validate({ params: wardCodeSchema, body: nominateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 'Authenticated user_id is required', 401);
    }

    const candidate = await Lge2026Model.nominateCandidate({
      ward_code,
      member_id: req.body.member_id,
      nominated_by: userId,
      notes: req.body.notes ?? null,
      campaign_statement: req.body.campaign_statement ?? null,
    });

    sendSuccess(res, candidate, 'Ward Councillor Candidate nominated successfully', 201);
  })
);

/**
 * PATCH /api/v1/lge2026/candidate/:candidate_id/status
 * Approve or withdraw an existing candidate.
 */
router.patch('/candidate/:candidate_id/status',
  authenticate,
  requirePermission('ward_audit.approve'),
  validate({ params: candidateIdSchema, body: updateStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidate_id, 10);
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 'Authenticated user_id is required', 401);
    }

    const updated = await Lge2026Model.updateCandidateStatus(
      candidateId,
      req.body.status,
      userId,
      req.body.notes ?? null
    );

    sendSuccess(res, updated, `Candidate ${req.body.status} successfully`);
  })
);

export default router;
