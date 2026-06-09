import express, { Request, Response } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { authenticate, requirePermission } from '../middleware/auth';
import { ExcelReportService } from '../services/excelReportService';
import { VoterRegistrationReportService } from '../services/voterRegistrationReportService';
import { PDFExportService } from '../services/pdfExportService';
import { VotingDistrictReportService } from '../services/votingDistrictReportService';
import { ViewsService } from '../services/viewsService';
import { WordDocumentService } from '../services/wordDocumentService';
import { HtmlPdfService } from '../services/htmlPdfService';
import { executeQuery, executeQuerySingle } from '../config/database';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import Joi from 'joi';

const router = express.Router();

/**
 * GET /api/v1/reports/daily
 * Generate daily membership and financial report
 */
router.get('/daily',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      format: Joi.string().valid('excel', 'pdf').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { date, format = 'excel' } = req.query;

    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await ExcelReportService.generateDailyReport(date as string);

      const reportDate = date || new Date().toISOString().split('T')[0];

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${reportDate}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      return res.send(excelBuffer);
    } else {
      return res.status(501).json({
        success: false,
        message: 'PDF format for daily reports is not yet implemented',
        data: {
          format: format,
          note: 'Excel export is available. PDF format will be available in a future update.'
        }
      });
    }
  })
);

/**
 * GET /api/v1/reports/srpa-delegates
 * Generate SRPA delegates report
 */
router.get('/srpa-delegates',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      ward_code: Joi.string().optional(),
      format: Joi.string().valid('excel', 'pdf').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, ward_code, format = 'excel' } = req.query;

    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await ExcelReportService.generateSRPADelegatesReport({
        province_code: province_code as string,
        municipality_code: municipality_code as string,
        ward_code: ward_code as string
      });

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="srpa-delegates-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      return res.send(excelBuffer);
    } else {
      return res.status(501).json({
        success: false,
        message: 'PDF format for SRPA delegates reports is not yet implemented',
        data: {
          format: format,
          note: 'Excel export is available. PDF format will be available in a future update.'
        }
      });
    }
  })
);

/**
 * GET /api/v1/reports/expired-members
 * Generate expired members report (expiry_date < CURRENT_DATE)
 */
router.get('/expired-members',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      expiry_date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      expiry_date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      format: Joi.string().valid('excel').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, expiry_date_from, expiry_date_to } = req.query;

    const excelBuffer = await ExcelReportService.generateExpiredMembersReport({
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      expiry_date_from: expiry_date_from as string,
      expiry_date_to: expiry_date_to as string,
    });

    // Build dynamic filename reflecting applied date range
    const dateStr = new Date().toISOString().split('T')[0];
    const rangeSuffix = (expiry_date_from || expiry_date_to)
      ? `-${expiry_date_from || 'start'}-to-${expiry_date_to || 'end'}`
      : `-${dateStr}`;
    const filename = `expired-members${rangeSuffix}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.send(excelBuffer);
  })
);

/**
 * GET /api/v1/reports/expiring-members
 * Generate expiring members report (expiry_date >= CURRENT_DATE, optional look-ahead window)
 */
router.get('/expiring-members',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      expiry_date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      expiry_date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      format: Joi.string().valid('csv', 'excel').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, expiry_date_from, expiry_date_to, format = 'excel' } = req.query;

    const reportBuffer = await ExcelReportService.generateExpiringMembersReport(
      {
        province_code: province_code as string,
        municipality_code: municipality_code as string,
        expiry_date_from: expiry_date_from as string,
        expiry_date_to: expiry_date_to as string,
      },
      format as 'csv' | 'excel'
    );

    // Build dynamic filename reflecting applied date range
    const dateStr = new Date().toISOString().split('T')[0];
    const rangeSuffix = (expiry_date_from || expiry_date_to)
      ? `-${expiry_date_from || dateStr}-to-${expiry_date_to || 'open'}`
      : `-${dateStr}`;
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `expiring-members${rangeSuffix}.${ext}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', reportBuffer.length);
      return res.send(reportBuffer);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', reportBuffer.length);
    return res.send(reportBuffer);
  })
);

