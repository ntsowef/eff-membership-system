import { Router, Request, Response } from 'express';
import Joi from 'joi';
import ExcelJS from 'exceljs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Lge2026Model } from '../models/lge2026';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { validate } from '../middleware/validation';

const router = Router();

// =====================================================
// Candidate Document Upload Configuration
// =====================================================
const CANDIDATE_DOCS_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, 'candidate-documents')
  : path.join('uploads', 'candidate-documents');

if (!fs.existsSync(CANDIDATE_DOCS_DIR)) {
  fs.mkdirSync(CANDIDATE_DOCS_DIR, { recursive: true });
}

const candidateDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CANDIDATE_DOCS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    cb(null, `candidate_${file.fieldname}_${timestamp}_${random}${ext}`);
  },
});

const candidateDocUpload = multer({
  storage: candidateDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Accepted: PDF, JPEG, PNG, DOC, DOCX`));
    }
  },
});

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

const updateMemberDetailsSchema = Joi.object({
  firstname: Joi.string().min(1).max(100).required(),
  surname: Joi.string().min(1).max(100).required(),
  cell_number: Joi.string().allow('', null).optional(),
  email: Joi.alternatives().try(
    Joi.string().email(),
    Joi.string().valid('', null)
  ).optional()
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
  candidateDocUpload.fields([
    { name: 'candidate_cv', maxCount: 1 },
    { name: 'iec_form_c2', maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { ward_code } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 'Authenticated user_id is required', 401);
    }

    const body = req.body;
    const memberId = parseInt(body.member_id, 10);
    if (!memberId || isNaN(memberId)) {
      return sendError(res, 'member_id is required', 400);
    }

    // Extract uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let cvPath: string | null = null;
    let cvOriginalName: string | null = null;
    let iecFormC2Path: string | null = null;
    let iecFormC2OriginalName: string | null = null;

    if (files?.candidate_cv?.[0]) {
      cvPath = files.candidate_cv[0].filename;
      cvOriginalName = files.candidate_cv[0].originalname;
    }
    if (files?.iec_form_c2?.[0]) {
      iecFormC2Path = files.iec_form_c2[0].filename;
      iecFormC2OriginalName = files.iec_form_c2[0].originalname;
    }

    const candidate = await Lge2026Model.nominateCandidate({
      ward_code,
      member_id: memberId,
      nominated_by: userId,
      notes: body.notes || null,
      campaign_statement: body.campaign_statement || null,
      cv_path: cvPath,
      cv_original_name: cvOriginalName,
      iec_form_c2_path: iecFormC2Path,
      iec_form_c2_original_name: iecFormC2OriginalName,
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

/**
 * POST /api/v1/lge2026/candidate/:candidate_id/documents
 * Upload CV and/or IEC Form C2 for an existing candidate.
 */
router.post('/candidate/:candidate_id/documents',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  candidateDocUpload.fields([
    { name: 'candidate_cv', maxCount: 1 },
    { name: 'iec_form_c2', maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidate_id, 10);

    const candidate = await Lge2026Model.getCandidateById(candidateId);
    if (!candidate) {
      return sendError(res, 'Candidate not found', 404);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const updates: Record<string, string | null> = {};

    if (files?.candidate_cv?.[0]) {
      // Delete old CV file if it exists
      if (candidate.cv_path) {
        const oldPath = path.join(CANDIDATE_DOCS_DIR, candidate.cv_path);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
      updates.cv_path = files.candidate_cv[0].filename;
      updates.cv_original_name = files.candidate_cv[0].originalname;
    }
    if (files?.iec_form_c2?.[0]) {
      // Delete old IEC Form C2 file if it exists
      if (candidate.iec_form_c2_path) {
        const oldPath = path.join(CANDIDATE_DOCS_DIR, candidate.iec_form_c2_path);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
      updates.iec_form_c2_path = files.iec_form_c2[0].filename;
      updates.iec_form_c2_original_name = files.iec_form_c2[0].originalname;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }

    await Lge2026Model.updateCandidateDocuments(candidateId, updates);
    const updated = await Lge2026Model.getCandidateById(candidateId);

    sendSuccess(res, updated, 'Candidate documents uploaded successfully');
  })
);

/**
 * GET /api/v1/lge2026/candidate/:candidate_id/document/:doc_type
 * Download a candidate document (cv or iec_form_c2).
 */
router.get('/candidate/:candidate_id/document/:doc_type',
  authenticate,
  requirePermission('ward_audit.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidate_id, 10);
    const docType = req.params.doc_type; // 'cv' or 'iec_form_c2'

    const candidate = await Lge2026Model.getCandidateById(candidateId);
    if (!candidate) {
      return sendError(res, 'Candidate not found', 404);
    }

    let filePath: string | null = null;
    let originalName: string | null = null;

    if (docType === 'cv') {
      filePath = candidate.cv_path || null;
      originalName = candidate.cv_original_name || null;
    } else if (docType === 'iec_form_c2') {
      filePath = candidate.iec_form_c2_path || null;
      originalName = candidate.iec_form_c2_original_name || null;
    } else {
      return sendError(res, 'Invalid document type. Use "cv" or "iec_form_c2"', 400);
    }

    if (!filePath) {
      return sendError(res, `No ${docType} document uploaded for this candidate`, 404);
    }

    const fullPath = path.join(CANDIDATE_DOCS_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      return sendError(res, 'Document file not found on server', 404);
    }

    res.download(fullPath, originalName || filePath);
  })
);

/**
 * PATCH /api/v1/lge2026/candidate/:candidate_id/member-details
 * Update the candidate's personal details (name, phone, email)
 * in the members_consolidated table.
 */
router.patch('/candidate/:candidate_id/member-details',
  authenticate,
  requirePermission('ward_audit.manage_delegates'),
  asyncHandler(async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.candidate_id, 10);
    if (!candidateId || isNaN(candidateId)) {
      return sendError(res, 'Valid candidate_id is required', 400);
    }

    const { firstname, surname, cell_number, email } = req.body;

    if (!firstname || typeof firstname !== 'string' || !firstname.trim()) {
      return sendError(res, 'First name is required', 400);
    }
    if (!surname || typeof surname !== 'string' || !surname.trim()) {
      return sendError(res, 'Surname is required', 400);
    }

    const candidate = await Lge2026Model.getCandidateById(candidateId);
    if (!candidate) {
      return sendError(res, 'Candidate not found', 404);
    }

    await Lge2026Model.updateMemberDetails(candidate.member_id, {
      firstname: firstname.trim(),
      surname: surname.trim(),
      cell_number: cell_number?.trim() || null,
      email: email?.trim() || null,
    });

    // Re-fetch candidate to return updated joined data
    const updated = await Lge2026Model.getCandidateById(candidateId);
    sendSuccess(res, updated, 'Member details updated successfully');
  })
);

export default router;
