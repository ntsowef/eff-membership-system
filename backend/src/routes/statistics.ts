import { Router } from 'express';
import { StatisticsModel } from '../models/statistics';
import { executeQuery, executeQuerySingle } from '../config/database';
import { asyncHandler, sendSuccess, createDatabaseError } from '../middleware/errorHandler';
import { validate, commonSchemas } from '../middleware/validation';
import { cacheMiddleware, CacheConfigs } from '../middleware/cacheMiddleware';
import { authenticate, requirePermission, applyProvinceFilter, applyGeographicFilter, logProvinceAccess } from '../middleware/auth';
import { PDFExportService } from '../services/pdfExportService';
import Joi from 'joi';

const router = Router();

// Root statistics endpoint - provides overview of available endpoints
router.get('/', asyncHandler(async (_req, res) => {
  const endpoints = {
    ward_membership: '/api/v1/statistics/ward-membership',
    demographics: '/api/v1/statistics/demographics',
    demographics_by_area: {
      ward: '/api/v1/statistics/demographics/ward/:wardCode',
      municipality: '/api/v1/statistics/demographics/municipality/:municipalityCode',
      district: '/api/v1/statistics/demographics/district/:districtCode',
      province: '/api/v1/statistics/demographics/province/:provinceCode'
    },
    membership_trends: '/api/v1/statistics/membership-trends',
    system: '/api/v1/statistics/system',
    dashboard: '/api/v1/statistics/dashboard',
    compare: '/api/v1/statistics/compare',
    export: '/api/v1/statistics/export'
  };

  sendSuccess(res, {
    message: 'Statistics & Analytics API',
    description: 'Access comprehensive statistics, demographics, and analytics for membership data',
    endpoints
  }, 'Statistics API endpoints listed successfully');
}));

// Alias for singular form
router.get('/statistic', asyncHandler(async (_req, res) => {
  const endpoints = {
    ward_membership: '/api/v1/statistics/ward-membership',
    demographics: '/api/v1/statistics/demographics',
    demographics_by_area: {
      ward: '/api/v1/statistics/demographics/ward/:wardCode',
      municipality: '/api/v1/statistics/demographics/municipality/:municipalityCode',
      district: '/api/v1/statistics/demographics/district/:districtCode',
      province: '/api/v1/statistics/demographics/province/:provinceCode'
    },
    membership_trends: '/api/v1/statistics/membership-trends',
    system: '/api/v1/statistics/system',
    dashboard: '/api/v1/statistics/dashboard',
    compare: '/api/v1/statistics/compare',
    export: '/api/v1/statistics/export'
  };

  sendSuccess(res, {
    message: 'Statistics & Analytics API',
    description: 'Access comprehensive statistics, demographics, and analytics for membership data',
    endpoints
  }, 'Statistics API endpoints listed successfully');
}));