/**
 * GET /api/v1/reports/not-registered
 * Generate not registered members report (voting_district_code = '99999999')
 */
router.get('/not-registered',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      format: Joi.string().valid('excel', 'pdf').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, format = 'excel' } = req.query;

    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await ExcelReportService.generateNotRegisteredMembersReport({
        province_code: province_code as string
      });

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="not-registered-members-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      return res.send(excelBuffer);
    } else {
      return res.status(501).json({
        success: false,
        message: 'PDF format for not registered members report is not yet implemented',
        data: {
          format: format,
          note: 'Excel export is available. PDF format will be available in a future update.'
        }
      });
    }
  })
);

/**
 * GET /api/v1/reports/different-ward
 * Generate different ward members report (voting_district_code = '22222222')
 */
router.get('/different-ward',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      format: Joi.string().valid('excel', 'pdf').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, format = 'excel' } = req.query;

    if (format === 'excel') {
      // Generate Excel report
      const excelBuffer = await ExcelReportService.generateDifferentWardMembersReport({
        province_code: province_code as string
      });

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="different-ward-members-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      return res.send(excelBuffer);
    } else {
      return res.status(501).json({
        success: false,
        message: 'PDF format for different ward members report is not yet implemented',
        data: {
          format: format,
          note: 'Excel export is available. PDF format will be available in a future update.'
        }
      });
    }
  })
);

/**
 * POST /api/v1/reports/generate-all
 * Generate all three reports and save to reports directory
 */
router.post('/generate-all',
  authenticate,
  requirePermission('reports.admin'),
  validate({
    body: Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { date, province_code, municipality_code } = req.body;

    try {
      // Generate Ward Audit Report
      const auditBuffer = await ExcelReportService.generateWardAuditReport({
        province_code,
        municipality_code
      });
      const auditPath = await ExcelReportService.saveReportToFile(auditBuffer, 'Audit.xlsx');

      // Generate Daily Report
      const dailyBuffer = await ExcelReportService.generateDailyReport(date);
      const dailyPath = await ExcelReportService.saveReportToFile(dailyBuffer, 'DAILY REPORT.xlsx');

      // Generate SRPA Delegates Report
      const delegatesBuffer = await ExcelReportService.generateSRPADelegatesReport({
        province_code,
        municipality_code
      });
      const delegatesPath = await ExcelReportService.saveReportToFile(
        delegatesBuffer,
        'ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx'
      );

      return res.json({
        success: true,
        message: 'All reports generated successfully',
        data: {
          reports: [
            { name: 'Audit Report', path: auditPath },
            { name: 'Daily Report', path: dailyPath },
            { name: 'SRPA Delegates Report', path: delegatesPath }
          ]
        }
      });
    } catch (error: any) {
      console.error('Error generating reports:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate reports',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// ================================================
// VOTER REGISTRATION REPORT ENDPOINTS
// ================================================

/**
 * GET /api/v1/reports/voter-registration/summary
 * Get voter registration report summary with counts
 */
router.get('/voter-registration/summary',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      voter_status: Joi.string().valid('registered', 'not_registered', 'all').default('all')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, voter_status } = req.query;

    const result = await VoterRegistrationReportService.getSummary({
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      voter_status: voter_status as 'registered' | 'not_registered' | 'all'
    });

    return res.json({
      success: true,
      message: 'Voter registration report summary retrieved successfully',
      data: result
    });
  })
);

/**
 * GET /api/v1/reports/voter-registration/category
 * Get paginated members for a specific category
 */
router.get('/voter-registration/category',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      category: Joi.string().valid(
        'good_standing_with_phone',
        'good_standing_without_phone',
        'expired_with_phone',
        'expired_without_phone'
      ).required(),
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      voter_status: Joi.string().valid('registered', 'not_registered', 'all').default('all'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, province_code, municipality_code, voter_status, page, limit } = req.query;

    const result = await VoterRegistrationReportService.getCategoryMembers({
      category: category as any,
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      voter_status: voter_status as 'registered' | 'not_registered' | 'all',
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50
    });

    return res.json({
      success: true,
      message: 'Category members retrieved successfully',
      data: result
    });
  })
);

