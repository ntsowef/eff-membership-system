import express from 'express';
import { executeQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { authenticate, requirePermission, applyGeographicFilter } from '../middleware/auth';
import { PDFExportService } from '../services/pdfExportService';
import Joi from 'joi';

const router = express.Router();

// =====================================================
// GET /api/v1/audit/ward-membership/overview
// =====================================================
// Get summary statistics and municipality performance overview

router.get('/overview',
  authenticate,
  requirePermission('audit.read'),
  applyGeographicFilter,
  asyncHandler(async (req, res) => {
    try {
      // Get geographic filter from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      const provinceCode = geographicContext?.province_code;
      const municipalCode = geographicContext?.municipal_code;



      // Build WHERE clause for geographic filtering
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (municipalCode) {
        // Municipality admin - filter to specific municipality
        whereConditions.push('municipality_code = ?');
        queryParams.push(municipalCode);
      } else if (provinceCode) {
        // Province admin - filter to specific province
        whereConditions.push('province_code = ?');
        queryParams.push(provinceCode);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get overall statistics with province filtering
      const overviewQuery = `
        SELECT
          COUNT(*) as total_wards,
          SUM(CASE WHEN standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
          SUM(CASE WHEN standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
          SUM(CASE WHEN standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,
          ROUND(IFNULL(AVG(active_members), 0), 1) as avg_active_members_per_ward,
          IFNULL(SUM(active_members), 0) as total_active_members,
          IFNULL(SUM(total_members), 0) as total_all_members,
          ROUND(
            (SUM(CASE WHEN standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) /
            NULLIF(COUNT(*), 0), 2
          ) as overall_compliance_percentage
        FROM vw_ward_membership_audit
        ${whereClause}
      `;

    // Get municipality performance summary with province filtering
    const municipalityQuery = `
      SELECT
        COUNT(*) as total_municipalities,
        SUM(CASE WHEN performance_level = 1 THEN 1 ELSE 0 END) as performing_municipalities,
        SUM(CASE WHEN performance_level = 2 THEN 1 ELSE 0 END) as underperforming_municipalities,
        ROUND(IFNULL(AVG(compliance_percentage), 0), 2) as avg_municipality_compliance
      FROM vw_municipality_ward_performance
      ${whereClause}
    `;

    // Get standing distribution with province filtering
    const standingDistributionQuery = `
      SELECT
        ward_standing,
        standing_level,
        COUNT(*) as ward_count,
        ROUND((COUNT(*) * 100.0) / (SELECT COUNT(*) FROM vw_ward_membership_audit ${whereClause}), 2) as percentage
      FROM vw_ward_membership_audit
      ${whereClause}
      GROUP BY ward_standing, standing_level
      ORDER BY standing_level
    `;

    // Get top performing municipalities with geographic filtering
    const topMunicipalitiesQuery = `
      SELECT
        municipality_name,
        compliance_percentage,
        total_wards,
        compliant_wards,
        total_active_members
      FROM vw_municipality_ward_performance
      WHERE performance_level = 1 ${whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : ''}
      ORDER BY compliance_percentage DESC, total_active_members DESC
      LIMIT 10
    `;

    // Get municipalities needing attention with geographic filtering
    const needsAttentionQuery = `
      SELECT
        municipality_name,
        compliance_percentage,
        total_wards,
        needs_improvement_wards,
        wards_needed_compliance
      FROM vw_municipality_ward_performance
      WHERE performance_level = 2 ${provinceCode ? 'AND province_code = ?' : ''}
      ORDER BY compliance_percentage ASC, needs_improvement_wards DESC
      LIMIT 10
    `;

    const [overviewResult, municipalityResult, standingResult, topMunicipalities, needsAttention] = await Promise.all([
      executeQuery(overviewQuery, queryParams),
      executeQuery(municipalityQuery, queryParams),
      executeQuery(standingDistributionQuery, [...queryParams, ...queryParams]), // Used twice in subquery
      executeQuery(topMunicipalitiesQuery, provinceCode ? [provinceCode] : []),
      executeQuery(needsAttentionQuery, provinceCode ? [provinceCode] : [])
    ]);

    // Handle MySQL result structure (returns rows directly, not wrapped in .rows)
    const overview = Array.isArray(overviewResult) ? overviewResult[0] : overviewResult.rows?.[0];
    const municipalityStats = Array.isArray(municipalityResult) ? municipalityResult[0] : municipalityResult.rows?.[0];
    const standingDistribution = Array.isArray(standingResult) ? standingResult : standingResult.rows || [];

    // Check if we have valid data
    if (!overview) {
      throw new Error('No ward audit overview data found');
    }
    if (!municipalityStats) {
      throw new Error('No municipality statistics data found');
    }

    res.json({
      success: true,
      message: 'Ward membership audit overview retrieved successfully',
      data: {
        audit_overview: {
          // Ward statistics
          total_wards: parseInt(overview.total_wards),
          good_standing_wards: parseInt(overview.good_standing_wards),
          acceptable_standing_wards: parseInt(overview.acceptable_standing_wards),
          needs_improvement_wards: parseInt(overview.needs_improvement_wards),
          avg_active_per_ward: parseFloat(overview.avg_active_members_per_ward),
          total_active_members: parseInt(overview.total_active_members),
          total_all_members: parseInt(overview.total_all_members),
          overall_compliance_percentage: parseFloat(overview.overall_compliance_percentage),

          // Municipality statistics
          total_municipalities: parseInt(municipalityStats.total_municipalities),
          performing_municipalities: parseInt(municipalityStats.performing_municipalities),
          underperforming_municipalities: parseInt(municipalityStats.underperforming_municipalities),
          municipal_compliance_percentage: parseFloat(municipalityStats.avg_municipality_compliance),

          // Standing distribution
          standing_distribution: standingDistribution.map((row: any) => ({
            ward_standing: row.ward_standing,
            standing_level: parseInt(row.standing_level),
            ward_count: parseInt(row.ward_count),
            percentage: parseFloat(row.percentage)
          })),

          // Top performers
          top_performing_municipalities: (Array.isArray(topMunicipalities) ? topMunicipalities : topMunicipalities.rows || []).map((row: any) => ({
            municipality_name: row.municipality_name,
            compliance_percentage: parseFloat(row.compliance_percentage),
            total_wards: parseInt(row.total_wards),
            compliant_wards: parseInt(row.compliant_wards),
            total_active_members: parseInt(row.total_active_members)
          })),

          // Needs attention
          municipalities_needing_attention: (Array.isArray(needsAttention) ? needsAttention : needsAttention.rows || []).map((row: any) => ({
            municipality_name: row.municipality_name,
            compliance_percentage: parseFloat(row.compliance_percentage),
            total_wards: parseInt(row.total_wards),
            needs_improvement_wards: parseInt(row.needs_improvement_wards),
            wards_needed_compliance: parseInt(row.wards_needed_compliance)
          }))
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching ward membership audit overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ward membership audit overview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// =====================================================
// GET /api/v1/audit/ward-membership/wards
// =====================================================
// Get paginated ward audit data with filtering and sorting

router.get('/wards',
  authenticate,
  requirePermission('audit.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      standing: Joi.string().valid('Good Standing', 'Acceptable Standing', 'Needs Improvement').optional(),
      municipality_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(), // Support both naming conventions
      district_code: Joi.string().optional(), // Add missing district_code parameter
      province_code: Joi.string().optional(),
      sort_by: Joi.string().valid('ward_name', 'active_members', 'standing_level', 'target_achievement_percentage').default('active_members'),
      sort_order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        standing,
        municipality_code,
        municipal_code, // Support both naming conventions
        district_code,
        province_code,
        sort_by = 'active_members',
        sort_order = 'desc',
        search
      } = req.query;

      // Use the correct municipality code (support both naming conventions)
      const municipalityCode = municipality_code || municipal_code;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      // Get geographic filter from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      const provinceCode = geographicContext?.province_code;
      const municipalCode = geographicContext?.municipal_code;



      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      // Apply geographic filtering from middleware (overrides query params)
      if (municipalCode) {
        // Municipality admin - filter to specific municipality
        whereConditions.push(`municipality_code = ?`);
        queryParams.push(municipalCode);
      } else if (provinceCode) {
        // Province admin - filter to specific province
        whereConditions.push(`province_code = ?`);
        queryParams.push(provinceCode);
      }

      if (standing && standing !== 'all') {
        whereConditions.push(`ward_standing COLLATE utf8mb4_unicode_ci = ?`);
        queryParams.push(standing);
      }

      // Apply province filtering from query params if not already filtered by middleware
      if (!municipalCode && !provinceCode && province_code && province_code !== 'all') {
        whereConditions.push(`province_code = ?`);
        queryParams.push(province_code);
      }

      // Only apply municipality filtering from query params if not already filtered by middleware
      if (!municipalCode && municipality_code && municipality_code !== 'all') {
        whereConditions.push(`municipality_code = ?`);
        queryParams.push(municipality_code);
      }

      if (search) {
        whereConditions.push(`(ward_name LIKE ? OR municipality_name LIKE ?)`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const validSortColumns: Record<string, string> = {
        'ward_name': 'ward_name',
        'active_members': 'active_members',
        'standing_level': 'standing_level',
        'target_achievement_percentage': 'target_achievement_percentage'
      };

      const sortColumn = validSortColumns[sort_by as string] || 'active_members';
      const sortOrder = (sort_order as string).toUpperCase();
      const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM vw_ward_membership_audit
        ${whereClause}
      `;

      // Get paginated data
      const dataQuery = `
        SELECT *
        FROM vw_ward_membership_audit
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const countParams = [...queryParams];
      const dataParams = [...queryParams, limitNum, offset];

      const [countResult, dataResult] = await Promise.all([
        executeQuery(countQuery, countParams),
        executeQuery(dataQuery, dataParams)
      ]);

      const totalRecords = parseInt(countResult[0].total_count);
      const totalPages = Math.ceil(totalRecords / limitNum);

      res.json({
        success: true,
        message: 'Ward audit data retrieved successfully',
        data: {
          wards: dataResult.map((row: any) => ({
            ward_code: row.ward_code,
            ward_name: row.ward_name,
            municipality_code: row.municipality_code,
            municipality_name: row.municipality_name,
            district_name: row.district_name,
            province_name: row.province_name,
            active_members: parseInt(row.active_members),
            expired_members: parseInt(row.expired_members),
            inactive_members: parseInt(row.inactive_members),
            total_members: parseInt(row.total_members),
            ward_standing: row.ward_standing,
            standing_level: parseInt(row.standing_level),
            active_percentage: parseFloat(row.active_percentage),
            target_achievement_percentage: parseFloat(row.target_achievement_percentage),
            members_needed_next_level: parseInt(row.members_needed_next_level),
            last_updated: row.last_updated
          })),
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_records: totalRecords,
            records_per_page: limitNum,
            has_next_page: pageNum < totalPages,
            has_previous_page: pageNum > 1
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching ward audit data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ward audit data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/municipalities
// =====================================================
// Get municipality performance with ward compliance percentages

router.get('/municipalities',
  authenticate,
  requirePermission('audit.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      performance: Joi.string().valid('Performing Municipality', 'Underperforming Municipality').optional(),
      province_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(), // Support both naming conventions
      sort_by: Joi.string().valid('municipality_name', 'compliance_percentage', 'total_active_members', 'performance_level').default('compliance_percentage'),
      sort_order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        performance,
        province_code,
        sort_by = 'compliance_percentage',
        sort_order = 'desc',
        search
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      // Get geographic filter from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      const provinceCode = geographicContext?.province_code;
      const municipalCode = geographicContext?.municipal_code;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      // Apply geographic filtering from middleware (overrides query params)
      if (municipalCode) {
        // Municipality admin - filter to specific municipality
        whereConditions.push(`municipality_code = ?`);
        queryParams.push(municipalCode);
      } else if (provinceCode) {
        // Province admin - filter to specific province
        whereConditions.push(`province_code = ?`);
        queryParams.push(provinceCode);
      }

      // Apply province filtering from query params if not already filtered by middleware
      if (!municipalCode && !provinceCode && province_code && province_code !== 'all') {
        whereConditions.push(`province_code = ?`);
        queryParams.push(province_code);
      }

      if (performance && performance !== 'all') {
        whereConditions.push(`municipality_performance COLLATE utf8mb4_unicode_ci = ?`);
        queryParams.push(performance);
      }

      if (search) {
        whereConditions.push(`(municipality_name LIKE ? OR district_name LIKE ?)`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const validSortColumns: Record<string, string> = {
        'municipality_name': 'municipality_name',
        'compliance_percentage': 'compliance_percentage',
        'total_active_members': 'total_active_members',
        'performance_level': 'performance_level'
      };

      const sortColumn = validSortColumns[sort_by as string] || 'compliance_percentage';
      const sortOrder = (sort_order as string).toUpperCase();
      const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM vw_municipality_ward_performance
        ${whereClause}
      `;

      // Get paginated data
      const dataQuery = `
        SELECT *
        FROM vw_municipality_ward_performance
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const countParams = [...queryParams];
      const dataParams = [...queryParams, limitNum, offset];

      const [countResult, dataResult] = await Promise.all([
        executeQuery(countQuery, countParams),
        executeQuery(dataQuery, dataParams)
      ]);

      const totalRecords = parseInt(countResult[0].total_count);
      const totalPages = Math.ceil(totalRecords / limitNum);

      res.json({
        success: true,
        message: 'Municipality performance data retrieved successfully',
        data: {
          municipalities: dataResult.map((row: any) => ({
            municipality_code: row.municipality_code,
            municipality_name: row.municipality_name,
            district_name: row.district_name,
            province_name: row.province_name,
            total_wards: parseInt(row.total_wards),
            good_standing_wards: parseInt(row.good_standing_wards),
            acceptable_standing_wards: parseInt(row.acceptable_standing_wards),
            needs_improvement_wards: parseInt(row.needs_improvement_wards),
            compliant_wards: parseInt(row.compliant_wards),
            compliance_percentage: parseFloat(row.compliance_percentage),
            municipality_performance: row.municipality_performance,
            performance_level: parseInt(row.performance_level),
            total_active_members: parseInt(row.total_active_members),
            total_all_members: parseInt(row.total_all_members),
            avg_active_per_ward: parseFloat(row.avg_active_per_ward),
            wards_needed_compliance: parseInt(row.wards_needed_compliance),
            last_updated: row.last_updated
          })),
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_records: totalRecords,
            records_per_page: limitNum,
            has_next_page: pageNum < totalPages,
            has_previous_page: pageNum > 1
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching municipality performance data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch municipality performance data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/trends
// =====================================================
// Get historical membership trends for wards and municipalities

router.get('/trends',
  authenticate,
  requirePermission('audit.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      ward_code: Joi.string().optional(),
      municipality_code: Joi.string().optional(),
      months: Joi.number().integer().min(1).max(24).default(12),
      trend_type: Joi.string().valid('growth', 'decline', 'stable').optional(),
      province_code: Joi.string().optional() // Allow province_code for filtering
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { ward_code, municipality_code, months = 12, trend_type } = req.query;

      const monthsNum = Number(months);

      // Get geographic filter from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      const provinceCode = geographicContext?.province_code;
      const municipalCode = geographicContext?.municipal_code;

      // Build WHERE clause
      const whereConditions: string[] = [`trend_month >= DATE_SUB(CURDATE(), INTERVAL ${monthsNum} MONTH)`];
      const queryParams: any[] = [];

      // Apply geographic filtering from middleware (overrides query params)
      if (municipalCode) {
        // Municipality admin - filter to specific municipality
        whereConditions.push(`municipality_code = ?`);
        queryParams.push(municipalCode);
      } else if (provinceCode) {
        // Province admin - filter to specific province
        whereConditions.push(`province_code = ?`);
        queryParams.push(provinceCode);
      }

      if (ward_code && ward_code !== 'all') {
        whereConditions.push(`ward_code = ?`);
        queryParams.push(ward_code);
      }

      // Only apply municipality filtering from query params if not already filtered by middleware
      if (!municipalCode && municipality_code && municipality_code !== 'all') {
        whereConditions.push(`municipality_code = ?`);
        queryParams.push(municipality_code);
      }

      if (trend_type && trend_type !== 'all') {
        const trendMap: Record<string, string> = {
          'growth': 'Growing',
          'decline': 'Declining',
          'stable': 'Stable'
        };
        whereConditions.push(`growth_trend COLLATE utf8mb4_unicode_ci = ?`);
        queryParams.push(trendMap[trend_type as string]);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // TODO: Implement trends data when vw_ward_membership_trends view is available
      // For now, return empty data with proper structure
      console.log('⚠️ Ward membership trends view not implemented yet, returning empty data');

      const trendsResult: any[] = [];
      const summaryResult = [{
        wards_tracked: 0,
        total_data_points: 0,
        avg_monthly_growth: 0,
        avg_yearly_growth: 0,
        growing_periods: 0,
        declining_periods: 0,
        stable_periods: 0
      }];

      const summary = summaryResult[0];

      res.json({
        success: true,
        message: 'Ward membership trends retrieved successfully',
        data: {
          trends: trendsResult.map((row: any) => ({
            ward_code: row.ward_code,
            ward_name: row.ward_name,
            municipality_code: row.municipality_code,
            municipality_name: row.municipality_name,
            trend_month: row.trend_month,
            active_members: parseInt(row.active_members),
            total_members: parseInt(row.total_members),
            month_over_month_growth: row.month_over_month_growth ? parseFloat(row.month_over_month_growth) : null,
            year_over_year_growth: row.year_over_year_growth ? parseFloat(row.year_over_year_growth) : null,
            growth_trend: row.growth_trend,
            monthly_standing: row.monthly_standing
          })),
          summary: {
            wards_tracked: summary.wards_tracked,
            total_data_points: summary.total_data_points,
            avg_monthly_growth: summary.avg_monthly_growth,
            avg_yearly_growth: summary.avg_yearly_growth,
            growing_periods: summary.growing_periods,
            declining_periods: summary.declining_periods,
            stable_periods: summary.stable_periods
          },
          filters: {
            months_analyzed: monthsNum,
            ward_code: (ward_code as string) || null,
            municipality_code: (municipality_code as string) || null,
            trend_type: (trend_type as string) || null
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching ward membership trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ward membership trends',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/ward/:wardCode/details
// =====================================================
// Get detailed information for a specific ward

router.get('/ward/:wardCode/details',
  validate({
    params: Joi.object({
      wardCode: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { wardCode } = req.params;

      // Get ward basic information
      const wardInfoQuery = `
        SELECT
          ward_code,
          ward_name,
          municipality_code,
          municipality_name,
          district_name,
          province_name,
          active_members,
          expired_members,
          inactive_members,
          total_members,
          ward_standing,
          standing_level,
          active_percentage,
          target_achievement_percentage,
          members_needed_next_level,
          last_updated
        FROM vw_ward_membership_audit
        WHERE ward_code = ?
      `;

      // TODO: Get ward historical trends when vw_ward_membership_trends view is available
      // For now, return empty trends data
      const wardTrendsQuery = `SELECT NULL as trend_month LIMIT 0`;

      // Get comparison with other wards in same municipality
      const municipalityWardsQuery = `
        SELECT
          ward_code,
          ward_name,
          active_members,
          ward_standing,
          target_achievement_percentage
        FROM vw_ward_membership_audit
        WHERE municipality_code = (
          SELECT municipality_code FROM vw_ward_membership_audit WHERE ward_code = ?
        )
        AND ward_code != ?
        ORDER BY active_members DESC
        LIMIT 10
      `;

      const [wardInfo, wardTrends, municipalityWards] = await Promise.all([
        executeQuery(wardInfoQuery, [wardCode]),
        executeQuery(wardTrendsQuery, []), // No parameters needed for empty trends query
        executeQuery(municipalityWardsQuery, [wardCode, wardCode])
      ]);

      const wardData = Array.isArray(wardInfo) ? wardInfo[0] : wardInfo.rows?.[0];
      const trendsData = Array.isArray(wardTrends) ? wardTrends : wardTrends.rows || [];
      const comparisonData = Array.isArray(municipalityWards) ? municipalityWards : municipalityWards.rows || [];

      if (!wardData) {
        return res.status(404).json({
          success: false,
          message: 'Ward not found'
        });
      }

      // Generate recommendations based on ward performance
      const recommendations = generateWardRecommendations(wardData);

      return res.json({
        success: true,
        message: 'Ward details retrieved successfully',
        data: {
          ward_info: {
            ward_code: wardData.ward_code,
            ward_name: wardData.ward_name,
            municipality_code: wardData.municipality_code,
            municipality_name: wardData.municipality_name,
            district_name: wardData.district_name,
            province_name: wardData.province_name,
            active_members: parseInt(wardData.active_members),
            expired_members: parseInt(wardData.expired_members),
            inactive_members: parseInt(wardData.inactive_members),
            total_members: parseInt(wardData.total_members),
            ward_standing: wardData.ward_standing,
            standing_level: parseInt(wardData.standing_level),
            active_percentage: parseFloat(wardData.active_percentage),
            target_achievement_percentage: parseFloat(wardData.target_achievement_percentage),
            members_needed_next_level: parseInt(wardData.members_needed_next_level),
            last_updated: wardData.last_updated
          },
          historical_trends: trendsData.map((row: any) => ({
            trend_month: row.trend_month,
            active_members: parseInt(row.active_members),
            total_members: parseInt(row.total_members),
            growth_trend: row.growth_trend,
            monthly_standing: row.monthly_standing
          })),
          municipality_comparison: comparisonData.map((row: any) => ({
            ward_code: row.ward_code,
            ward_name: row.ward_name,
            active_members: parseInt(row.active_members),
            ward_standing: row.ward_standing,
            target_achievement_percentage: parseFloat(row.target_achievement_percentage)
          })),
          recommendations
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching ward details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ward details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/municipality/:municipalityCode/details
// =====================================================
// Get detailed information for a specific municipality

router.get('/municipality/:municipalityCode/details',
  validate({
    params: Joi.object({
      municipalityCode: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { municipalityCode } = req.params;

      // Get municipality basic information
      const municipalityInfoQuery = `
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
          wards_needed_compliance,
          last_updated
        FROM vw_municipality_ward_performance
        WHERE municipality_code = ?
      `;

      // Get all wards in the municipality
      const municipalityWardsQuery = `
        SELECT
          ward_code,
          ward_name,
          active_members,
          expired_members,
          inactive_members,
          total_members,
          ward_standing,
          standing_level,
          active_percentage,
          target_achievement_percentage,
          members_needed_next_level
        FROM vw_ward_membership_audit
        WHERE municipality_code = ?
        ORDER BY active_members DESC
      `;

      // Get municipality trends (aggregated from ward trends)
      const municipalityTrendsQuery = `
        SELECT
          trend_month,
          SUM(active_members) as total_active_members,
          SUM(total_members) as total_all_members,
          COUNT(*) as wards_tracked
        FROM vw_ward_membership_trends
        WHERE municipality_code = ?
        GROUP BY trend_month
        ORDER BY trend_month DESC
        LIMIT 12
      `;

      const [municipalityInfo, municipalityWards, municipalityTrends] = await Promise.all([
        executeQuery(municipalityInfoQuery, [municipalityCode]),
        executeQuery(municipalityWardsQuery, [municipalityCode]),
        executeQuery(municipalityTrendsQuery, [municipalityCode])
      ]);

      const municipalityData = Array.isArray(municipalityInfo) ? municipalityInfo[0] : municipalityInfo.rows?.[0];
      const wardsData = Array.isArray(municipalityWards) ? municipalityWards : municipalityWards.rows || [];
      const trendsData = Array.isArray(municipalityTrends) ? municipalityTrends : municipalityTrends.rows || [];

      if (!municipalityData) {
        return res.status(404).json({
          success: false,
          message: 'Municipality not found'
        });
      }

      // Generate recommendations based on municipality performance
      const recommendations = generateMunicipalityRecommendations(municipalityData, wardsData);

      return res.json({
        success: true,
        message: 'Municipality details retrieved successfully',
        data: {
          municipality_info: {
            municipality_code: municipalityData.municipality_code,
            municipality_name: municipalityData.municipality_name,
            district_name: municipalityData.district_name,
            province_name: municipalityData.province_name,
            total_wards: parseInt(municipalityData.total_wards),
            good_standing_wards: parseInt(municipalityData.good_standing_wards),
            acceptable_standing_wards: parseInt(municipalityData.acceptable_standing_wards),
            needs_improvement_wards: parseInt(municipalityData.needs_improvement_wards),
            compliant_wards: parseInt(municipalityData.compliant_wards),
            compliance_percentage: parseFloat(municipalityData.compliance_percentage),
            municipality_performance: municipalityData.municipality_performance,
            performance_level: parseInt(municipalityData.performance_level),
            total_active_members: parseInt(municipalityData.total_active_members),
            total_all_members: parseInt(municipalityData.total_all_members),
            avg_active_per_ward: parseFloat(municipalityData.avg_active_per_ward),
            wards_needed_compliance: parseInt(municipalityData.wards_needed_compliance),
            last_updated: municipalityData.last_updated
          },
          wards_breakdown: wardsData.map((row: any) => ({
            ward_code: row.ward_code,
            ward_name: row.ward_name,
            active_members: parseInt(row.active_members),
            expired_members: parseInt(row.expired_members),
            inactive_members: parseInt(row.inactive_members),
            total_members: parseInt(row.total_members),
            ward_standing: row.ward_standing,
            standing_level: parseInt(row.standing_level),
            active_percentage: parseFloat(row.active_percentage),
            target_achievement_percentage: parseFloat(row.target_achievement_percentage),
            members_needed_next_level: parseInt(row.members_needed_next_level)
          })),
          historical_trends: trendsData.map((row: any) => ({
            trend_month: row.trend_month,
            total_active_members: parseInt(row.total_active_members),
            total_all_members: parseInt(row.total_all_members),
            wards_tracked: parseInt(row.wards_tracked)
          })),
          recommendations
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching municipality details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch municipality details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// Helper function to generate ward recommendations
function generateWardRecommendations(wardData: any): string[] {
  const recommendations: string[] = [];
  const activeMembers = parseInt(wardData.active_members);
  const standingLevel = parseInt(wardData.standing_level);
  const targetAchievement = parseFloat(wardData.target_achievement_percentage);

  if (standingLevel === 3) { // Needs Improvement
    recommendations.push('Priority: Immediate action required to improve membership numbers');
    recommendations.push(`Target: Recruit ${wardData.members_needed_next_level} new active members to reach Acceptable Standing`);
    recommendations.push('Strategy: Focus on community outreach and member retention programs');
  } else if (standingLevel === 2) { // Acceptable Standing
    recommendations.push('Goal: Work towards Good Standing status');
    recommendations.push(`Target: Recruit ${wardData.members_needed_next_level} additional members for Good Standing`);
    recommendations.push('Strategy: Expand membership drives and improve member engagement');
  } else { // Good Standing
    recommendations.push('Status: Maintain current excellent performance');
    recommendations.push('Strategy: Focus on member retention and community leadership');
  }

  if (targetAchievement < 50) {
    recommendations.push('Alert: Significantly below target - consider intensive intervention');
  }

  recommendations.push('Action: Regular membership audits and progress tracking recommended');

  return recommendations;
}

// Helper function to generate municipality recommendations
function generateMunicipalityRecommendations(municipalityData: any, wardsData: any[]): string[] {
  const recommendations: string[] = [];
  const compliancePercentage = parseFloat(municipalityData.compliance_percentage);
  const needsImprovementWards = parseInt(municipalityData.needs_improvement_wards);
  const performanceLevel = parseInt(municipalityData.performance_level);

  if (performanceLevel === 2) { // Underperforming
    recommendations.push('Priority: Municipality requires immediate attention');
    recommendations.push(`Target: Improve ${municipalityData.wards_needed_compliance} wards to reach 70% compliance`);
    recommendations.push('Strategy: Focus resources on underperforming wards');
  } else {
    recommendations.push('Status: Municipality is performing well');
    recommendations.push('Strategy: Maintain current performance and support struggling wards');
  }

  if (needsImprovementWards > 0) {
    const worstWards = wardsData
      .filter(ward => ward.standing_level === 3)
      .slice(0, 3)
      .map(ward => ward.ward_name);

    if (worstWards.length > 0) {
      recommendations.push(`Focus Areas: Priority wards needing attention - ${worstWards.join(', ')}`);
    }
  }

  recommendations.push('Action: Implement municipality-wide membership development program');
  recommendations.push('Monitoring: Monthly progress reviews with ward leadership recommended');

  return recommendations;
}

// =====================================================
// GET /api/v1/audit/ward-membership/export
// =====================================================
// Export ward audit or municipality performance data

router.get('/export',
  authenticate,
  requirePermission('audit.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      format: Joi.string().valid('pdf', 'excel', 'csv').default('pdf'),
      type: Joi.string().valid('ward', 'municipality').optional(),
      // Ward filters
      standing: Joi.string().valid('Good Standing', 'Acceptable Standing', 'Needs Improvement').optional(),
      municipality_code: Joi.string().optional(),
      municipal_code: Joi.string().optional(),
      district_code: Joi.string().optional(),
      province_code: Joi.string().optional(),
      search: Joi.string().optional(),
      // Municipality filters
      performance: Joi.string().valid('Performing Municipality', 'Underperforming Municipality').optional(),
      // Pagination (for limiting export size)
      limit: Joi.number().integer().min(1).max(10000).default(1000)
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const {
        format = 'pdf',
        type,
        standing,
        municipality_code,
        municipal_code,
        district_code,
        province_code,
        search,
        performance,
        limit = 1000
      } = req.query;

      // Get geographic filter from middleware
      const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
      const middlewareProvinceCode = geographicContext?.province_code;
      const middlewareMunicipalCode = geographicContext?.municipal_code;

      // Determine export type based on query parameters or default to ward
      const exportType = type || (performance ? 'municipality' : 'ward');

      if (exportType === 'ward') {
        // Export ward audit data
        const whereConditions: string[] = [];
        const queryParams: any[] = [];

        // Apply geographic filtering from middleware (overrides query params)
        if (middlewareMunicipalCode) {
          whereConditions.push(`municipality_code = ?`);
          queryParams.push(middlewareMunicipalCode);
        } else if (middlewareProvinceCode) {
          whereConditions.push(`province_code = ?`);
          queryParams.push(middlewareProvinceCode);
        }

        // Apply province filtering from query params if not already filtered by middleware
        if (!middlewareMunicipalCode && !middlewareProvinceCode && province_code && province_code !== 'all') {
          whereConditions.push(`province_code = ?`);
          queryParams.push(province_code);
        }

        // Apply municipality filtering from query params if not already filtered by middleware
        const municipalityCode = municipality_code || municipal_code;
        if (!middlewareMunicipalCode && municipalityCode && municipalityCode !== 'all') {
          whereConditions.push(`municipality_code = ?`);
          queryParams.push(municipalityCode);
        }

        if (standing && standing !== 'all') {
          whereConditions.push(`ward_standing COLLATE utf8mb4_unicode_ci = ?`);
          queryParams.push(standing);
        }

        if (search) {
          whereConditions.push(`(ward_name LIKE ? OR municipality_name LIKE ?)`);
          queryParams.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
          SELECT
            ward_code,
            ward_name,
            municipality_code,
            municipality_name,
            district_name,
            province_name,
            active_members,
            expired_members,
            inactive_members,
            total_members,
            ward_standing,
            standing_level,
            active_percentage,
            target_achievement_percentage,
            members_needed_next_level,
            last_updated
          FROM vw_ward_membership_audit
          ${whereClause}
          ORDER BY active_members DESC
          LIMIT ?
        `;

        queryParams.push(limit);
        const wards = await executeQuery(query, queryParams);

        if (format === 'pdf') {
          // Generate PDF using PDFExportService
          const pdfBuffer = await PDFExportService.exportWardAuditToPDF(wards, {
            filters: {
              standing,
              municipality_code: municipalityCode,
              province_code,
              search
            },
            includeCharts: false,
            includeDetails: true
          });

          // Set response headers for PDF download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="ward-audit-report-${new Date().toISOString().split('T')[0]}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);

          return res.send(pdfBuffer);
        } else {
          // For Excel/CSV formats, return 501 for now
          return res.status(501).json({
            success: false,
            message: `Ward audit export in ${format} format is not yet implemented`,
            data: {
              format: format,
              type: 'ward',
              total_records: wards.length,
              note: 'PDF export is available. Excel/CSV formats will be available in a future update.'
            }
          });
        }

      } else if (exportType === 'municipality') {
        // Export municipality performance data
        const whereConditions: string[] = [];
        const queryParams: any[] = [];

        // Apply geographic filtering from middleware (overrides query params)
        if (middlewareMunicipalCode) {
          whereConditions.push(`municipality_code = ?`);
          queryParams.push(middlewareMunicipalCode);
        } else if (middlewareProvinceCode) {
          whereConditions.push(`province_code = ?`);
          queryParams.push(middlewareProvinceCode);
        }

        // Apply province filtering from query params if not already filtered by middleware
        if (!middlewareMunicipalCode && !middlewareProvinceCode && province_code && province_code !== 'all') {
          whereConditions.push(`province_code = ?`);
          queryParams.push(province_code);
        }

        if (performance && performance !== 'all') {
          whereConditions.push(`municipality_performance COLLATE utf8mb4_unicode_ci = ?`);
          queryParams.push(performance);
        }

        if (search) {
          whereConditions.push(`(municipality_name LIKE ? OR district_name LIKE ?)`);
          queryParams.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
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
            wards_needed_compliance,
            last_updated
          FROM vw_municipality_ward_performance
          ${whereClause}
          ORDER BY compliance_percentage DESC
          LIMIT ?
        `;

        queryParams.push(limit);
        const municipalities = await executeQuery(query, queryParams);

        if (format === 'excel' || format === 'pdf') {
          // Generate PDF using PDFExportService (Excel will use same PDF for now)
          const pdfBuffer = await PDFExportService.exportMunicipalityPerformanceToPDF(municipalities, {
            filters: {
              performance,
              province_code,
              search
            },
            includeCharts: false,
            includeDetails: true
          });

          // Set response headers for PDF download
          const fileExtension = format === 'excel' ? 'pdf' : 'pdf'; // Use PDF for both for now
          const fileName = `municipality-performance-report-${new Date().toISOString().split('T')[0]}.${fileExtension}`;

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Length', pdfBuffer.length);

          return res.send(pdfBuffer);
        } else {
          // For CSV format, return 501 for now
          return res.status(501).json({
            success: false,
            message: `Municipality performance export in ${format} format is not yet implemented`,
            data: {
              format: format,
              type: 'municipality',
              total_records: municipalities.length,
              note: 'PDF export is available. CSV format will be available in a future update.'
            }
          });
        }
      }

      // This should never be reached, but TypeScript requires a return
      return res.status(400).json({
        success: false,
        message: 'Invalid export type specified',
        error: 'Export type must be either "ward" or "municipality"'
      });

    } catch (error: any) {
      console.error('Error exporting audit data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export audit data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/ward/:wardCode/export
// =====================================================
// Export ward details report

router.get('/ward/:wardCode/export',
  validate({
    params: Joi.object({
      wardCode: Joi.string().required()
    }),
    query: Joi.object({
      format: Joi.string().valid('pdf', 'excel').default('pdf')
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { wardCode } = req.params;
      const { format } = req.query;

      // For now, return a simple response indicating the feature is not yet implemented
      return res.status(501).json({
        success: false,
        message: 'Ward detail export feature is not yet implemented',
        data: {
          ward_code: wardCode,
          format: format,
          note: 'This feature will be available in a future update'
        }
      });
    } catch (error: any) {
      console.error('Error exporting ward details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export ward details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

// =====================================================
// GET /api/v1/audit/ward-membership/municipality/:municipalityCode/export
// =====================================================
// Export municipality details report

router.get('/municipality/:municipalityCode/export',
  validate({
    params: Joi.object({
      municipalityCode: Joi.string().required()
    }),
    query: Joi.object({
      format: Joi.string().valid('pdf', 'excel').default('pdf')
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { municipalityCode } = req.params;
      const { format } = req.query;

      // For now, return a simple response indicating the feature is not yet implemented
      return res.status(501).json({
        success: false,
        message: 'Municipality detail export feature is not yet implemented',
        data: {
          municipality_code: municipalityCode,
          format: format,
          note: 'This feature will be available in a future update'
        }
      });
    } catch (error: any) {
      console.error('Error exporting municipality details:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export municipality details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  })
);

export default router;
