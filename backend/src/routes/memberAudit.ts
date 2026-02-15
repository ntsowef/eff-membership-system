import { Router, Request, Response } from 'express';
import { executeQuery } from '../config/database-hybrid';

const router = Router();

// Simple test route to verify router is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Member Audit routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Basic overview route - now with real data
router.get('/overview', async (req: Request, res: Response) => {
  try {
    // Get overview from views
    const overviewQuery = `
      SELECT
        COUNT(*) as total_municipalities,
        SUM(CASE WHEN compliance_percentage >= 70 THEN 1 ELSE 0 END) as municipalities_compliant,
        SUM(total_wards) as total_wards,
        SUM(compliant_wards) as wards_meeting_threshold,
        SUM(total_active_members) as active_members,
        SUM(total_all_members) as total_members,
        ROUND(AVG(compliance_percentage), 2) as avg_compliance
      FROM vw_municipality_ward_performance
    `;
    const overview = await executeQuery(overviewQuery);
    const data = overview[0] || {};

    res.json({
      success: true,
      message: 'Audit overview retrieved successfully',
      overview: {
        total_members: parseInt(data.total_members) || 0,
        active_members: parseInt(data.active_members) || 0,
        inactive_members: (parseInt(data.total_members) || 0) - (parseInt(data.active_members) || 0),
        registered_voters: 0,
        unregistered_voters: 0,
        incorrect_ward_assignments: 0,
        wards_meeting_threshold: parseInt(data.wards_meeting_threshold) || 0,
        total_wards: parseInt(data.total_wards) || 0,
        municipalities_compliant: parseInt(data.municipalities_compliant) || 0,
        total_municipalities: parseInt(data.total_municipalities) || 0,
        critical_issues: 0,
        high_issues: 0,
        medium_issues: 0,
        low_issues: 0,
        avg_compliance: parseFloat(data.avg_compliance) || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching audit overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit overview',
      error: error.message
    });
  }
});

// Basic members route with mock data
router.get('/members', (req, res) => {
  res.json({
    success: true,
    message: 'Member audit results retrieved successfully',
    members: [],
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    summary: {
      total_issues: 0,
      severity_breakdown: {},
      filters: {}
    }
  });
});

// Basic wards route with mock data
router.get('/wards', (req, res) => {
  res.json({
    success: true,
    message: 'Ward audit results retrieved successfully',
    wards: [],
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    summary: {
      total_wards: 0,
      wards_meeting_threshold: 0,
      wards_with_issues: 0,
      average_membership: 0,
      threshold_compliance_rate: 0
    }
  });
});

// Municipalities route - now with real data from vw_municipality_ward_performance
router.get('/municipalities', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const offset = (page - 1) * limit;
    const provinceCode = req.query.province_code as string;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (provinceCode) {
      queryParams.push(provinceCode);
      whereConditions.push(`province_code = $${queryParams.length}`);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vw_municipality_ward_performance
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams);
    const total = parseInt(countResult[0]?.total) || 0;

    // Get paginated data
    const dataQuery = `
      SELECT
        municipality_code,
        municipality_name,
        province_code,
        province_name,
        total_wards,
        compliant_wards as wards_meeting_threshold,
        compliance_percentage as threshold_compliance_percentage,
        total_all_members as total_members,
        total_active_members,
        good_standing_wards as wards_over_101_members,
        needs_improvement_wards as high_priority_issues,
        last_updated as last_audit_date
      FROM vw_municipality_ward_performance
      ${whereClause}
      ORDER BY compliance_percentage DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataParams = [...queryParams, limit, offset];
    const municipalities = await executeQuery(dataQuery, dataParams);

    // Get summary
    const summaryQuery = `
      SELECT
        COUNT(*) as total_municipalities,
        SUM(CASE WHEN compliance_percentage >= 70 THEN 1 ELSE 0 END) as municipalities_meeting_70_percent,
        SUM(CASE WHEN needs_improvement_wards > 5 THEN 1 ELSE 0 END) as municipalities_with_high_issues,
        ROUND(AVG(compliance_percentage), 2) as average_compliance_rate,
        SUM(total_all_members) as total_members_audited
      FROM vw_municipality_ward_performance
      ${whereClause}
    `;
    const summaryResult = await executeQuery(summaryQuery, queryParams);
    const summary = summaryResult[0] || {};

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Municipality audit results retrieved successfully',
      municipalities: municipalities.map((m: any) => ({
        ...m,
        total_wards: parseInt(m.total_wards) || 0,
        wards_meeting_threshold: parseInt(m.wards_meeting_threshold) || 0,
        threshold_compliance_percentage: parseFloat(m.threshold_compliance_percentage) || 0,
        total_members: parseInt(m.total_members) || 0,
        total_registered_voters: 0,
        wards_over_101_members: parseInt(m.wards_over_101_members) || 0,
        high_priority_issues: parseInt(m.high_priority_issues) || 0
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      summary: {
        total_municipalities: parseInt(summary.total_municipalities) || 0,
        municipalities_meeting_70_percent: parseInt(summary.municipalities_meeting_70_percent) || 0,
        municipalities_with_high_issues: parseInt(summary.municipalities_with_high_issues) || 0,
        average_compliance_rate: parseFloat(summary.average_compliance_rate) || 0,
        total_members_audited: parseInt(summary.total_members_audited) || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching municipality audit data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch municipality audit data',
      error: error.message
    });
  }
});

export default router;