/**
 * GET /api/v1/reports/voter-registration/export-excel
 * Export voter registration report to Excel
 */
router.get('/voter-registration/export-excel',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      voter_status: Joi.string().valid('registered', 'not_registered', 'all').default('all')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, voter_status } = req.query;

    const excelBuffer = await VoterRegistrationReportService.exportToExcel({
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      voter_status: voter_status as 'registered' | 'not_registered' | 'all'
    });

    // Determine filename based on filters
    let regionSuffix = '';
    if (municipality_code) {
      regionSuffix = `_${municipality_code}`;
    } else if (province_code) {
      regionSuffix = `_${province_code}`;
    }

    const filename = `Voter_Registration_Report${regionSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.send(excelBuffer);
  })
);

/**
 * GET /api/v1/reports/voter-registration/export-pdf
 * Export voter registration report to PDF with hierarchical regional breakdowns
 */
router.get('/voter-registration/export-pdf',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      voter_status: Joi.string().valid('registered', 'not_registered', 'all').default('all'),
      include_charts: Joi.boolean().default(true)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, voter_status, include_charts } = req.query;

    // Get summary and regional data
    const { summary, regions } = await VoterRegistrationReportService.getSummary({
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      voter_status: voter_status as 'registered' | 'not_registered' | 'all'
    });

    // Generate PDF with charts and regional breakdown
    const pdfBuffer = await PDFExportService.exportVoterRegistrationReportToPDF(
      { summary, regions },
      {
        title: `Voter Registration Report for ${summary.region_name}`,
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        includeCharts: include_charts !== 'false',
        voterStatus: voter_status as string
      }
    );

    // Determine filename based on filters
    let regionSuffix = '';
    if (municipality_code) {
      regionSuffix = `_${municipality_code}`;
    } else if (province_code) {
      regionSuffix = `_${province_code}`;
    }

    const filename = `Voter_Registration_Report${regionSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  })
);

// ================================================
// DUPLICATE PHONE NUMBER REPORT ENDPOINTS
// ================================================

import { DuplicatePhoneReportService } from '../services/duplicatePhoneReportService';

/**
 * GET /api/v1/reports/duplicate-phones/summary
 * Get duplicate phone numbers with member details (paginated)
 */
router.get('/duplicate-phones/summary',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50)
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, page, limit } = req.query;

    const result = await DuplicatePhoneReportService.getSummary({
      province_code: province_code as string,
      municipality_code: municipality_code as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50
    });

    return res.json({
      success: true,
      message: 'Duplicate phone number report retrieved successfully',
      data: result
    });
  })
);

/**
 * GET /api/v1/reports/duplicate-phones/export-excel
 * Export duplicate phone number report to Excel
 */
router.get('/duplicate-phones/export-excel',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code } = req.query;

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Duplicate_Phone_Numbers_Report_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // No Content-Length — size is unknown until streaming finishes

    // Stream the workbook directly into the HTTP response.
    // WorkbookWriter.commit() ends the stream, so no explicit res.end() needed.
    await DuplicatePhoneReportService.generateToStream(res, {
      province_code: province_code as string,
      municipality_code: municipality_code as string
    });
  })
);

/**
 * GET /api/v1/reports/voting-districts
 * Export a 5-sheet report of voting districts with 5+ eligible active members.
 *
 * Uses streaming output — rows are written directly into the HTTP response as
 * they are generated so the server never holds the full workbook in memory.
 * Content-Length is omitted (streaming / chunked transfer-encoding).
 */
router.get('/voting-districts',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Voting_District_Members_Report_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // No Content-Length — size is unknown until streaming finishes

    // Stream the workbook directly into the HTTP response.
    // WorkbookWriter.commit() ends the stream, so no explicit res.end() needed.
    await VotingDistrictReportService.generateToStream(res);
  })
);

