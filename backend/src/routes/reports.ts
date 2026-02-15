import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { authenticate, requirePermission } from '../middleware/auth';
import { ExcelReportService } from '../services/excelReportService';
import { VoterRegistrationReportService } from '../services/voterRegistrationReportService';
import { PDFExportService } from '../services/pdfExportService';
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
 * Generate expired members report
 */
router.get('/expired-members',
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
      const excelBuffer = await ExcelReportService.generateExpiredMembersReport({
        province_code: province_code as string
      });

      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="expired-members-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);

      return res.send(excelBuffer);
    } else {
      return res.status(501).json({
        success: false,
        message: 'PDF format for expired members report is not yet implemented',
        data: {
          format: format,
          note: 'Excel export is available. PDF format will be available in a future update.'
        }
      });
    }
  })
);

/**
 * GET /api/v1/reports/expiring-members
 * Generate expiring members report (expiry_date >= 2026-10-01)
 */
router.get('/expiring-members',
  authenticate,
  requirePermission('reports.read'),
  validate({
    query: Joi.object({
      province_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      format: Joi.string().valid('csv', 'excel').default('excel')
    })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { province_code, municipality_code, format = 'excel' } = req.query;

    const reportBuffer = await ExcelReportService.generateExpiringMembersReport(
      {
        province_code: province_code as string,
        municipality_code: municipality_code as string
      },
      format as 'csv' | 'excel'
    );

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expiring-members-${dateStr}.csv"`);
      res.setHeader('Content-Length', reportBuffer.length);
      return res.send(reportBuffer);
    }

    // Excel format (default)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="expiring-members-${dateStr}.xlsx"`);
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

export default router;