// Get ward membership statistics
router.get('/ward-membership',
  cacheMiddleware(CacheConfigs.STATISTICS),
  validate({
    query: Joi.object({
      ward_code: Joi.string().min(5).max(15).optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { ward_code } = req.query;
    const stats = await StatisticsModel.getWardMembershipStats(ward_code as string);
    
    sendSuccess(res, {
      statistics: stats,
      count: stats.length,
      ward_code: ward_code || 'all'
    }, 'Ward membership statistics retrieved successfully');
  })
);

// Get demographic breakdown
router.get('/demographics',
  cacheMiddleware(CacheConfigs.STATISTICS),
  validate({
    query: Joi.object({
      ward_code: Joi.string().min(5).max(15).optional(),
      municipality_code: Joi.string().min(3).max(10).optional(),
      district_code: Joi.string().min(3).max(10).optional(),
      province_code: Joi.string().min(2).max(3).optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { ward_code, municipality_code, district_code, province_code } = req.query;
    
    const filters = {
      ward_code: ward_code as string,
      municipality_code: municipality_code as string,
      district_code: district_code as string,
      province_code: province_code as string
    };

    const demographics = await StatisticsModel.getDemographicBreakdown(filters);
    
    sendSuccess(res, {
      demographics,
      filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    }, 'Demographic breakdown retrieved successfully');
  })
);

// Get demographics for specific ward
router.get('/demographics/ward/:wardCode',
  validate({ params: commonSchemas.wardCode }),
  asyncHandler(async (req, res) => {
    const { wardCode } = req.params;
    const demographics = await StatisticsModel.getDemographicBreakdown({ ward_code: wardCode });
    
    sendSuccess(res, {
      demographics,
      ward_code: wardCode
    }, `Demographics for ward ${wardCode} retrieved successfully`);
  })
);

// Get demographics for specific municipality
router.get('/demographics/municipality/:municipalityCode',
  validate({ params: commonSchemas.municipalityCode }),
  asyncHandler(async (req, res) => {
    const { municipalityCode } = req.params;
    const demographics = await StatisticsModel.getDemographicBreakdown({ municipality_code: municipalityCode });
    
    sendSuccess(res, {
      demographics,
      municipality_code: municipalityCode
    }, `Demographics for municipality ${municipalityCode} retrieved successfully`);
  })
);

// Get demographics for specific district
router.get('/demographics/district/:districtCode',
  validate({ params: commonSchemas.districtCode }),
  asyncHandler(async (req, res) => {
    const { districtCode } = req.params;
    const demographics = await StatisticsModel.getDemographicBreakdown({ district_code: districtCode });
    
    sendSuccess(res, {
      demographics,
      district_code: districtCode
    }, `Demographics for district ${districtCode} retrieved successfully`);
  })
);

// Get demographics for specific province
router.get('/demographics/province/:provinceCode',
  validate({ params: commonSchemas.provinceCode }),
  asyncHandler(async (req, res) => {
    const { provinceCode } = req.params;
    const demographics = await StatisticsModel.getDemographicBreakdown({ province_code: provinceCode });

    sendSuccess(res, {
      demographics,
      province_code: provinceCode
    }, `Demographics for province ${provinceCode} retrieved successfully`);
  })
);

// Generate Demographics Report PDF
router.get('/demographics/report/pdf',
  validate({
    query: Joi.object({
      ward_code: Joi.string().min(5).max(15).optional(),
      municipality_code: Joi.string().min(3).max(10).optional(),
      district_code: Joi.string().min(3).max(10).optional(),
      province_code: Joi.string().min(2).max(3).optional(),
      title: Joi.string().max(100).optional(),
      include_charts: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      ward_code,
      municipality_code,
      district_code,
      province_code,
      title,
      include_charts
    } = req.query;

    const filters = {
      ward_code: ward_code as string,
      municipality_code: municipality_code as string,
      district_code: district_code as string,
      province_code: province_code as string
    };

    // Get demographics data
    const demographics = await StatisticsModel.getDemographicBreakdown(filters);

    // Determine report title and scope
    let reportTitle = title as string || 'Demographics Report';
    let reportScope = 'National';

    if (ward_code) {
      reportScope = `Ward ${ward_code}`;
    } else if (municipality_code) {
      reportScope = `Municipality ${municipality_code}`;
    } else if (district_code) {
      reportScope = `District ${district_code}`;
    } else if (province_code) {
      reportScope = `Province ${province_code}`;
    }

    // Generate PDF
    const pdfBuffer = await PDFExportService.exportDemographicsReportToPDF(demographics, {
      title: `${reportTitle} - ${reportScope}`,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      orientation: 'portrait',
      includeCharts: include_charts !== 'false',
      filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="demographics-report-${reportScope.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  })
);

// Get member counts by province
router.get('/province-membership',
  asyncHandler(async (_req, res) => {
    const provinceMembership = await StatisticsModel.getProvinceMembershipStats();

    sendSuccess(res, {
      statistics: provinceMembership,
      count: provinceMembership.length
    }, 'Province membership statistics retrieved successfully');
  })
);

// Get membership trends
router.get('/membership-trends',
  cacheMiddleware(CacheConfigs.STATISTICS),
  validate({
    query: Joi.object({
      months: Joi.number().integer().min(1).max(24).default(12)
    })
  }),
  asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;
    const trends = await StatisticsModel.getMembershipTrends(parseInt(months as string));
    
    sendSuccess(res, {
      trends,
      period_months: parseInt(months as string)
    }, 'Membership trends retrieved successfully');
  })
);

// Get overall system statistics
router.get('/system',
  cacheMiddleware(CacheConfigs.STATISTICS),
  asyncHandler(async (_req, res) => {
    const systemStats = await StatisticsModel.getSystemStatistics();

    sendSuccess(res, systemStats, 'System statistics retrieved successfully');
  })
);

// Get expired members statistics with geographic filtering
router.get('/expired-members',
  authenticate,
  requirePermission('statistics.read'),
  applyGeographicFilter,
  asyncHandler(async (req, res) => {
    // Get geographic context from middleware
    const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
    const provinceCode = geographicContext?.province_code;
    const municipalCode = geographicContext?.municipal_code;

    // Log access for audit
    if (municipalCode) {
      console.log(`🔒 Loading expired members data for municipality: ${municipalCode}`);
    } else if (provinceCode) {
      await logProvinceAccess(req, 'expired_members_stats', provinceCode);
    }

    try {
      let expiredMembersData: any;

      if (municipalCode) {
        // Municipality admin - get municipality-specific expired members data
        const municipalityExpiredQuery = `
          SELECT
            m.municipality_code,
            mu.municipality_name,
            CAST(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) AS INTEGER) as expired_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS INTEGER) as expiring_soon_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) AS INTEGER) as expiring_urgent_count,
            CAST(COUNT(m.member_id) AS INTEGER) as total_members
          FROM members_consolidated m
          JOIN municipalities mu ON m.municipality_code = mu.municipality_code
          WHERE m.municipality_code = $1
          GROUP BY m.municipality_code, mu.municipality_name
        `;

        const [municipalityData] = await executeQuery(municipalityExpiredQuery, [municipalCode]);

        // Get ward breakdown within the municipality
        const wardBreakdownQuery = `
          SELECT
            w.ward_code,
            w.ward_name,
            CAST(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) AS INTEGER) as expired_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS INTEGER) as expiring_soon_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) AS INTEGER) as expiring_urgent_count,
            CAST(COUNT(m.member_id) AS INTEGER) as total_members,
            ROUND(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) * 100.0 / NULLIF(COUNT(m.member_id), 0), 2) as expired_percentage
          FROM wards w
          LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
          WHERE w.municipality_code = $1
          GROUP BY w.ward_code, w.ward_name
          ORDER BY expired_count DESC
        `;

        const wardBreakdown = await executeQuery(wardBreakdownQuery, [municipalCode]);

        expiredMembersData = {
          national_summary: {
            total_expired: Number(municipalityData?.expired_count || 0),
            total_expiring_soon: Number(municipalityData?.expiring_soon_count || 0),
            total_expiring_urgent: Number(municipalityData?.expiring_urgent_count || 0),
            total_members: Number(municipalityData?.total_members || 0)
          },
          province_breakdown: [], // Empty for municipality admin
          municipality_breakdown: municipalityData ? [municipalityData] : [],
          ward_breakdown: wardBreakdown, // Add ward breakdown for Municipality Admin
          filtered_by_municipality: true,
          municipality_code: municipalCode
        };

      } else if (provinceCode) {
        // Provincial admin - get province-specific expired members data
        const provinceExpiredQuery = `
          SELECT
            p.province_code,
            p.province_name,
            CAST(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) AS INTEGER) as expired_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS INTEGER) as expiring_soon_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) AS INTEGER) as expiring_urgent_count,
            CAST(COUNT(m.member_id) AS INTEGER) as total_members
          FROM members_consolidated m
          JOIN provinces p ON m.province_code = p.province_code
          WHERE m.province_code = $1
          GROUP BY p.province_code, p.province_name
        `;

        const [provinceData] = await executeQuery(provinceExpiredQuery, [provinceCode]);

        // Get sub-regional breakdown (municipalities) within the province
        const subregionalBreakdownQuery = `
          SELECT
            mu.municipality_code,
            mu.municipality_name,
            CAST(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) AS INTEGER) as expired_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS INTEGER) as expiring_soon_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) AS INTEGER) as expiring_urgent_count,
            CAST(COUNT(m.member_id) AS INTEGER) as total_members,
            ROUND(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) * 100.0 / NULLIF(COUNT(m.member_id), 0), 2) as expired_percentage
          FROM municipalities mu
          LEFT JOIN members_consolidated m ON mu.municipality_code = m.municipality_code
          WHERE mu.province_code = $1
            AND COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
          GROUP BY mu.municipality_code, mu.municipality_name
          ORDER BY expired_count DESC
        `;

        const subregionalBreakdown = await executeQuery(subregionalBreakdownQuery, [provinceCode]);

        expiredMembersData = {
          national_summary: {
            total_expired: Number(provinceData?.expired_count || 0),
            total_expiring_soon: Number(provinceData?.expiring_soon_count || 0),
            total_expiring_urgent: Number(provinceData?.expiring_urgent_count || 0),
            total_members: Number(provinceData?.total_members || 0)
          },
          province_breakdown: provinceData ? [provinceData] : [],
          subregional_breakdown: subregionalBreakdown, // Add sub-regional breakdown for Province Admin
          filtered_by_province: true,
          province_code: provinceCode
        };

      } else {
        // National admin - get all provinces data
        const nationalExpiredQuery = `
          SELECT
            p.province_code,
            p.province_name,
            CAST(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) AS INTEGER) as expired_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS INTEGER) as expiring_soon_count,
            CAST(COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) AS INTEGER) as expiring_urgent_count,
            CAST(COUNT(m.member_id) AS INTEGER) as total_members,
            ROUND(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) * 100.0 / NULLIF(COUNT(m.member_id), 0), 2) as expired_percentage
          FROM provinces p
          LEFT JOIN members_consolidated m ON p.province_code = m.province_code
          GROUP BY p.province_code, p.province_name
          ORDER BY expired_count DESC
        `;

        const provinceBreakdown = await executeQuery(nationalExpiredQuery);

        // Calculate national totals - ensure all values are proper numbers
        const nationalTotals = provinceBreakdown.reduce((acc: any, province: any) => ({
          total_expired: acc.total_expired + Number(province.expired_count || 0),
          total_expiring_soon: acc.total_expiring_soon + Number(province.expiring_soon_count || 0),
          total_expiring_urgent: acc.total_expiring_urgent + Number(province.expiring_urgent_count || 0),
          total_members: acc.total_members + Number(province.total_members || 0)
        }), { total_expired: 0, total_expiring_soon: 0, total_expiring_urgent: 0, total_members: 0 });

        expiredMembersData = {
          national_summary: nationalTotals,
          province_breakdown: provinceBreakdown,
          filtered_by_province: false,
          province_code: null
        };
      }

      sendSuccess(res, expiredMembersData, 'Expired members statistics retrieved successfully');

    } catch (error) {
      console.error('Error fetching expired members statistics:', error);
      throw createDatabaseError('Failed to fetch expired members statistics', error);
    }
  })
);

// Get membership status breakdown with detailed analytics
router.get('/membership-status-breakdown',
  authenticate,
  requirePermission('statistics.read'),
  applyGeographicFilter,
  cacheMiddleware({
    ttl: 300, // 5 minutes cache
    keyGenerator: (req) => {
      const baseKey = 'membership-status-breakdown';
      const filters = [
        req.query.province_code,
        req.query.municipality_code,
        req.query.ward_code
      ].filter(Boolean).join(':');
      return `${baseKey}:${filters || 'all'}`;
    }
  }),
  asyncHandler(async (req, res) => {
    try {
      // Get geographic context from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext || (req as any).wardContext;
      const provinceCode = geographicContext?.province_code;
      const municipalCode = geographicContext?.municipal_code;
      const wardCode = geographicContext?.ward_code;

      // Build WHERE clause based on geographic filters
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (wardCode) {
        whereClause += ` AND m.ward_code = $${paramIndex}`;
        params.push(wardCode);
        paramIndex++;
      } else if (municipalCode) {
        whereClause += ` AND m.municipality_code = $${paramIndex}`;
        params.push(municipalCode);
        paramIndex++;
      } else if (provinceCode) {
        whereClause += ` AND m.province_code = $${paramIndex}`;
        params.push(provinceCode);
        paramIndex++;
      }

      // Get detailed breakdown by expiry status (business logic based)
      const expiryBreakdownQuery = `
        SELECT
          CASE
            WHEN m.expiry_date IS NULL THEN 'No Expiry Date'
            WHEN m.expiry_date >= CURRENT_DATE THEN 'Active (Good Standing)'
            WHEN m.expiry_date < CURRENT_DATE AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
            WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Inactive (Expired > 90 days)'
          END as status_category,
          CASE
            WHEN m.expiry_date IS NULL THEN 4
            WHEN m.expiry_date >= CURRENT_DATE THEN 1
            WHEN m.expiry_date < CURRENT_DATE AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 2
            WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 3
          END as sort_order,
          COUNT(*) as member_count,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause.replace(/m\./g, 'm2.')}), 0), 2) as percentage
        FROM members_consolidated m
        ${whereClause}
        GROUP BY
          CASE
            WHEN m.expiry_date IS NULL THEN 'No Expiry Date'
            WHEN m.expiry_date >= CURRENT_DATE THEN 'Active (Good Standing)'
            WHEN m.expiry_date < CURRENT_DATE AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
            WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Inactive (Expired > 90 days)'
          END,
          CASE
            WHEN m.expiry_date IS NULL THEN 4
            WHEN m.expiry_date >= CURRENT_DATE THEN 1
            WHEN m.expiry_date < CURRENT_DATE AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 2
            WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 3
          END
        ORDER BY sort_order
      `;

      const breakdown = await executeQuery(expiryBreakdownQuery, params);

      // Calculate summary statistics based on expiry_date
      const summaryQuery = `
        SELECT
          COUNT(*) as total_members,
          COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active_count,
          COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period_count,
          COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as total_active_with_grace,
          COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as inactive_count
        FROM members_consolidated m
        ${whereClause}
      `;

      const summaryResult = await executeQuerySingle(summaryQuery, params);
      const totalMembers = parseInt(summaryResult?.total_members || 0);
      const activeCount = parseInt(summaryResult?.active_count || 0);
      const gracePeriodCount = parseInt(summaryResult?.grace_period_count || 0);
      const totalActiveWithGrace = parseInt(summaryResult?.total_active_with_grace || 0);
      const inactiveCount = parseInt(summaryResult?.inactive_count || 0);

      // Calculate good_standing (active + grace period) for frontend compatibility
      const goodStandingCount = activeCount + gracePeriodCount;
      const goodStandingPercentage = totalMembers > 0 ? ((goodStandingCount / totalMembers) * 100).toFixed(2) : '0.00';

      const response = {
        summary: {
          total_members: totalMembers,
          // Good Standing = Active + Grace Period (for frontend compatibility)
          good_standing_count: goodStandingCount,
          good_standing_percentage: goodStandingPercentage,
          // Active members (not expired)
          active_count: activeCount,
          active_percentage: totalMembers > 0 ? ((activeCount / totalMembers) * 100).toFixed(2) : '0.00',
          // Grace period members (expired < 90 days)
          grace_period_count: gracePeriodCount,
          grace_period_percentage: totalMembers > 0 ? ((gracePeriodCount / totalMembers) * 100).toFixed(2) : '0.00',
          // Total active with grace (same as good_standing for backward compatibility)
          total_active_with_grace: totalActiveWithGrace,
          total_active_with_grace_percentage: totalMembers > 0 ? ((totalActiveWithGrace / totalMembers) * 100).toFixed(2) : '0.00',
          // Inactive members (expired > 90 days)
          inactive_count: inactiveCount,
          inactive_percentage: totalMembers > 0 ? ((inactiveCount / totalMembers) * 100).toFixed(2) : '0.00'
        },
        breakdown_by_expiry: breakdown.map((row: any) => ({
          status_category: row.status_category,
          member_count: parseInt(row.member_count),
          percentage: parseFloat(row.percentage) || 0
        })),
        filters_applied: {
          province_code: provinceCode || null,
          municipality_code: municipalCode || null,
          ward_code: wardCode || null
        },
        note: 'Status based on expiry_date: Good Standing (not expired OR expired < 90 days), Active (not expired), Grace Period (expired < 90 days), Inactive (expired > 90 days)'
      };

      sendSuccess(res, response, 'Membership status breakdown retrieved successfully');
    } catch (error) {
      console.error('Error fetching membership status breakdown:', error);
      throw createDatabaseError('Failed to fetch membership status breakdown', error);
    }
  })
);

// Get dashboard summary (combines multiple statistics including expired members)
router.get('/dashboard',
  authenticate,
  requirePermission('statistics.read'),
  applyGeographicFilter,
  cacheMiddleware({
    ttl: 300, // 5 minutes cache
    keyGenerator: (req) => {
      const baseKey = 'dashboard';
      const filters = [
        req.query.province_code,
        req.query.municipality_code,
        req.query.ward_code,
        req.query.membership_status
      ].filter(Boolean).join(':');
      return `${baseKey}:${filters || 'all'}`;
    }
  }),
  asyncHandler(async (req, res) => {
    // Get geographic context from middleware
    const geographicContext = (req as any).provinceContext || (req as any).municipalityContext || (req as any).wardContext;
    const provinceCode = geographicContext?.province_code;
    const municipalCode = geographicContext?.municipal_code;
    const wardCode = geographicContext?.ward_code;

    // Get membership status filter from query params
    const { membership_status } = req.query;
    let statusFilter = '';

    if (membership_status === 'good_standing') {
      statusFilter = ' AND m.membership_status_id = 1'; // Status ID 1 = Active/Good Standing
    } else if (membership_status === 'active') {
      statusFilter = ' AND ms.is_active = TRUE';
    } else if (membership_status === 'expired') {
      statusFilter = ' AND m.expiry_date < CURRENT_DATE';
    }

    // Log access for audit
    if (wardCode) {
      console.log(`🔒 Loading dashboard data for ward: ${wardCode}${membership_status ? ` (filter: ${membership_status})` : ''}`);
    } else if (municipalCode) {
      console.log(`🔒 Loading dashboard data for municipality: ${municipalCode}${membership_status ? ` (filter: ${membership_status})` : ''}`);
    } else if (provinceCode) {
      await logProvinceAccess(req, 'dashboard_access', provinceCode);
      console.log(`🔒 Loading dashboard data for province: ${provinceCode}${membership_status ? ` (filter: ${membership_status})` : ''}`);
    }

    let systemStats: any, trends: any, demographics: any;

    if (municipalCode) {
      // Municipality admin - get municipality-specific data
      const municipalityStatsQuery = `
        SELECT
          COUNT(m.member_id) as total_members,
          COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE OR m.expiry_date IS NULL THEN 1 END) as active_members,
          0 as pending_members,
          COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_members,
          COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon_members,
          COUNT(CASE WHEN DATE(m.created_at) = CURRENT_DATE THEN 1 END) as today_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_registrations
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        WHERE m.municipality_code = $1${statusFilter}
      `;

      const [municipalityStats] = await executeQuery(municipalityStatsQuery, [municipalCode]);

      // Get geographic counts for municipality
      const geoStatsQuery = `
        SELECT
          COUNT(DISTINCT w.ward_code) as total_wards,
          1 as total_municipalities,
          COUNT(DISTINCT d.district_code) as total_districts,
          COUNT(DISTINCT p.province_code) as total_provinces
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE m.municipality_code = $1
      `;
      const [geoStats] = await executeQuery(geoStatsQuery, [municipalCode]);

      // Format the data to match the expected structure (same as national admin)
      systemStats = {
        totals: {
          members: municipalityStats.total_members || 0,
          memberships: municipalityStats.total_members || 0,
          active_memberships: municipalityStats.active_members || 0,
          provinces: geoStats?.total_provinces || 0,
          districts: geoStats?.total_districts || 0,
          municipalities: geoStats?.total_municipalities || 1,
          wards: geoStats?.total_wards || 0,
          voting_stations: 0
        },
        growth: {
          members_this_month: municipalityStats.month_registrations || 0,
          members_last_month: 0,
          growth_rate: 0
        },
        total_members: municipalityStats.total_members || 0,
        active_members: municipalityStats.active_members || 0,
        expired_members: municipalityStats.expired_members || 0,
        expiring_soon_members: municipalityStats.expiring_soon_members || 0,
        pending_members: municipalityStats.pending_members || 0,
        today_registrations: municipalityStats.today_registrations || 0,
        week_registrations: municipalityStats.week_registrations || 0,
        month_registrations: municipalityStats.month_registrations || 0,
        municipality_filter: municipalCode
      };

      // Get basic trends and demographics for municipality
      trends = {
        monthly_registrations: [],
        status_distribution: [
          { status: 'active', count: municipalityStats.active_members || 0 },
          { status: 'expired', count: municipalityStats.expired_members || 0 },
          { status: 'pending', count: municipalityStats.pending_members || 0 }
        ],
        expiry_analysis: [],
        municipality_filter: municipalCode
      };

      demographics = {
        gender_distribution: [],
        age_distribution: [],
        municipality_filter: municipalCode
      };

    } else if (wardCode) {
      // Ward admin - get ward-specific data
      const wardStatsQuery = `
        SELECT
          COUNT(m.member_id) as total_members,
          COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE OR m.expiry_date IS NULL THEN 1 END) as active_members,
          0 as pending_members,
          COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_members,
          COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon_members,
          COUNT(CASE WHEN DATE(m.created_at) = CURRENT_DATE THEN 1 END) as today_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_registrations
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        WHERE m.ward_code = $1${statusFilter}
      `;

      const [wardStats] = await executeQuery(wardStatsQuery, [wardCode]);

      // Get geographic counts for ward
      const geoStatsQuery = `
        SELECT
          1 as total_wards,
          COUNT(DISTINCT m.municipality_code) as total_municipalities,
          COUNT(DISTINCT d.district_code) as total_districts,
          COUNT(DISTINCT p.province_code) as total_provinces
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE w.ward_code = $1
      `;
      const [geoStats] = await executeQuery(geoStatsQuery, [wardCode]);

      // Format the data to match the expected structure (same as national admin)
      systemStats = {
        totals: {
          members: wardStats.total_members || 0,
          memberships: wardStats.total_members || 0,
          active_memberships: wardStats.active_members || 0,
          provinces: geoStats?.total_provinces || 0,
          districts: geoStats?.total_districts || 0,
          municipalities: geoStats?.total_municipalities || 0,
          wards: geoStats?.total_wards || 1,
          voting_stations: 0
        },
        growth: {
          members_this_month: wardStats.month_registrations || 0,
          members_last_month: 0,
          growth_rate: 0
        },
        total_members: wardStats.total_members || 0,
        active_members: wardStats.active_members || 0,
        expired_members: wardStats.expired_members || 0,
        expiring_soon_members: wardStats.expiring_soon_members || 0,
        pending_members: wardStats.pending_members || 0,
        today_registrations: wardStats.today_registrations || 0,
        week_registrations: wardStats.week_registrations || 0,
        month_registrations: wardStats.month_registrations || 0,
        ward_filter: wardCode
      };

      // Get basic trends and demographics for ward
      trends = {
        monthly_registrations: [],
        status_distribution: [
          { status: 'active', count: wardStats.active_members || 0 },
          { status: 'expired', count: wardStats.expired_members || 0 },
          { status: 'pending', count: wardStats.pending_members || 0 }
        ],
        expiry_analysis: [],
        ward_filter: wardCode
      };

      demographics = {
        gender_distribution: [],
        age_distribution: [],
        ward_filter: wardCode
      };

    } else if (provinceCode) {
      // Provincial admin - get province-specific data
      const provinceStatsQuery = `
        SELECT
          COUNT(m.member_id) as total_members,
          COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE OR m.expiry_date IS NULL THEN 1 END) as active_members,
          0 as pending_members,
          COUNT(CASE WHEN m.expiry_date < CURRENT_DATE THEN 1 END) as expired_members,
          COUNT(CASE WHEN m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon_members,
          COUNT(CASE WHEN DATE(m.created_at) = CURRENT_DATE THEN 1 END) as today_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_registrations,
          COUNT(CASE WHEN DATE(m.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_registrations
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        WHERE m.province_code = $1${statusFilter}
      `;

      const [provinceStats] = await executeQuery(provinceStatsQuery, [provinceCode]);

      // Get geographic counts for province
      const geoStatsQuery = `
        SELECT
          COUNT(DISTINCT w.ward_code) as total_wards,
          COUNT(DISTINCT m.municipality_code) as total_municipalities,
          COUNT(DISTINCT d.district_code) as total_districts,
          1 as total_provinces
        FROM provinces p
        LEFT JOIN districts d ON p.province_code = d.province_code
        LEFT JOIN municipalities m ON d.district_code = m.district_code
        LEFT JOIN wards w ON m.municipality_code = w.municipality_code
        WHERE p.province_code = $1
      `;
      const [geoStats] = await executeQuery(geoStatsQuery, [provinceCode]);

      // Format the data to match the expected structure (same as national admin)
      systemStats = {
        totals: {
          members: provinceStats.total_members || 0,
          memberships: provinceStats.total_members || 0,
          active_memberships: provinceStats.active_members || 0,
          provinces: geoStats?.total_provinces || 1,
          districts: geoStats?.total_districts || 0,
          municipalities: geoStats?.total_municipalities || 0,
          wards: geoStats?.total_wards || 0,
          voting_stations: 0
        },
        growth: {
          members_this_month: provinceStats.month_registrations || 0,
          members_last_month: 0,
          growth_rate: 0
        },
        total_members: provinceStats.total_members || 0,
        active_members: provinceStats.active_members || 0,
        expired_members: provinceStats.expired_members || 0,
        expiring_soon_members: provinceStats.expiring_soon_members || 0,
        pending_members: provinceStats.pending_members || 0,
        today_registrations: provinceStats.today_registrations || 0,
        week_registrations: provinceStats.week_registrations || 0,
        month_registrations: provinceStats.month_registrations || 0,
        province_filter: provinceCode
      };

      // Get basic trends and demographics (can be enhanced later)
      trends = {
        monthly_registrations: [],
        status_distribution: [
          { status: 'active', count: provinceStats.active_members || 0 },
          { status: 'expired', count: provinceStats.expired_members || 0 },
          { status: 'pending', count: provinceStats.pending_members || 0 }
        ],
        expiry_analysis: [],
        province_filter: provinceCode
      };

      demographics = {
        gender_distribution: [],
        age_distribution: [],
        province_filter: provinceCode
      };

    } else {
      // National admin - get all data
      [systemStats, trends, demographics] = await Promise.all([
        StatisticsModel.getSystemStatistics(),
        StatisticsModel.getMembershipTrends(6),
        StatisticsModel.getDemographicBreakdown()
      ]);

      console.log('📊 National Admin Dashboard - System Stats:', JSON.stringify(systemStats, null, 2));
    }

    const dashboardData = {
      system: systemStats,
      recent_trends: {
        monthly_registrations: trends.monthly_registrations || [],
        status_distribution: trends.status_distribution || [],
        expiry_analysis: trends.expiry_analysis || []
      },
      demographics: {
        gender: demographics.gender_distribution || [],
        age_groups: demographics.age_distribution || [],
        top_races: demographics.race?.slice(0, 5) || [],
        top_languages: demographics.language?.slice(0, 5) || [],
        top_occupations: demographics.occupation?.slice(0, 5) || []
      },
      alerts: {
        expiring_soon: systemStats.expiring_soon_members || 0,
        expired: systemStats.expired_members || 0,
        growth_rate: systemStats.week_registrations || 0
      },
      expired_members: {
        total_expired: systemStats.expired_members || 0,
        total_expiring_soon: systemStats.expiring_soon_members || 0,
        filtered_by_province: !!provinceCode,
        filtered_by_municipality: !!municipalCode,
        filtered_by_ward: !!wardCode,
        province_code: provinceCode || null,
        municipality_code: municipalCode || null,
        ward_code: wardCode || null
      },
      filters_applied: {
        membership_status: membership_status || 'all',
        province_code: provinceCode || null,
        municipality_code: municipalCode || null,
        ward_code: wardCode || null
      },
      province_context: provinceCode ? {
        province_code: provinceCode,
        filtered_by_province: true
      } : {
        filtered_by_province: false
      },
      municipality_context: municipalCode ? {
        municipality_code: municipalCode,
        filtered_by_municipality: true
      } : {
        filtered_by_municipality: false
      },
      ward_context: wardCode ? {
        ward_code: wardCode,
        filtered_by_ward: true
      } : {
        filtered_by_ward: false
      },
      // Add context information for easy access
      totalMembers: systemStats.total_members || 0,
      provinceCode: provinceCode || null,
      municipalityCode: municipalCode || null,
      wardCode: wardCode || null,
      provinceFilterApplied: provinceCode || null,
      municipalityFilterApplied: municipalCode || null,
      wardFilterApplied: wardCode || null
    };

    sendSuccess(res, dashboardData, 'Dashboard statistics retrieved successfully');
  })
);

// Get top performing wards by member count (Good Standing members only)
router.get('/top-wards',
  authenticate,
  requirePermission('statistics.read'),
  applyProvinceFilter,
  applyGeographicFilter,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const provinceCode = (req as any).provinceContext?.province_code;
    const municipalityCode = (req as any).municipalityContext?.municipal_code;

    // Updated query to count only active members based on expiry_date
    // Active = not expired OR in grace period (expired < 90 days)
    let query = `
      SELECT
        w.ward_code,
        w.ward_name,
        m.municipality_name,
        m.municipality_code,
        d.district_name,
        p.province_name,
        COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as member_count,
        COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mem.membership_active = true THEN 1 END) as active_members,
        ROUND(
          COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND mem.membership_active = true THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END), 0),
          2
        ) as active_percentage
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN vw_member_details mem ON w.ward_code = mem.ward_code
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    if (provinceCode) {
      whereConditions.push('p.province_code = ?');
      params.push(provinceCode);
    }

    if (municipalityCode) {
      whereConditions.push('m.municipality_code = ?');
      params.push(municipalityCode);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += `
      GROUP BY w.ward_code, w.ward_name, m.municipality_name, m.municipality_code, d.district_name, p.province_name
      HAVING member_count > 0
      ORDER BY member_count DESC, active_percentage DESC
      LIMIT ?
    `;

    params.push(limit);

    const topWards = await executeQuery(query, params);

    sendSuccess(res, {
      data: topWards,
      province_filter: provinceCode,
      municipality_filter: municipalityCode,
      limit: limit,
      note: 'Member counts reflect only active members (not expired OR expired < 90 days)'
    }, 'Top performing wards retrieved successfully');
  })
);

// Get municipality statistics and performance overview
router.get('/municipality-overview',
  authenticate,
  requirePermission('statistics.read'),
  applyGeographicFilter,
  asyncHandler(async (req, res) => {
    const municipalityCode = (req as any).municipalityContext?.municipal_code;

    if (!municipalityCode) {
      return sendSuccess(res, {
        error: 'Municipality code required for this endpoint'
      }, 'Municipality code required');
    }

    // Get municipality basic stats
    const municipalityStatsQuery = `
      SELECT
        municipality_code,
        municipality_name,
        district_name,
        province_name,
        total_wards,
        good_standing_wards,
        acceptable_standing_wards,
        needs_improvement_wards,
        compliant_wards,
        compliance_percentage,
        municipality_performance,
        performance_level,
        total_active_members,
        total_all_members,
        avg_active_per_ward,
        wards_needed_compliance
      FROM vw_municipality_ward_performance
      WHERE municipality_code = ?
    `;

    // Get top 5 performing wards in the municipality
    const topWardsQuery = `
      SELECT
        ward_code,
        ward_name,
        active_members,
        total_members,
        ward_standing,
        standing_level,
        active_percentage,
        target_achievement_percentage
      FROM vw_ward_membership_audit
      WHERE municipality_code = ?
      ORDER BY active_members DESC, active_percentage DESC
      LIMIT 5
    `;

    // Get member demographics for the municipality
    const demographicsQuery = `
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN gender_name = 'Male' THEN 1 END) as male_members,
        COUNT(CASE WHEN gender_name = 'Female' THEN 1 END) as female_members,
        COUNT(CASE WHEN is_eligible_to_vote = 1 THEN 1 END) as active_members,
        COUNT(CASE WHEN is_eligible_to_vote = 0 THEN 1 END) as inactive_members,
        AVG(YEAR(CURDATE()) - YEAR(date_of_birth)) as avg_age
      FROM vw_member_details
      WHERE municipality_code = ?
    `;

    try {
      const [municipalityStats, topWards, demographics] = await Promise.all([
        executeQuerySingle(municipalityStatsQuery, [municipalityCode]),
        executeQuery(topWardsQuery, [municipalityCode]),
        executeQuerySingle(demographicsQuery, [municipalityCode])
      ]);

      sendSuccess(res, {
        municipality: municipalityStats,
        top_performing_wards: topWards,
        demographics: demographics,
        municipality_code: municipalityCode
      }, 'Municipality overview retrieved successfully');
    } catch (error) {
      console.error('Error fetching municipality overview:', error);
      throw createDatabaseError('Failed to fetch municipality overview', error);
    }
  })
);

// Get comparative statistics between areas
router.get('/compare',
  validate({
    query: Joi.object({
      areas: Joi.string().required().custom((value, helpers) => {
        const areas = value.split(',');
        if (areas.length < 2 || areas.length > 5) {
          return helpers.error('any.invalid');
        }
        return areas;
      }).messages({
        'any.invalid': 'Must provide between 2 and 5 area codes separated by commas'
      }),
      type: Joi.string().valid('ward', 'municipality', 'district', 'province').default('ward')
    })
  }),
  asyncHandler(async (req, res) => {
    const { areas, type = 'ward' } = req.query;
    const areaCodes = (areas as string).split(',');
    
    const comparisons = await Promise.all(
      areaCodes.map(async (code) => {
        const filterKey = `${type}_code` as 'ward_code' | 'municipality_code' | 'district_code' | 'province_code';
        const demographics = await StatisticsModel.getDemographicBreakdown({ [filterKey]: code.trim() });
        
        return {
          code: code.trim(),
          type,
          demographics
        };
      })
    );
    
    sendSuccess(res, {
      comparisons,
      summary: {
        total_areas: comparisons.length,
        comparison_type: type
      }
    }, `Comparative statistics for ${areaCodes.length} ${type}s retrieved successfully`);
  })
);

// Get statistics export data
router.get('/export',
  validate({
    query: Joi.object({
      format: Joi.string().valid('summary', 'detailed').default('summary'),
      ward_code: Joi.string().min(5).max(15).optional(),
      municipality_code: Joi.string().min(3).max(10).optional(),
      district_code: Joi.string().min(3).max(10).optional(),
      province_code: Joi.string().min(2).max(3).optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { format = 'summary', ward_code, municipality_code, district_code, province_code } = req.query;
    
    const filters = {
      ward_code: ward_code as string,
      municipality_code: municipality_code as string,
      district_code: district_code as string,
      province_code: province_code as string
    };

    let exportData;
    
    if (format === 'detailed') {
      const [demographics, wardStats, trends] = await Promise.all([
        StatisticsModel.getDemographicBreakdown(filters),
        StatisticsModel.getWardMembershipStats(ward_code as string),
        StatisticsModel.getMembershipTrends(12)
      ]);
      
      exportData = {
        demographics,
        ward_statistics: wardStats,
        membership_trends: trends,
        generated_at: new Date().toISOString(),
        filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      };
    } else {
      const [systemStats, demographics] = await Promise.all([
        StatisticsModel.getSystemStatistics(),
        StatisticsModel.getDemographicBreakdown(filters)
      ]);
      
      exportData = {
        system_totals: systemStats.totals,
        growth: systemStats.growth,
        demographics_summary: {
          gender: demographics.gender,
          age_groups: demographics.age_groups,
          top_races: demographics.race.slice(0, 3),
          top_languages: demographics.language.slice(0, 3)
        },
        generated_at: new Date().toISOString(),
        filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      };
    }
    
    sendSuccess(res, exportData, `Statistics export (${format}) generated successfully`);
  })
);

// Generate Provincial Distribution Report PDF
router.get('/provincial-distribution/report/pdf',
  validate({
    query: Joi.object({
      title: Joi.string().max(100).optional(),
      include_charts: Joi.boolean().optional(),
      sort_by: Joi.string().valid('name', 'member_count', 'percentage').optional(),
      sort_order: Joi.string().valid('asc', 'desc').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      title,
      include_charts,
      sort_by = 'member_count',
      sort_order = 'desc'
    } = req.query;

    // Get provincial distribution data
    const provincialData = await StatisticsModel.getProvincialDistribution({
      sort_by: sort_by as string,
      sort_order: sort_order as string
    });

    // Determine report title
    const reportTitle = title as string || 'Provincial Distribution Report';

    // Generate PDF
    const pdfBuffer = await PDFExportService.exportProvincialDistributionToPDF(provincialData, {
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      orientation: 'portrait',
      includeCharts: include_charts !== 'false',
      sortBy: sort_by as string,
      sortOrder: sort_order as string
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="provincial-distribution-report-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  })
);

// Get Provincial Distribution Data (for frontend display)
router.get('/provincial-distribution',
  authenticate,
  requirePermission('statistics.read'),
  applyProvinceFilter,
  validate({
    query: Joi.object({
      sort_by: Joi.string().valid('name', 'member_count', 'percentage').optional(),
      sort_order: Joi.string().valid('asc', 'desc').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      sort_by = 'member_count',
      sort_order = 'desc'
    } = req.query;

    // Log province access for audit
    await logProvinceAccess(req, 'provincial_distribution_access', (req as any).provinceContext?.province_code);

    const provinceCode = (req as any).provinceContext?.province_code;

    let provincialData;

    if (provinceCode) {
      // Provincial admin - return only their province data
      // For now, get all data and filter to their province
      const allProvincialData = await StatisticsModel.getProvincialDistribution({
        sort_by: sort_by as string,
        sort_order: sort_order as string
      });

      // Filter to only the admin's province
      provincialData = {
        ...allProvincialData,
        provinces: allProvincialData.provinces.filter(p => p.province_code === provinceCode)
      };

      // Recalculate summary for filtered data
      if (provincialData.provinces.length > 0) {
        const provinceData = provincialData.provinces[0];
        provincialData.summary = {
          total_members: provinceData.member_count,
          total_provinces: 1,
          average_members_per_province: provinceData.member_count,
          largest_province: { name: provinceData.province_name, count: provinceData.member_count, percentage: 100 },
          smallest_province: { name: provinceData.province_name, count: provinceData.member_count, percentage: 100 }
        };
      }
    } else {
      // National admin - return all provinces
      provincialData = await StatisticsModel.getProvincialDistribution({
        sort_by: sort_by as string,
        sort_order: sort_order as string
      });
    }

    sendSuccess(res, {
      provincial_distribution: provincialData,
      summary: {
        total_provinces: provincialData.provinces.length,
        total_members: provincialData.summary.total_members,
        largest_province: provincialData.provinces[0]?.province_name || 'N/A',
        smallest_province: provincialData.provinces[provincialData.provinces.length - 1]?.province_name || 'N/A'
      },
      province_context: provinceCode ? {
        province_code: provinceCode,
        filtered_by_province: true
      } : {
        filtered_by_province: false
      }
    }, 'Provincial distribution retrieved successfully');
  })
);

// Generate Regional Comparison Report PDF
router.get('/regional-comparison/report/pdf',
  validate({
    query: Joi.object({
      regions: Joi.string().required().custom((value, helpers) => {
        const regions = value.split(',');
        if (regions.length < 2 || regions.length > 5) {
          return helpers.error('any.invalid');
        }
        return regions;
      }).messages({
        'any.invalid': 'Must provide between 2 and 5 region codes separated by commas'
      }),
      region_type: Joi.string().valid('province', 'district', 'municipality', 'ward').default('province'),
      title: Joi.string().max(100).optional(),
      include_charts: Joi.boolean().optional(),
      comparison_type: Joi.string().valid('demographic', 'geographic', 'comprehensive').default('comprehensive')
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      regions,
      region_type = 'province',
      title,
      include_charts,
      comparison_type = 'comprehensive'
    } = req.query;

    const regionCodes = (regions as string).split(',');

    // Get regional comparison data
    const comparisonData = await StatisticsModel.getRegionalComparison({
      region_codes: regionCodes,
      region_type: region_type as string,
      comparison_type: comparison_type as string
    });

    // Determine report title
    const reportTitle = title as string || `Regional Comparison Report - ${regionCodes.join(' vs ')}`;

    // Generate PDF
    const pdfBuffer = await PDFExportService.exportRegionalComparisonToPDF(comparisonData, {
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      orientation: 'landscape',
      includeCharts: include_charts !== 'false',
      regionType: region_type as string,
      comparisonType: comparison_type as string
    });

    // Set response headers for PDF download
    const filename = `regional-comparison-${regionCodes.join('-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  })
);

// Get Regional Comparison Data (for frontend display)
router.get('/regional-comparison',
  validate({
    query: Joi.object({
      regions: Joi.string().required().custom((value, helpers) => {
        const regions = value.split(',');
        if (regions.length < 2 || regions.length > 5) {
          return helpers.error('any.invalid');
        }
        return regions;
      }).messages({
        'any.invalid': 'Must provide between 2 and 5 region codes separated by commas'
      }),
      region_type: Joi.string().valid('province', 'district', 'municipality', 'ward').default('province'),
      comparison_type: Joi.string().valid('demographic', 'geographic', 'comprehensive').default('comprehensive')
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      regions,
      region_type = 'province',
      comparison_type = 'comprehensive'
    } = req.query;

    const regionCodes = (regions as string).split(',');

    const comparisonData = await StatisticsModel.getRegionalComparison({
      region_codes: regionCodes,
      region_type: region_type as string,
      comparison_type: comparison_type as string
    });

    sendSuccess(res, {
      regional_comparison: comparisonData,
      summary: {
        total_regions: comparisonData.regions.length,
        region_type: region_type,
        comparison_type: comparison_type,
        largest_region: comparisonData.regions.reduce((max, region) =>
          region.member_count > max.member_count ? region : max
        ),
        smallest_region: comparisonData.regions.reduce((min, region) =>
          region.member_count < min.member_count ? region : min
        )
      }
    }, 'Regional comparison retrieved successfully');
  })
);

// Generate Monthly Summary Report PDF
router.get('/monthly-summary/report/pdf',
  validate({
    query: Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(2020).max(2030).required(),
      title: Joi.string().max(100).optional(),
      include_charts: Joi.boolean().optional(),
      report_format: Joi.string().valid('executive', 'detailed', 'comprehensive').default('comprehensive'),
      include_comparisons: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      month,
      year,
      title,
      include_charts,
      report_format = 'comprehensive',
      include_comparisons
    } = req.query;

    // Get monthly summary data
    const summaryData = await StatisticsModel.getMonthlySummary({
      month: parseInt(month as string),
      year: parseInt(year as string),
      include_comparisons: include_comparisons !== 'false',
      report_format: report_format as string
    });

    // Determine report title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const reportTitle = title as string || `Monthly Summary Report - ${monthNames[parseInt(month as string) - 1]} ${year}`;

    // Generate PDF
    const pdfBuffer = await PDFExportService.exportMonthlySummaryToPDF(summaryData, {
      title: reportTitle,
      subtitle: `Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      orientation: 'portrait',
      includeCharts: include_charts !== 'false',
      reportFormat: report_format as string,
      includeComparisons: include_comparisons !== 'false'
    });

    // Set response headers for PDF download
    const filename = `monthly-summary-${year}-${String(month).padStart(2, '0')}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  })
);

// Get Monthly Summary Data (for frontend display)
router.get('/monthly-summary',
  validate({
    query: Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(2020).max(2030).required(),
      include_comparisons: Joi.boolean().optional(),
      report_format: Joi.string().valid('executive', 'detailed', 'comprehensive').default('comprehensive')
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      month,
      year,
      include_comparisons = true,
      report_format = 'comprehensive'
    } = req.query;

    const summaryData = await StatisticsModel.getMonthlySummary({
      month: parseInt(month as string),
      year: parseInt(year as string),
      include_comparisons: include_comparisons as boolean,
      report_format: report_format as string
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

    sendSuccess(res, {
      monthly_summary: summaryData,
      summary: {
        report_month: `${monthNames[parseInt(month as string) - 1]} ${year}`,
        total_members: summaryData.monthly_metrics.total_members,
        new_registrations: summaryData.monthly_metrics.new_registrations,
        growth_rate: summaryData.trend_analysis?.month_over_month_growth || 0,
        report_format: report_format
      }
    }, 'Monthly summary retrieved successfully');
  })
);

// Get Membership Status Overview for Dashboard
router.get('/membership-status-overview',
  asyncHandler(async (req, res) => {
    try {
      // Get current date for calculations
      const currentDate = new Date();

      // Get total active members (simulate expiration as 1 year from creation)
      const activeCountQuery = `
        SELECT COUNT(*) as active_count
        FROM vw_member_details
        WHERE DATE_ADD(member_created_at, INTERVAL 365 DAY) > CURDATE()
      `;
      const activeResult = await executeQuerySingle<{ active_count: number }>(activeCountQuery);
      const activeMembers = activeResult?.active_count || 0;

      // Get members expiring within 30 days (simulate expiration as 1 year from creation)
      const expiring30Query = `
        SELECT
          member_id,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          email,
          COALESCE(cell_number, '') as phone_number,
          DATE_ADD(member_created_at, INTERVAL 365 DAY) as membership_expiry_date,
          DATEDIFF(DATE_ADD(member_created_at, INTERVAL 365 DAY), CURDATE()) as days_until_expiration
        FROM vw_member_details
        WHERE DATE_ADD(member_created_at, INTERVAL 365 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY DATE_ADD(member_created_at, INTERVAL 365 DAY) ASC
        LIMIT 100
      `;
      const expiring30Days = await executeQuery<{
        member_id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_until_expiration: number;
      }>(expiring30Query);

      // Get members expiring within 7 days (urgent)
      const expiring7Query = `
        SELECT
          member_id,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          email,
          COALESCE(cell_number, '') as phone_number,
          DATE_ADD(member_created_at, INTERVAL 365 DAY) as membership_expiry_date,
          DATEDIFF(DATE_ADD(member_created_at, INTERVAL 365 DAY), CURDATE()) as days_until_expiration
        FROM vw_member_details
        WHERE DATE_ADD(member_created_at, INTERVAL 365 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY DATE_ADD(member_created_at, INTERVAL 365 DAY) ASC
        LIMIT 50
      `;
      const expiring7Days = await executeQuery<{
        member_id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_until_expiration: number;
      }>(expiring7Query);

      // Get recently expired members (within last 30 days)
      const recentlyExpiredQuery = `
        SELECT
          member_id,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          email,
          COALESCE(cell_number, '') as phone_number,
          DATE_ADD(member_created_at, INTERVAL 365 DAY) as membership_expiry_date,
          ABS(DATEDIFF(CURDATE(), DATE_ADD(member_created_at, INTERVAL 365 DAY))) as days_since_expiration
        FROM vw_member_details
        WHERE DATE_ADD(member_created_at, INTERVAL 365 DAY) BETWEEN DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND CURDATE()
        ORDER BY DATE_ADD(member_created_at, INTERVAL 365 DAY) DESC
        LIMIT 100
      `;
      const recentlyExpired = await executeQuery<{
        member_id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        days_since_expiration: number;
      }>(recentlyExpiredQuery);

      // Get inactive members (no activity for 90+ days) - simplified version
      const inactiveMembersQuery = `
        SELECT
          member_id,
          firstname as first_name,
          COALESCE(surname, '') as last_name,
          email,
          COALESCE(cell_number, '') as phone_number,
          DATE_ADD(member_created_at, INTERVAL 365 DAY) as membership_expiry_date,
          member_created_at as last_activity_date,
          DATEDIFF(CURDATE(), member_created_at) as days_since_activity
        FROM vw_member_details
        WHERE member_created_at < DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          AND DATE_ADD(member_created_at, INTERVAL 365 DAY) > CURDATE()
        ORDER BY member_created_at ASC
        LIMIT 100
      `;
      const inactiveMembers = await executeQuery<{
        member_id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
        membership_expiry_date: string;
        last_activity_date: string;
        days_since_activity: number;
      }>(inactiveMembersQuery);

      // Get renewal statistics
      const renewalStatsQuery = `
        SELECT
          COUNT(*) as total_renewals_last_30_days,
          AVG(DATEDIFF(DATE_ADD(member_created_at, INTERVAL 365 DAY), member_created_at)) as avg_membership_duration_days
        FROM vw_member_details
        WHERE member_created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `;
      const renewalStats = await executeQuerySingle<{
        total_renewals_last_30_days: number;
        avg_membership_duration_days: number;
      }>(renewalStatsQuery);

      const statusOverview = {
        active_members: activeMembers,
        expiring_within_30_days: expiring30Days,
        expiring_within_7_days: expiring7Days,
        recently_expired: recentlyExpired,
        inactive_members: inactiveMembers,
        renewal_statistics: {
          renewals_last_30_days: renewalStats?.total_renewals_last_30_days || 0,
          average_membership_duration: Math.round(renewalStats?.avg_membership_duration_days || 0),
          renewal_rate: recentlyExpired.length > 0 ?
            ((renewalStats?.total_renewals_last_30_days || 0) / recentlyExpired.length * 100).toFixed(1) : '0'
        }
      };

      sendSuccess(res, {
        membership_status: statusOverview,
        summary: {
          total_active: statusOverview.active_members,
          expiring_soon: statusOverview.expiring_within_30_days.length,
          urgent_renewals: statusOverview.expiring_within_7_days.length,
          recently_expired: statusOverview.recently_expired.length,
          inactive_members: statusOverview.inactive_members.length
        }
      }, 'Membership status overview retrieved successfully');
    } catch (error) {
      console.error('Error fetching membership status overview:', error);
      throw error;
    }
  })
);

export default router;