/**
 * GET /api/v1/reports/deceased-purge
 * Generate Deceased Member Purge Report (Excel — 3 sheets)
 * Query params: province_code (optional), run_id (optional)
 */
router.get('/deceased-purge',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().max(10).optional(),
      run_id: Joi.number().integer().positive().optional(),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const province_code = req.query.province_code as string | undefined;
    const run_id = req.query.run_id ? parseInt(req.query.run_id as string, 10) : undefined;

    const buffer = await ExcelReportService.generateDeceasedPurgeReport({ province_code, run_id });

    const dateStr = new Date().toISOString().split('T')[0];
    const suffix = province_code ? `_${province_code}` : run_id ? `_run${run_id}` : '';
    const filename = `Deceased_Purge_Report${suffix}_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  })
);

// =============================================================================
// LGE2026 Package — Membership Spreadsheet builder
// =============================================================================

/**
 * Column order for the LGE2026 Membership Spreadsheet "Members" sheet.
 * "Membership Status" is always rendered as the very last (rightmost) column.
 */
const LGE2026_MEMBERS_COLUMNS: { key: string; header: string; width: number }[] = [
  { key: 'province_name', header: 'Province', width: 18 },
  { key: 'district_name', header: 'District', width: 22 },
  { key: 'municipality_name', header: 'Municipality', width: 26 },
  { key: 'ward_code', header: 'Ward Code', width: 14 },
  { key: 'voting_district_code', header: 'VD Code', width: 14 },
  { key: 'voting_district_name', header: 'Voting District', width: 26 },
  { key: 'voting_station_name', header: 'Voting Station', width: 26 },
  { key: 'firstname', header: 'First Name', width: 18 },
  { key: 'surname', header: 'Surname', width: 18 },
  { key: 'id_number', header: 'ID Number', width: 16 },
  { key: 'cell_number', header: 'Cell Number', width: 16 },
  { key: 'email', header: 'Email', width: 28 },
  { key: 'date_joined', header: 'Date Joined', width: 14 },
  { key: 'expiry_date', header: 'Expiry Date', width: 14 },
  { key: 'membership_status', header: 'Membership Status', width: 18 },
];

interface VDBreakdownRow {
  voting_district_code: string;
  voting_district_name: string;
  member_count: number;
  active_members?: number;
  expired_members?: number;
  different_ward_members?: number;
}

async function buildLGE2026MembershipSpreadsheet(
  wardInfo: any,
  members: any[],
  vdBreakdown: VDBreakdownRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EFF Membership System';
  workbook.created = new Date();

  const vdCount = vdBreakdown.length;
  const vdsWithZero = vdBreakdown.filter(v => Number(v.member_count) === 0).length;

  // -------- Summary sheet: ward overview (vertical) + per-VD breakdown (vertical) --------
  const summary = workbook.addWorksheet('Summary');

  const thinBorder = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };

  // Column widths shared by both sections (label column + value/data columns)
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 44;
  summary.getColumn(3).width = 20;
  summary.getColumn(4).width = 16;
  summary.getColumn(5).width = 16;
  summary.getColumn(6).width = 28;
  summary.getColumn(7).width = 14;

  // Section 1: Ward Overview — vertical key/value pairs, one attribute per row
  const overviewTitleRow = summary.addRow(['Ward Overview']);
  overviewTitleRow.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  overviewTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC143C' } };
  overviewTitleRow.alignment = { horizontal: 'left', vertical: 'middle' };
  summary.mergeCells(overviewTitleRow.number, 1, overviewTitleRow.number, 7);

  // Total members in good standing — derived from the same `members` array used to
  // populate the Members sheet, counting the derived 'Active' membership_status.
  const activeGoodStandingCount = members.filter(
    (m: any) => String(m.membership_status || '') === 'Active'
  ).length;

  const wardOverviewRows: [string, string | number][] = [
    ['Ward Code', wardInfo.ward_code],
    ['Ward Number', wardInfo.ward_number || ''],
    ['Ward Name', wardInfo.ward_name || ''],
    ['Municipality', wardInfo.municipality_name || ''],
    ['Province', wardInfo.province_name || ''],
    ['Total Members in Good Standing (Active)', activeGoodStandingCount],
    ['Voting Districts (VDs)', vdCount],
    ['VDs With Zero Members', vdsWithZero],
  ];

  for (const [label, value] of wardOverviewRows) {
    const row = summary.addRow([label, value]);
    const labelCell = row.getCell(1);
    labelCell.font = { bold: true };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    labelCell.border = thinBorder;
    row.getCell(2).border = thinBorder;
  }

  // Spacer row
  summary.addRow([]);

  // Section 2: Voting District Breakdown — one VD per row
  const breakdownTitleRow = summary.addRow(['Voting District Breakdown']);
  breakdownTitleRow.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  breakdownTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  breakdownTitleRow.alignment = { horizontal: 'left', vertical: 'middle' };
  summary.mergeCells(breakdownTitleRow.number, 1, breakdownTitleRow.number, 7);

  const breakdownHeaderRow = summary.addRow([
    'VD Code', 'Voting District Name', 'Members Registered',
    'Active Members', 'Expired Members', 'Registered in Different Ward', 'Status',
  ]);
  breakdownHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  breakdownHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  breakdownHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
  breakdownHeaderRow.eachCell((cell) => { cell.border = thinBorder; });

  // Render one breakdown row across the expanded 7-column layout.
  const addBreakdownRow = (
    code: string,
    name: string,
    count: number,
    active: number,
    expired: number,
    differentWard: number,
  ) => {
    const isZero = count === 0;
    const row = summary.addRow([
      code,
      name,
      count,
      active,
      expired,
      differentWard,
      isZero ? 'No Members' : 'Has Members',
    ]);
    row.eachCell((cell) => { cell.border = thinBorder; });
    if (isZero) {
      // Highlight zero-member VDs so they are easy to spot (across all columns)
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        cell.font = { bold: true, color: { argb: 'FF721C24' } };
      });
    }
  };

  for (const vd of vdBreakdown) {
    addBreakdownRow(
      vd.voting_district_code,
      vd.voting_district_name || '',
      Number(vd.member_count) || 0,
      Number(vd.active_members) || 0,
      Number(vd.expired_members) || 0,
      Number(vd.different_ward_members) || 0,
    );
  }

  // The breakdown SQL joins members on a matching real VD code, so members tagged
  // with the "Registered in Different Ward" sentinel (22222222/222222222) never
  // attach to a real in-ward VD. Surface them as a dedicated row computed from the
  // same `members` array used for the Members sheet so the totals stay consistent.
  const SENTINEL_DIFFERENT_WARD = new Set(['22222222', '222222222']);
  const differentWardMembers = members.filter(
    (m: any) => SENTINEL_DIFFERENT_WARD.has(String(m.voting_district_code || '').trim())
  );
  if (differentWardMembers.length > 0) {
    const diffActive = differentWardMembers.filter((m: any) => m.membership_status_id === 1).length;
    const diffExpired = differentWardMembers.filter((m: any) => m.membership_status_id === 3).length;
    addBreakdownRow(
      '22222222',
      'Registered in Different Ward',
      differentWardMembers.length,
      diffActive,
      diffExpired,
      differentWardMembers.length,
    );
  }

  // -------- Members sheet (Membership Status always last) --------
  const columns = LGE2026_MEMBERS_COLUMNS;

  const sheet = workbook.addWorksheet('Members');
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).eachCell((cell) => { cell.border = thinBorder; });

  const colCount = columns.length;

  // Background colour for a member row based on its membership status
  const statusBg = (status: string): string => {
    if (status === 'Active') return 'FFD4EDDA';
    if (status === 'Grace Period') return 'FFFFF3CD';
    if (status === 'Expired') return 'FFF8D7DA';
    if (status === 'Inactive') return 'FFE2E3E5';
    return 'FFFFFFFF';
  };

  // Add a full-width group header row (merged across all columns)
  const addGroupHeader = (title: string, argb: string) => {
    const row = sheet.addRow([title]);
    sheet.mergeCells(row.number, 1, row.number, colCount);
    const cell = row.getCell(1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = thinBorder;
  };

  // Add a single member data row with borders + status colour
  const addMemberRow = (m: any) => {
    const status = m.membership_status || 'Unknown';
    const row = sheet.addRow({
      province_name: m.province_name || '',
      district_name: m.district_name || '',
      municipality_name: m.municipality_name || m.municipal_name || '',
      ward_code: m.ward_code || '',
      voting_district_code: m.voting_district_code || '',
      voting_district_name: m.voting_district_name || '',
      voting_station_name: m.voting_station_name || '',
      firstname: m.firstname || '',
      surname: m.surname || '',
      id_number: m.id_number || '',
      cell_number: m.cell_number || '',
      email: m.email || '',
      date_joined: m.date_joined ? new Date(m.date_joined).toLocaleDateString('en-ZA') : '',
      expiry_date: m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-ZA') : '',
      membership_status: status,
    });
    const bg = statusBg(status);
    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    });
  };

  // Group a list of members by voting district/station. Returns groups ordered
  // alphabetically by station label, with members sorted by surname inside each.
  const groupByVotingStation = (list: any[]): [string, any[]][] => {
    const map = new Map<string, any[]>();
    for (const m of list) {
      const code = (m.voting_district_code || '').toString().trim();
      const label = (m.voting_district_name || m.voting_station_name || '').toString().trim()
        || code || 'Not Registered to vote';
      const key = `${label}|||${code}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.surname || '').localeCompare(b.surname || ''));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  // Render member groups, each preceded by a voting-station header row
  const renderGroups = (list: any[], headerArgb: string) => {
    for (const [key, groupMembers] of groupByVotingStation(list)) {
      const [label, code] = key.split('|||');
      const heading = `Voting Station: ${label}${code ? ` (VD Code: ${code})` : ''}  —  ${groupMembers.length} member(s)`;
      addGroupHeader(heading, headerArgb);
      for (const gm of groupMembers) addMemberRow(gm);
    }
  };

  // Split members: everything that is NOT expired is grouped by voting station
  // first; expired members are listed afterwards in their own section.
  const isExpired = (m: any) => String(m.membership_status || '').toLowerCase() === 'expired';
  const activeMembers = members.filter((m: any) => !isExpired(m));
  const expiredMembers = members.filter(isExpired);

  // Section 1: members grouped by voting station (non-expired)
  renderGroups(activeMembers, 'FF4472C4');

  // Section 2: expired members, after the voting-station groups
  if (expiredMembers.length > 0) {
    addGroupHeader(`EXPIRED MEMBERS (${expiredMembers.length})`, 'FFDC143C');
    renderGroups(expiredMembers, 'FF8E8E8E');
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

/**
 * GET /api/v1/reports/lge2026-package
 * Generate the LGE2026 Package: a ZIP containing the existing Attendance Register
 * (Word) and a newly formatted Membership Spreadsheet (Excel).
 *
 * Spreadsheet:
 *   - "Summary" sheet: ward totals plus a per-VD breakdown listing every active
 *     Voting District in the ward with its registered member count. VDs with
 *     zero members are explicitly highlighted.
 *   - "Members" sheet: members in the selected ward. "Membership Status" is
 *     always rendered as the very last (rightmost) column.
 *
 * The Attendance Register is generated identically to the existing
 * implementation in views.ts (WordDocumentService.generateWardAttendanceRegister).
 */
router.get('/lge2026-package',
  authenticate,
  requirePermission('members.read'),
  validate({
    query: Joi.object({
      ward_code: Joi.string().required(),
      province_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const ward_code = req.query.ward_code as string;

    // Load ward info (also used for authorization and file naming)
    const wardInfo: any = await executeQuerySingle(
      `SELECT DISTINCT
         ward_code, ward_name, ward_number,
         municipality_code, municipality_name,
         district_code, district_name,
         province_code, province_name
       FROM vw_member_details
       WHERE ward_code = $1`,
      [ward_code]
    );

    if (!wardInfo) {
      throw new NotFoundError(`Ward ${ward_code} not found`);
    }

    // Authorization check: provincial admins can only access wards in their assigned province
    if (req.user) {
      const userProvinceCode = (req.user as any).province_code;
      const isProvincialAdmin = req.user.admin_level === 'province';
      if (isProvincialAdmin && userProvinceCode && userProvinceCode !== wardInfo.province_code) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PROVINCE_ACCESS_DENIED',
            message: `You are not authorized to download the LGE2026 Package for ${wardInfo.province_name}.`,
            userProvince: userProvinceCode,
            requestedProvince: wardInfo.province_code,
          },
        });
      }
    }

    // Load all members for this ward (active and inactive) — same source used by views.ts export
    const result = await ViewsService.getMembersWithVotingDistricts({
      ward_code,
      include_all_members: true,
      limit: '10000',
    });
    const members: any[] = result.members || [];

    if (members.length === 0) {
      throw new NotFoundError(`No members found for ward ${ward_code}`);
    }

    // Per-VD breakdown for this ward — includes VDs with zero members via LEFT JOIN
    const vdBreakdown: any[] = await executeQuery(
      `SELECT
         vd.voting_district_code,
         vd.voting_district_name,
         COUNT(m.member_id)::int AS member_count,
         COUNT(m.member_id) FILTER (WHERE m.membership_status_id = 1)::int AS active_members,
         COUNT(m.member_id) FILTER (WHERE m.membership_status_id = 3)::int AS expired_members,
         COUNT(m.member_id) FILTER (WHERE m.voting_district_code IN ('22222222','222222222'))::int AS different_ward_members
       FROM voting_districts vd
       LEFT JOIN members_consolidated m
         ON m.voting_district_code = vd.voting_district_code
       WHERE vd.ward_code = $1
         AND vd.is_active = TRUE
       GROUP BY vd.voting_district_code, vd.voting_district_name
       ORDER BY member_count DESC, vd.voting_district_code ASC`,
      [ward_code]
    );

    // Filter members for the Attendance Register: Active + Registered voters
    const attendanceMembers = members.filter((m: any) => m.membership_status_id === 1 && m.voter_status_id === 1);

    const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(wardInfo, attendanceMembers);

    // Generate the PDF Attendance Register from the same Active + Registered members
    const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, attendanceMembers);

    // Build the Membership Spreadsheet
    const spreadsheetBuffer = await buildLGE2026MembershipSpreadsheet(wardInfo, members, vdBreakdown);

    // Bundle into a ZIP (streamed to a buffer)
    const timestamp = new Date().toISOString().split('T')[0];
    const wardLabel = wardInfo.ward_number ? `Ward_${wardInfo.ward_number}` : `Ward_${ward_code}`;
    const attendanceFilename = `${wardLabel}_Attendance_Register_${timestamp}.docx`;
    const attendancePdfFilename = `${wardLabel}_Attendance_Register_${timestamp}.pdf`;
    const spreadsheetFilename = `${wardLabel}_Membership_Spreadsheet_${timestamp}.xlsx`;
    const zipFilename = `LGE2026_Package_${wardLabel}_${timestamp}.zip`;

    const zipBuffer: Buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const passthrough = new PassThrough();
      passthrough.on('data', (c: Buffer) => chunks.push(c));
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(passthrough);
      archive.append(wordBuffer, { name: attendanceFilename });
      archive.append(pdfBuffer, { name: attendancePdfFilename });
      archive.append(spreadsheetBuffer, { name: spreadsheetFilename });
      archive.finalize().catch(reject);
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    return res.send(zipBuffer);
  })
);

export default router;
