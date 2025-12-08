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

    // Get all analytics data using optimized models
    const [membershipAnalytics, dashboardStats] = await Promise.all([
      AnalyticsOptimizedModel.getMembershipAnalytics(filters),
      AnalyticsOptimizedModel.getDashboardStats(filters)
    ]);

    // Helper functions for BI calculations
    const calculateGrowthTrend = (growthData: any[]): string => {
      if (!growthData || growthData.length < 2) return 'stagnant';

      const recent = growthData.slice(-3);
      const growthRates = recent.map((item, index) => {
        if (index === 0) return 0;
        return ((item.new_members - recent[index - 1].new_members) / recent[index - 1].new_members) * 100;
      }).filter(rate => !isNaN(rate));

      const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

      if (avgGrowthRate > 10) return 'accelerating';
      if (avgGrowthRate > 0) return 'steady';
      if (avgGrowthRate > -5) return 'declining';
      return 'stagnant';
    };

    const calculateChurnRisk = (analytics: any): number => {
      const totalMembers = analytics.total_members;
      const inactiveMembers = analytics.inactive_members;

      if (totalMembers === 0) return 0;
      return Math.min((inactiveMembers / totalMembers) * 100, 100);
    };

    const calculateEngagementScore = (stats: any): number => {
      const activeMembers = stats.active_members || 0;
      const totalMembers = stats.total_members || 1;
      return Math.round((activeMembers / totalMembers) * 100);
    };

    // Generate business intelligence insights
    const businessIntelligence = {
      membershipInsights: {
        growthTrend: calculateGrowthTrend((membershipAnalytics as any).membership_growth || []),
        churnRisk: calculateChurnRisk(membershipAnalytics),
        engagementScore: calculateEngagementScore(dashboardStats),
        demographicShifts: [
          {
            type: 'age',
            trend: 'aging',
            impact: 'high',
            description: 'Low youth participation - aging membership base'
          }
        ],
        geographicExpansion: [
          {
            area: 'Gauteng',
            type: 'expansion',
            potential: 'high',
            currentMembers: membershipAnalytics.geographic_performance?.top_provinces?.find((p: any) => p.province_name === 'Gauteng')?.member_count || 0,
            targetMembers: 5000,
            description: 'High potential for expansion in Gauteng province'
          }
        ],
        seasonalPatterns: [
          {
            period: 'Q1',
            trend: 'steady',
            averageGrowth: 5.2,
            description: 'Steady growth in first quarter'
          }
        ]
      },
      predictiveAnalytics: {
        membershipForecast: (() => {
          const forecast: any[] = [];
          const membershipGrowth = (membershipAnalytics as any).membership_growth || [];
          const lastMonth = membershipGrowth[membershipGrowth.length - 1];
          const avgGrowth = 500;

          for (let i = 1; i <= 6; i++) {
            forecast.push({
              month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
              predicted_members: (lastMonth?.total_members || 0) + (avgGrowth * i),
              confidence: Math.max(95 - (i * 5), 70),
              lower_bound: (lastMonth?.total_members || 0) + (avgGrowth * i * 0.8),
              upper_bound: (lastMonth?.total_members || 0) + (avgGrowth * i * 1.2)
            });
          }
          return forecast;
        })(),
        churnPrediction: [
          {
            segment: 'Inactive Members',
            churnProbability: 75,
            timeframe: '3 months',
            affectedMembers: membershipAnalytics.inactive_members || 0
          }
        ],
        growthOpportunities: [
          {
            segment: 'Youth (18-24)',
            potential: 5000,
            currentSize: membershipAnalytics.age_distribution?.find((group: any) => group.age_group === '18-24')?.member_count || 0,
            growthRate: 25,
            strategy: 'Digital engagement and campus outreach'
          }
        ],
        resourceNeeds: [
          {
            resource: 'Staff',
            currentNeed: 10,
            predictedNeed: 15,
            timeframe: '6 months',
            justification: 'Growing membership requires additional support staff'
          }
        ]
      },
      performanceMetrics: {
        kpis: [
          {
            name: 'Member Growth Rate',
            value: 12.5,
            target: 15,
            unit: '%',
            trend: 'up',
            status: 'warning'
          },
          {
            name: 'Engagement Rate',
            value: calculateEngagementScore(dashboardStats),
            target: 85,
            unit: '%',
            trend: 'up',
            status: 'success'
          },
          {
            name: 'Geographic Coverage',
            value: 3,
            target: 9,
            unit: 'provinces',
            trend: 'stable',
            status: 'error'
          }
        ],
        benchmarks: [
          {
            metric: 'Member Growth Rate',
            industry: 15,
            peers: 12,
            current: 12.5
          }
        ],
        targets: [
          {
            name: '50K Members',
            current: membershipAnalytics.total_members,
            target: 50000,
            deadline: '2025-12-31',
            progress: (membershipAnalytics.total_members / 50000) * 100
          }
        ],
        achievements: [
          {
            title: 'Gender Balance Achieved',
            description: 'Maintained near-perfect gender balance',
            date: new Date().toISOString(),
            impact: 'high'
          }
        ]
      },
      riskAnalysis: {
        riskLevel: (() => {
          const youthPercentage = membershipAnalytics.age_distribution?.find((group: any) => group.age_group === '18-24')?.percentage || '0';
          if (parseFloat(youthPercentage.toString()) < 5) return 'high';
          if (parseFloat(youthPercentage.toString()) < 10) return 'medium';
          return 'low';
        })(),
        riskFactors: [
          {
            factor: 'Low Youth Engagement',
            severity: 'high',
            probability: 85,
            impact: 'Future membership sustainability at risk'
          },
          {
            factor: 'Geographic Concentration',
            severity: 'medium',
            probability: 70,
            impact: 'Over-reliance on Free State province'
          }
        ],
        mitigationStrategies: [
          {
            risk: 'Low Youth Engagement',
            strategy: 'Launch digital-first youth recruitment campaign',
            timeline: '3 months',
            resources: 'Marketing team, social media budget',
            expectedImpact: 'Increase youth membership by 500%'
          }
        ]
      },
      recommendations: [
        {
          id: '1',
          type: 'growth',
          priority: 'high',
          title: 'Launch Youth Recruitment Campaign',
          description: 'Implement targeted digital marketing to attract 18-24 age group',
          impact: 'Could increase youth membership by 500%',
          effort: 'Medium - requires marketing budget and social media strategy',
          timeline: '3-6 months',
          metrics: ['Youth membership count', 'Digital engagement rate', 'Campus partnerships']
        },
        {
          id: '2',
          type: 'expansion',
          priority: 'high',
          title: 'Expand to Gauteng Province',
          description: 'Establish presence in Johannesburg and Pretoria metropolitan areas',
          impact: 'Potential to add 5,000+ members and reduce geographic risk',
          effort: 'High - requires local partnerships and field operations',
          timeline: '6-12 months',
          metrics: ['Gauteng membership', 'Geographic distribution', 'Urban penetration']
        },
        {
          id: '3',
          type: 'retention',
          priority: 'medium',
          title: 'Implement Member Engagement Program',
          description: 'Create regular touchpoints and value-added services for existing members',
          impact: 'Reduce churn risk and increase member satisfaction',
          effort: 'Medium - requires program design and execution',
          timeline: '2-4 months',
          metrics: ['Member satisfaction', 'Engagement rate', 'Retention rate']
        }
      ],
      realTimeMetrics: {
        activeUsers: dashboardStats.active_members || 0,
        newRegistrations: ((membershipAnalytics as any).membership_growth || [])[(membershipAnalytics as any).membership_growth?.length - 1]?.new_members || 0,
        engagementRate: calculateEngagementScore(dashboardStats),
        systemHealth: 98.5,
        lastUpdated: new Date().toISOString()
      }
    };

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
