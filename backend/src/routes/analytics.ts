import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsModel, ReportFilters } from '../models/analytics';
import { AnalyticsOptimizedModel } from '../models/analyticsOptimized';
import { authenticate, requirePermission, requireAdminLevel, applyGeographicFilter } from '../middleware/auth';
import { ValidationError, asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { cacheMiddleware, CacheConfigs } from '../middleware/cacheMiddleware';
import { PDFExportService } from '../services/pdfExportService';
import { HtmlPdfService } from '../services/htmlPdfService';
import Joi from 'joi';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const router = Router();

// Custom cache key generator for analytics that includes geographic context
const analyticsKeyGenerator = (req: Request): string => {
  const baseKey = req.originalUrl || req.url;
  const queryString = Object.keys(req.query).length > 0
    ? `?${new URLSearchParams(req.query as any).toString()}`
    : '';

  // Include user's geographic context in cache key
  const user = (req as any).user;
  let geoContext = '';

  if (user) {
    if (user.admin_level === 'municipality' && user.municipal_code) {
      geoContext = `:mun:${user.municipal_code}`;
    } else if (user.admin_level === 'province' && user.province_code) {
      geoContext = `:prov:${user.province_code}`;
    } else if (user.admin_level === 'national') {
      geoContext = ':nat';
    }
  }

  return `${baseKey}${queryString}${geoContext}`;
};

// Analytics cache configuration with geographic context
const AnalyticsCacheConfig = {
  ...CacheConfigs.ANALYTICS,
  keyGenerator: analyticsKeyGenerator
};

// Validation schemas
const reportFiltersSchema = Joi.object({
  hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward', 'Branch').optional(),
  entity_id: Joi.number().integer().positive().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
  member_status: Joi.string().valid('Active', 'Inactive', 'Pending', 'Suspended').optional(),
  meeting_status: Joi.string().valid('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed').optional(),
  election_status: Joi.string().valid('Planned', 'Nominations Open', 'Nominations Closed', 'Voting Open', 'Voting Closed', 'Completed', 'Cancelled').optional(),
  appointment_status: Joi.string().valid('Active', 'Inactive', 'Completed', 'Terminated').optional(),
  timeRange: Joi.string().valid('7d', '30d', '90d', '1y').optional(),
  province_code: Joi.string().min(2).max(3).optional(),
  district_code: Joi.string().min(2).max(10).optional(),
  municipal_code: Joi.string().min(2).max(10).optional(),
  municipality_code: Joi.string().min(2).max(10).optional(), // Accept both naming conventions
  ward_code: Joi.string().min(2).max(20).optional()
});

// Get dashboard statistics
router.get('/dashboard',
  authenticate,
  requirePermission('analytics.read'),
  applyGeographicFilter,
  cacheMiddleware(AnalyticsCacheConfig),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = reportFiltersSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: ReportFilters = value || {};

      // Normalize municipality_code to municipal_code for consistency
      if ((filters as any).municipality_code && !filters.municipal_code) {
        filters.municipal_code = (filters as any).municipality_code;
        delete (filters as any).municipality_code;
      }

      // Apply geographic filtering for provincial and municipality admins
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      if (geographicContext?.province_code) {
        filters.province_code = geographicContext.province_code;
      }
      if (geographicContext?.municipal_code) {
        filters.municipal_code = geographicContext.municipal_code;
      }

      // Use optimized model for faster dashboard stats
      const dashboardStats = await AnalyticsOptimizedModel.getDashboardStats(filters);

      // Skip audit logging for now (no authentication)
      // await logAudit(
      //   req.user!.id,
      //   AuditAction.READ,
      //   EntityType.SYSTEM,
      //   undefined,
      //   undefined,
      //   {
      //     action: 'view_dashboard_analytics',
      //     filters
      //   },
      //   req
      // );

      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          statistics: dashboardStats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

// Get membership analytics
router.get('/membership',
  authenticate,
  requirePermission('analytics.read'),
  applyGeographicFilter,
  cacheMiddleware(AnalyticsCacheConfig),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = reportFiltersSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: ReportFilters = value || {};

      // Normalize municipality_code to municipal_code for consistency
      if ((filters as any).municipality_code && !filters.municipal_code) {
        filters.municipal_code = (filters as any).municipality_code;
        delete (filters as any).municipality_code;
      }

      // Apply geographic filtering for provincial and municipality admins
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      if (geographicContext?.province_code) {
        filters.province_code = geographicContext.province_code;
      }
      if (geographicContext?.municipal_code) {
        filters.municipal_code = geographicContext.municipal_code;
      }

      // Use optimized model with materialized views for faster performance
      const membershipAnalytics = await AnalyticsOptimizedModel.getMembershipAnalytics(filters);

      // Log audit trail (skip if no user - development mode)
      if (req.user?.id) {
        await logAudit(
          req.user.id,
          AuditAction.READ,
          EntityType.SYSTEM,
          undefined,
          undefined,
          {
            action: 'view_membership_analytics',
            filters
          },
          req
        );
      }

      res.json({
        success: true,
        message: 'Membership analytics retrieved successfully',
        data: {
          analytics: membershipAnalytics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

// Get business intelligence insights
router.get('/business-intelligence', cacheMiddleware(AnalyticsCacheConfig), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: ReportFilters = value || {};

    // Normalize municipality_code to municipal_code for consistency
    if ((filters as any).municipality_code && !filters.municipal_code) {
      filters.municipal_code = (filters as any).municipality_code;
      delete (filters as any).municipality_code;
    }

    // Use new BusinessIntelligenceService for real data-driven insights
    const { BusinessIntelligenceService } = await import('../services/businessIntelligenceService');
    const businessIntelligence = await BusinessIntelligenceService.getFullDashboardData({
      province_code: filters.province_code,
      municipal_code: filters.municipal_code,
      timeRange: filters.timeRange,
    });

    // Log audit trail
    if (req.user?.id) {
      await logAudit(
        req.user.id,
        AuditAction.READ,
        EntityType.SYSTEM,
        undefined,
        undefined,
        {
          action: 'view_business_intelligence',
          filters
        },
        req
      );
    }

    res.json({
      success: true,
      message: 'Business intelligence insights retrieved successfully',
      data: {
        businessIntelligence
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get meeting analytics
router.get('/meetings',
  authenticate,
  requirePermission('analytics.read'),
  applyGeographicFilter,
  cacheMiddleware(AnalyticsCacheConfig),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = reportFiltersSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: ReportFilters = value || {};

      // Normalize municipality_code to municipal_code for consistency
      if ((filters as any).municipality_code && !filters.municipal_code) {
        filters.municipal_code = (filters as any).municipality_code;
        delete (filters as any).municipality_code;
      }

      // Apply geographic filtering for provincial and municipality admins
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      if (geographicContext?.province_code) {
        filters.province_code = geographicContext.province_code;
      }
      if (geographicContext?.municipal_code) {
        filters.municipal_code = geographicContext.municipal_code;
      }

      const meetingAnalytics = await AnalyticsModel.getMeetingAnalytics(filters);

      // Skip audit logging for now (no authentication)
      // await logAudit(
      //   req.user!.id,
      //   AuditAction.READ,
      //   EntityType.SYSTEM,
      //   undefined,
      //   undefined,
      //   {
      //     action: 'view_meeting_analytics',
      //     filters
      //   },
      //   req
      // );

      res.json({
        success: true,
        message: 'Meeting analytics retrieved successfully',
        data: {
          analytics: meetingAnalytics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

// Get leadership analytics
router.get('/leadership',
  authenticate,
  requirePermission('analytics.read'),
  applyGeographicFilter,
  cacheMiddleware(AnalyticsCacheConfig),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = reportFiltersSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const filters: ReportFilters = value || {};

      // Normalize municipality_code to municipal_code for consistency
      if ((filters as any).municipality_code && !filters.municipal_code) {
        filters.municipal_code = (filters as any).municipality_code;
        delete (filters as any).municipality_code;
      }

      // Apply geographic filtering for provincial and municipality admins
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      if (geographicContext?.province_code) {
        filters.province_code = geographicContext.province_code;
      }
      if (geographicContext?.municipal_code) {
        filters.municipal_code = geographicContext.municipal_code;
      }

      const leadershipAnalytics = await AnalyticsModel.getLeadershipAnalytics(filters);

      // Skip audit logging for now (no authentication)
      // await logAudit(
      //   req.user!.id,
      //   AuditAction.READ,
      //   EntityType.SYSTEM,
      //   undefined,
      //   undefined,
      //   {
      //     action: 'view_leadership_analytics',
      //     filters
      //   },
      //   req
      // );

      res.json({
        success: true,
        message: 'Leadership analytics retrieved successfully',
        data: {
          analytics: leadershipAnalytics
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

// Export membership report to Excel
router.get('/export/membership/excel', authenticate, requirePermission('reports.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: ReportFilters = value || {};

    // Normalize municipality_code to municipal_code for consistency
    if ((filters as any).municipality_code && !filters.municipal_code) {
      filters.municipal_code = (filters as any).municipality_code;
      delete (filters as any).municipality_code;
    }

    const membershipAnalytics = await AnalyticsOptimizedModel.getMembershipAnalytics(filters);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Members', membershipAnalytics.total_members],
      ['Active Members', membershipAnalytics.active_members],
      ['Inactive Members', membershipAnalytics.inactive_members],
      ['Pending Members', membershipAnalytics.pending_members]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Membership by hierarchy sheet
    if (membershipAnalytics.membership_by_hierarchy.length > 0) {
      const hierarchyData = [
        ['Hierarchy Level', 'Member Count', 'Percentage'],
        ...membershipAnalytics.membership_by_hierarchy.map(item => [
          item.hierarchy_level,
          item.member_count,
          item.percentage
        ])
      ];
      const hierarchySheet = XLSX.utils.aoa_to_sheet(hierarchyData);
      XLSX.utils.book_append_sheet(workbook, hierarchySheet, 'By Hierarchy');
    }

    // Membership by status sheet
    if (membershipAnalytics.membership_by_status.length > 0) {
      const statusData = [
        ['Status', 'Member Count', 'Percentage'],
        ...membershipAnalytics.membership_by_status.map(item => [
          item.membership_status,
          item.member_count,
          item.percentage
        ])
      ];
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'By Status');
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Log export
    await logAudit(
      req.user!.id,
      AuditAction.READ,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'export_membership_report',
        format: 'excel',
        filters
      },
      req
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=membership-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

// Get strategic insights data
router.get('/strategic-insights',
  cacheMiddleware(CacheConfigs.ANALYTICS),
  asyncHandler(async (_req, res) => {
    const strategicInsights = await AnalyticsModel.getStrategicInsights();

    sendSuccess(res, strategicInsights, 'Strategic insights retrieved successfully');
  })
);

// Export membership report to PDF
router.get('/export/membership/pdf', authenticate, requirePermission('reports.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: ReportFilters = value || {};

    // Normalize municipality_code to municipal_code for consistency
    if ((filters as any).municipality_code && !filters.municipal_code) {
      filters.municipal_code = (filters as any).municipality_code;
      delete (filters as any).municipality_code;
    }

    const membershipAnalytics = await AnalyticsOptimizedModel.getMembershipAnalytics(filters);

    // Create PDF document
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=membership-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfBuffer);
    });

    // Add content to PDF
    doc.fontSize(20).text('Membership Analytics Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Summary section
    doc.fontSize(16).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Members: ${membershipAnalytics.total_members}`);
    doc.text(`Active Members: ${membershipAnalytics.active_members}`);
    doc.text(`Inactive Members: ${membershipAnalytics.inactive_members}`);
    doc.text(`Pending Members: ${membershipAnalytics.pending_members}`);
    doc.moveDown();

    // Membership by hierarchy
    if (membershipAnalytics.membership_by_hierarchy.length > 0) {
      doc.fontSize(16).text('Membership by Hierarchy', { underline: true });
      doc.fontSize(12);
      membershipAnalytics.membership_by_hierarchy.forEach(item => {
        doc.text(`${item.hierarchy_level}: ${item.member_count} (${item.percentage}%)`);
      });
      doc.moveDown();
    }

    // Membership by status
    if (membershipAnalytics.membership_by_status.length > 0) {
      doc.fontSize(16).text('Membership by Status', { underline: true });
      doc.fontSize(12);
      membershipAnalytics.membership_by_status.forEach(item => {
        doc.text(`${item.membership_status}: ${item.member_count} (${item.percentage}%)`);
      });
    }

    doc.end();

    // Log export
    await logAudit(
      req.user!.id,
      AuditAction.READ,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'export_membership_report',
        format: 'pdf',
        filters
      },
      req
    );
  } catch (error) {
    next(error);
  }
});

// Get comprehensive analytics report
router.get('/comprehensive', cacheMiddleware({
  ...CacheConfigs.ANALYTICS,
  ttl: 7200 // 2 hours for comprehensive report
}), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: ReportFilters = value || {};

    // Normalize municipality_code to municipal_code for consistency
    if ((filters as any).municipality_code && !filters.municipal_code) {
      filters.municipal_code = (filters as any).municipality_code;
      delete (filters as any).municipality_code;
    }

    // Get all analytics data - using optimized models
    const [dashboardStats, membershipAnalytics, meetingAnalytics, leadershipAnalytics] = await Promise.all([
      AnalyticsOptimizedModel.getDashboardStats(filters),
      AnalyticsOptimizedModel.getMembershipAnalytics(filters),
      AnalyticsModel.getMeetingAnalytics(filters),
      AnalyticsModel.getLeadershipAnalytics(filters)
    ]);

    // Skip audit logging for now (no authentication)
    // await logAudit(
    //   req.user!.id,
    //   AuditAction.READ,
    //   EntityType.SYSTEM,
    //   undefined,
    //   undefined,
    //   {
    //     action: 'view_comprehensive_analytics',
    //     filters
    //   },
    //   req
    // );

    res.json({
      success: true,
      message: 'Comprehensive analytics retrieved successfully',
      data: {
        dashboard: dashboardStats,
        membership: membershipAnalytics,
        meetings: meetingAnalytics,
        leadership: leadershipAnalytics,
        generated_at: new Date().toISOString(),
        filters: filters
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export comprehensive analytics to PDF (landscape format)
router.get('/export/comprehensive/pdf', authenticate, requirePermission('reports.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reportFiltersSchema.validate(req.query);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: ReportFilters = value || {};

    // Normalize municipality_code to municipal_code for consistency
    if ((filters as any).municipality_code && !filters.municipal_code) {
      filters.municipal_code = (filters as any).municipality_code;
      delete (filters as any).municipality_code;
    }

    // Get comprehensive analytics data - using optimized models
    const [dashboardStats, membershipAnalytics, meetingAnalytics, leadershipAnalytics] = await Promise.all([
      AnalyticsOptimizedModel.getDashboardStats(filters),
      AnalyticsOptimizedModel.getMembershipAnalytics(filters),
      AnalyticsModel.getMeetingAnalytics(filters),
      AnalyticsModel.getLeadershipAnalytics(filters)
    ]);

    const comprehensiveData = {
      dashboard: dashboardStats,
      membership: membershipAnalytics,
      meetings: meetingAnalytics,
      leadership: leadershipAnalytics,
      generated_at: new Date().toISOString(),
      filters: filters
    };

    // Generate PDF using HTML-based PDF Service for better visual output
    const pdfBuffer = await HtmlPdfService.generateComprehensiveAnalyticsPDF(comprehensiveData, {
      title: 'Comprehensive Analytics Report',
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      orientation: 'landscape',
      reportScope: filters.hierarchy_level ? `${filters.hierarchy_level} Level` : 'National Level'
    });

    // Set response headers for PDF download
    const filename = `comprehensive-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Log audit trail
    await logAudit(
      req.user!.id,
      AuditAction.EXPORT,
      EntityType.SYSTEM,
      undefined,
      undefined,
      {
        action: 'export_comprehensive_analytics_pdf',
        filters,
        filename
      },
      req
    );

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
