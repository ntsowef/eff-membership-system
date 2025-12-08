import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { authenticate, requirePermission } from '../middleware/auth';
import { ExcelReportService } from '../services/excelReportService';
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

export default router;

