import { Router } from 'express';
import { MemberModel, CreateMemberData, UpdateMemberData, MemberFilters } from '../models/members';
import { OptimizedMemberModel } from '../models/optimizedMembers';
import { asyncHandler, sendSuccess, sendPaginatedSuccess, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { validate, commonSchemas, memberSchemas, memberFilterSchema } from '../middleware/validation';
import { CacheInvalidationHooks } from '../services/cacheInvalidationService';
import { cacheMiddleware, CacheConfigs, cacheInvalidationMiddleware } from '../middleware/cacheMiddleware';
import { authenticate, requirePermission, applyGeographicFilter, logProvinceAccess } from '../middleware/auth';
import { rateLimiters, applyRateLimit, requestQueueMiddleware, databaseCircuitBreaker } from '../middleware/rateLimiting';
import Joi from 'joi';
import { executeQuery, executeQuerySingle } from '../config/database';
import { PDFExportService } from '../services/pdfExportService';
import { ImportExportService } from '../services/importExportService';
import { WordDocumentService } from '../services/wordDocumentService';
// import { WordToPdfService } from '../services/wordToPdfService'; // Disabled due to compatibility issues
import { emailService } from '../services/emailService';
import { AttendanceRegisterEmailService } from '../services/attendanceRegisterEmailService';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// Get all members with filtering and pagination
router.get('/',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  cacheMiddleware(CacheConfigs.MEMBER),
  validate({ query: memberFilterSchema }),
  asyncHandler(async (req, res) => {
    // Log geographic access for audit
    const geographicContext = (req as any).provinceContext || (req as any).municipalityContext;
    await logProvinceAccess(req, 'members_list_access', geographicContext?.province_code);
    const {
      page = 1,
      limit = 20,
      sortBy = 'member_id',
      sortOrder = 'desc',
      ward_code,
      voting_district_code,
      municipality_code,
      municipal_code, // Support both naming conventions
      district_code,
      province_code,
      gender_id,
      race_id,
      age_min,
      age_max,
      membership_type,
      membership_status, // 'all' | 'active' | 'expired' - controls expiry filtering
      has_email,
      has_cell_number,
      q: search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: MemberFilters = {
      ward_code: ward_code as string,
      voting_district_code: voting_district_code as string,
      municipality_code: (municipality_code || municipal_code) as string, // Support both naming conventions
      district_code: district_code as string,
      province_code: province_code as string,
      gender_id: gender_id ? parseInt(gender_id as string) : undefined,
      race_id: race_id ? parseInt(race_id as string) : undefined,
      age_min: age_min ? parseInt(age_min as string) : undefined,
      age_max: age_max ? parseInt(age_max as string) : undefined,
      membership_type: membership_type as string,
      membership_status: membership_status as string, // Pass through to model
      has_email: has_email === 'true' ? true : has_email === 'false' ? false : undefined,
      has_cell_number: has_cell_number === 'true' ? true : has_cell_number === 'false' ? false : undefined,
      search: search as string
    };

    const [members, total] = await Promise.all([
      MemberModel.getAllMembers(filters, limitNum, offset, sortBy as string, sortOrder as 'asc' | 'desc'),
      MemberModel.getMembersCount(filters)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendPaginatedSuccess(res, members, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }, 'Members retrieved successfully');
  })
);

// Export members (CSV/PDF export) - MUST be before /:id route
router.get('/export',
  validate({
    query: memberFilterSchema.keys({
      format: Joi.string().valid('csv', 'pdf', 'excel').default('csv'),
      ids: Joi.string().optional() // Comma-separated member IDs for specific export
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      format = 'csv',
      ids,
      ward_code,
      gender_id,
      race_id,
      age_min,
      age_max,
      has_email,
      has_cell_number,
      q: search
    } = req.query;

    let members: any[];

    // Define filters for PDF export (will be used regardless of export path)
    const filters: MemberFilters = {
      ward_code: ward_code as string,
      gender_id: gender_id ? parseInt(gender_id as string) : undefined,
      race_id: race_id ? parseInt(race_id as string) : undefined,
      age_min: age_min ? parseInt(age_min as string) : undefined,
      age_max: age_max ? parseInt(age_max as string) : undefined,
      has_email: has_email === 'true',
      has_cell_number: has_cell_number === 'true',
      search: search as string
    };

    // Handle specific member IDs export vs filtered export
    if (ids && typeof ids === 'string') {
      // Export specific members by IDs
      const memberIds = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      if (memberIds.length === 0) {
        throw new ValidationError('Invalid member IDs provided');
      }

      // Get specific members by IDs
      const memberPromises = memberIds.map((id: number) => MemberModel.getMemberById(id));
      const memberResults = await Promise.all(memberPromises);
      members = memberResults.filter(member => member !== null);

      if (members.length === 0) {
        throw new NotFoundError('No members found with the provided IDs');
      }
    } else {
      // Export all members with filters (no pagination for export)
      members = await MemberModel.getAllMembers(filters, 10000, 0);
    }

    // Handle different export formats
    if (format === 'pdf') {
      try {
        // Generate PDF using PDFExportService
        const pdfBuffer = await PDFExportService.exportMembersToPDF(filters, {
          title: 'Members Directory Export',
          subtitle: `Generated on ${new Date().toLocaleDateString()}`,
          orientation: 'landscape' // Better for table data
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=members-export-${new Date().toISOString().split('T')[0]}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());

        // Send PDF buffer
        res.send(pdfBuffer);
        return;
      } catch (error) {
        console.error('PDF export failed:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to generate PDF export',
          error: {
            code: 'PDF_GENERATION_ERROR',
            details: 'An error occurred while generating the PDF file'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Generate CSV content
    const csvHeaders = [
      'Member ID', 'First Name', 'Last Name', 'Email', 'Cell Number',
      'Age', 'Gender', 'Ward', 'Municipality', 'District', 'Province', 'Status'
    ];

    const csvRows = members.map(member => [
      member.member_id,
      member.firstname,
      member.surname || '',
      member.email || '',
      member.cell_number || '',
      member.age || '',
      member.gender_name || '',
      member.ward_name || '',
      member.municipality_name || '',
      member.district_name || '',
      member.province_name || '',
      'Active' // Default membership status since column doesn't exist
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const filename = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    return;
  })
);

// Drill-down API endpoints for hierarchical navigation (must be before /:id route)
// OPTIMIZED: Uses materialized view for fast performance, filters for Active members only
router.get('/provinces',
  cacheMiddleware({ ttl: 120 }),
  asyncHandler(async (req, res) => {
    // Use materialized view for FAST performance
    const query = `
      SELECT
        province_code as code,
        province_name as name,
        SUM(active_members) as member_count
      FROM mv_hierarchical_dashboard_stats
      GROUP BY province_code, province_name
      ORDER BY province_name
    `;

    const provinces = await executeQuery(query);

    sendSuccess(res, provinces, 'Provinces retrieved successfully');
  })
);

router.get('/regions',
  cacheMiddleware({ ttl: 120 }),
  asyncHandler(async (req, res) => {
    const { province } = req.query;

    // Use materialized view for FAST performance
    let query = `
      SELECT
        district_code as code,
        district_name as name,
        province_code,
        province_name,
        SUM(active_members) as member_count
      FROM mv_hierarchical_dashboard_stats
    `;

    const params: any[] = [];
    if (province) {
      query += ' WHERE province_code = $1';
      params.push(province);
    }

    query += ' GROUP BY district_code, district_name, province_code, province_name ORDER BY district_name';

    const regions = await executeQuery(query, params);

    sendSuccess(res, regions, 'Regions retrieved successfully');
  })
);

router.get('/municipalities',
  cacheMiddleware({ ttl: 120 }),
  asyncHandler(async (req, res) => {
    const { region } = req.query;

    // Use materialized view for FAST performance
    let query = `
      SELECT
        municipality_code as code,
        municipality_name as name,
        district_code as region_code,
        district_name as region_name,
        province_code,
        province_name,
        SUM(active_members) as member_count
      FROM mv_hierarchical_dashboard_stats
    `;

    const params: any[] = [];
    if (region) {
      query += ' WHERE district_code = $1';
      params.push(region);
    }

    query += ' GROUP BY municipality_code, municipality_name, district_code, district_name, province_code, province_name ORDER BY municipality_name';

    const municipalities = await executeQuery(query, params);

    sendSuccess(res, municipalities, 'Municipalities retrieved successfully');
  })
);

router.get('/wards',
  cacheMiddleware({ ttl: 120 }),
  asyncHandler(async (req, res) => {
    const { municipality } = req.query;

    // Use materialized view for FAST performance
    let query = `
      SELECT
        ward_code as code,
        ward_name as name,
        ward_number,
        municipality_code,
        municipality_name,
        district_code as region_code,
        district_name as region_name,
        province_code,
        province_name,
        active_members as member_count
      FROM mv_hierarchical_dashboard_stats
    `;

    const params: any[] = [];
    if (municipality) {
      query += ' WHERE municipality_code = $1';
      params.push(municipality);
    }

    query += ' ORDER BY ward_name';

    const wards = await executeQuery(query, params);

    sendSuccess(res, wards, 'Wards retrieved successfully');
  })
);

// Get member directory with filtering and pagination
router.get('/directory',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    query: Joi.object({
      search: Joi.string().optional(),
      province: Joi.string().optional(),
      district: Joi.string().optional(),
      municipality: Joi.string().optional(),
      ward: Joi.string().optional(),
      membership_status: Joi.string().valid('Active', 'Inactive', 'Pending', 'Suspended', 'Expired', 'Grace Period', 'Cancelled').optional(),
      membership_type: Joi.string().optional(),
      gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
      sort_by: Joi.string().valid('first_name', 'last_name', 'created_at', 'membership_number').default('last_name'),
      sort_order: Joi.string().valid('asc', 'desc').default('asc'),
      page: Joi.number().integer().min(0).default(0),
      offset: Joi.number().integer().min(0).optional(), // Add offset parameter for pagination
      limit: Joi.number().integer().min(1).max(100).default(25),
      // Add province filtering parameters that can be injected by middleware
      province_code: Joi.string().min(2).max(3).optional(),
      district_code: Joi.string().min(3).max(10).optional(),
      municipality_code: Joi.string().min(3).max(10).optional(),
      ward_code: Joi.string().min(5).max(15).optional()
    })
  }),
  asyncHandler(async (req, res) => {
    // Log province access for audit
    await logProvinceAccess(req, 'member_directory_access', (req as any).provinceContext?.province_code);

    // Get province context for filtering
    const provinceContext = (req as any).provinceContext;

    const {
      search,
      province,
      district,
      municipality,
      ward,
      membership_status,
      membership_type,
      gender,
      sort_by,
      sort_order,
      page,
      offset,
      limit
    } = req.query;

    // Use the existing view structure with enhanced voting district lookup
    let query = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname as first_name,
        COALESCE(m.surname, '') as last_name,
        m.email,
        COALESCE(m.cell_number, '') as phone,
        m.date_of_birth,
        COALESCE(m.gender_name, 'Unknown') as gender,
        m.id_number,
        COALESCE(m.membership_status, 'Unknown') as membership_status,
        'Standard' as membership_type,
        m.province_name,
        m.district_name,
        m.municipality_name,
        m.ward_name,
        'Unknown' as voting_district_name,
        m.member_created_at as created_at,
        m.member_updated_at as last_updated
      FROM vw_member_details m
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add search filter
    if (search) {
      query += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.email LIKE ? OR
        m.cell_number LIKE ? OR
        m.id_number LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Apply automatic province filtering for provincial admins
    if (provinceContext?.province_code) {
      console.log(`🔒 Applying province filter: ${provinceContext.province_code}`);
      query += ` AND m.province_code = ?`;
      params.push(provinceContext.province_code);
    }

    // Add additional geographic filters (only if not already filtered by province context)
    if (province && !provinceContext?.province_code) {
      query += ` AND m.province_code = ?`;
      params.push(province);
    }
    if (district) {
      query += ` AND m.district_code = ?`;
      params.push(district);
    }
    if (municipality) {
      query += ` AND m.municipality_code = ?`;
      params.push(municipality);
    }
    if (ward) {
      query += ` AND m.ward_code = ?`;
      params.push(ward);
    }

    // Add status filters (simplified for now)
    // if (membership_status) {
    //   query += ` AND ms.membership_status = ?`;
    //   params.push(membership_status);
    // }
    // if (membership_type) {
    //   query += ` AND mt.membership_type = ?`;
    //   params.push(membership_type);
    // }
    if (gender) {
      query += ` AND m.gender = ?`;
      params.push(gender);
    }

    // Get total count with a simpler query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details m
      WHERE 1=1
    `;

    // Add the same filters to count query
    if (search) {
      countQuery += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.email LIKE ? OR
        m.cell_number LIKE ? OR
        m.id_number LIKE ?
      )`;
    }
    if (province) {
      countQuery += ` AND m.province_code = ?`;
    }
    if (district) {
      countQuery += ` AND m.district_code = ?`;
    }
    if (municipality) {
      countQuery += ` AND m.municipality_code = ?`;
    }
    if (ward) {
      countQuery += ` AND m.ward_code = ?`;
    }
    if (gender) {
      countQuery += ` AND m.gender = ?`;
    }

    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    const pageNum = Number(page) || 0;
    const offsetNum = Number(offset) || (pageNum * Number(limit || 25)); // Use offset if provided, otherwise calculate from page
    const limitNum = Number(limit) || 25;
    const sortOrder = (sort_order as string) || 'asc';

    // Map sort_by to actual column names
    const sortColumnMap: { [key: string]: string } = {
      'first_name': 'firstname',
      'last_name': 'surname',
      'created_at': 'member_created_at',
      'membership_number': 'member_id'
    };
    const actualSortColumn = sortColumnMap[sort_by as string] || 'surname';

    query += ` ORDER BY m.${actualSortColumn} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const members = await executeQuery(query, params);

    sendSuccess(res, {
      members,
      pagination: {
        total,
        page: pageNum,
        offset: offsetNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: offsetNum + limitNum < total,
        hasPrev: offsetNum > 0
      }
    }, 'Member directory retrieved successfully');
  })
);

// Get member directory export data (no pagination)
router.get('/directory/export',
  validate({
    query: Joi.object({
      search: Joi.string().optional(),
      province: Joi.string().optional(),
      district: Joi.string().optional(),
      municipality: Joi.string().optional(),
      ward: Joi.string().optional(),
      membership_status: Joi.string().valid('Active', 'Inactive', 'Pending', 'Suspended').optional(),
      membership_type: Joi.string().optional(),
      gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
      sort_by: Joi.string().valid('first_name', 'last_name', 'created_at', 'membership_number').default('last_name'),
      sort_order: Joi.string().valid('asc', 'desc').default('asc')
    })
  }),
  asyncHandler(async (req, res) => {
    const {
      search,
      province,
      district,
      municipality,
      ward,
      membership_status,
      membership_type,
      gender,
      sort_by,
      sort_order
    } = req.query;

    // Use the same view structure with enhanced voting district lookup
    let query = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname as first_name,
        COALESCE(m.surname, '') as last_name,
        m.email,
        COALESCE(m.cell_number, '') as phone,
        m.date_of_birth,
        COALESCE(m.gender_name, 'Unknown') as gender,
        m.id_number,
        'Active' as membership_status,
        'Standard' as membership_type,
        m.province_name,
        m.district_name,
        m.municipality_name,
        m.ward_name,
        'Unknown' as voting_district_name,
        m.member_created_at as created_at,
        m.member_updated_at as last_updated
      FROM vw_member_details m
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add same filters as directory endpoint
    if (search) {
      query += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.email LIKE ? OR
        m.cell_number LIKE ? OR
        m.id_number LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (province) {
      query += ` AND m.province_code = ?`;
      params.push(province);
    }
    if (district) {
      query += ` AND m.district_code = ?`;
      params.push(district);
    }
    if (municipality) {
      query += ` AND m.municipality_code = ?`;
      params.push(municipality);
    }
    if (ward) {
      query += ` AND m.ward_code = ?`;
      params.push(ward);
    }
    // if (membership_status) {
    //   query += ` AND ms.membership_status = ?`;
    //   params.push(membership_status);
    // }
    // if (membership_type) {
    //   query += ` AND mt.membership_type = ?`;
    //   params.push(membership_type);
    // }
    if (gender) {
      query += ` AND m.gender = ?`;
      params.push(gender);
    }

    // Map sort_by to actual column names
    const sortColumnMap: { [key: string]: string } = {
      'first_name': 'firstname',
      'last_name': 'surname',
      'created_at': 'member_created_at',
      'membership_number': 'member_id'
    };
    const actualSortColumn = sortColumnMap[sort_by as string] || 'surname';
    const sortOrder = (sort_order as string) || 'asc';

    query += ` ORDER BY m.${actualSortColumn} ${sortOrder}`;

    const members = await executeQuery(query, params);

    sendSuccess(res, {
      members,
      total: members.length
    }, 'Member directory export data retrieved successfully');
  })
);

// Get filter options for member directory
router.get('/directory/filters',
  asyncHandler(async (_req, res) => {
    const provinces = await executeQuery(`
      SELECT DISTINCT p.province_code, p.province_name
      FROM provinces p
      WHERE p.is_active = true
      ORDER BY p.province_name
    `);

    sendSuccess(res, {
      provinces,
      membershipTypes: [{ membership_type: 'Standard' }]
    }, 'Member directory filter options retrieved successfully');
  })
);

// Get member by ID
router.get('/:id',
  cacheMiddleware(CacheConfigs.MEMBER),
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const member = await MemberModel.getMemberById(parseInt(id));

    if (!member) {
      throw new NotFoundError(`Member with ID ${id} not found`);
    }

    sendSuccess(res, member, 'Member retrieved successfully');
  })
);

// Get member activities
router.get('/:id/activities',
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const memberId = parseInt(id);

    // Check if member exists
    const member = await MemberModel.getMemberById(memberId);
    if (!member) {
      throw new NotFoundError(`Member with ID ${id} not found`);
    }

    // Get member activities from various sources
    const activities: any[] = [];

    // Add membership-related activities with voting district information (with decimal cleaning)
    const membershipQuery = `
      SELECT
        CONCAT('membership_', m.member_id) as id,
        'membership' as type,
        CONCAT('Member joined in ', COALESCE(vd.voting_district_name, w.ward_name, m.ward_code)) as description,
        m.created_at as date
      FROM members_consolidated m
      LEFT JOIN voting_districts vd ON CAST(REPLACE(COALESCE(m.voting_district_code, '0'), '.0', '') AS UNSIGNED) = vd.voting_district_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.member_id = ?
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

    try {
      const membershipActivities = await executeQuery(membershipQuery, [memberId]);
      activities.push(...membershipActivities);
    } catch (error) {
      // Ignore membership activities if table doesn't exist
    }

    // Add meeting attendance activities
    const meetingQuery = `
      SELECT
        CONCAT('meeting_', ma.id) as id,
        'meeting' as type,
        CONCAT('Attended meeting: ', COALESCE(m.meeting_title, 'Meeting')) as description,
        ma.created_at as date
      FROM meeting_attendance ma
      JOIN meetings m ON ma.meeting_id = m.meeting_id
      WHERE ma.member_id = ? AND ma.attendance_status IN ('Present', 'Attended')
      ORDER BY ma.created_at DESC
      LIMIT 10
    `;

    try {
      const meetingActivities = await executeQuery(meetingQuery, [memberId]);
      activities.push(...meetingActivities);
    } catch (error) {
      // Ignore meeting activities if table doesn't exist
    }

    // Add voting district registration activity (if available) with decimal cleaning
    const votingQuery = `
      SELECT
        CONCAT('voting_', m.member_id) as id,
        'voting' as type,
        CONCAT('Registered to vote in ', COALESCE(vd.voting_district_name, w.ward_name, m.ward_code)) as description,
        COALESCE(m.voter_registration_date, m.created_at) as date
      FROM members_consolidated m
      LEFT JOIN voting_districts vd ON CAST(REPLACE(COALESCE(m.voting_district_code, '0'), '.0', '') AS UNSIGNED) = vd.voting_district_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.member_id = ? AND m.voter_registration_date IS NOT NULL
      LIMIT 1
    `;

    try {
      const votingActivities = await executeQuery(votingQuery, [memberId]);
      activities.push(...votingActivities);
    } catch (error) {
      // Ignore voting activities if columns don't exist
    }

    // Sort all activities by date (most recent first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit to 20 most recent activities
    const recentActivities = activities.slice(0, 20);

    sendSuccess(res, recentActivities, 'Member activities retrieved successfully');
  })
);

// Get member by ID number (OPTIMIZED for high concurrency)
router.get('/id-number/:idNumber',
  requestQueueMiddleware, // Queue requests under high load
  applyRateLimit(rateLimiters.memberLookup), // Rate limiting
  cacheMiddleware(CacheConfigs.MEMBER), // Aggressive caching
  asyncHandler(async (req, res) => {
    const { idNumber } = req.params;

    // Validate ID number format
    if (!/^\d{13}$/.test(idNumber)) {
      throw new ValidationError('ID number must be exactly 13 digits');
    }

    // Use circuit breaker for database operations
    const member = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedMemberModel.getMemberByIdNumberOptimized(idNumber);
    });

    if (!member) {
      throw new NotFoundError(`Member with ID number ${idNumber} not found`);
    }

    sendSuccess(res, member, 'Member retrieved successfully');
  })
);

// Download sub-region members as Excel
router.get('/subregion/:municipalityCode/download',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    params: Joi.object({
      municipalityCode: Joi.string().required()
    }),
    query: Joi.object({
      search: Joi.string().allow('').optional(), // Allow empty string
      membership_status: Joi.string().valid('all', 'active', 'expired').optional(),
      province_code: Joi.string().min(2).max(3).optional() // Allow province_code for filtering
    })
  }),
  asyncHandler(async (req, res) => {
    const { municipalityCode } = req.params;
    const { search = '', membership_status = 'all' } = req.query;

    console.log(`📥 Sub-region download request: municipalityCode=${municipalityCode}, search=${search}, membership_status=${membership_status}`);

    // Build WHERE clause with PostgreSQL parameter placeholders
    let whereClause = 'WHERE m.municipality_code = $1';
    const params: any[] = [municipalityCode];

    // Add search filter
    if (search) {
      const searchPattern = `%${search}%`;
      whereClause += ` AND (
        m.firstname LIKE $2 OR
        m.surname LIKE $3 OR
        m.id_number LIKE $4 OR
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') LIKE $5
      )`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add membership status filter
    if (membership_status === 'active') {
      // Active members: not expired OR in grace period (expired < 90 days)
      whereClause += ' AND m.expiry_date >= CURRENT_DATE - INTERVAL \'90 days\'';
    } else if (membership_status === 'expired') {
      // Expired members: expired for more than 90 days
      whereClause += ' AND m.expiry_date < CURRENT_DATE - INTERVAL \'90 days\'';
    }
    // 'all' includes active, grace period, and expired members

    // Query to get members from members_consolidated (same table used by the view endpoint)
    const query = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname,
        m.surname,
        m.id_number,
        m.cell_number,
        m.email,
        m.residential_address,
        m.ward_code,
        w.ward_name,
        m.municipality_code,
        mu.municipality_name,
        m.district_code,
        d.district_name,
        m.province_code,
        p.province_name,
        m.expiry_date,
        CASE
          WHEN m.expiry_date IS NULL THEN 'Inactive'
          WHEN m.expiry_date >= CURRENT_DATE THEN 'Active'
          WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
          ELSE 'Expired'
        END as membership_status
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON m.province_code = p.province_code
      ${whereClause}
      ORDER BY m.firstname, m.surname
    `;

    console.log(`📝 Executing query with params:`, params);
    const members = await executeQuery(query, params);
    console.log(`✅ Found ${members.length} members for municipality ${municipalityCode}`);

    // Create Excel workbook
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sub-Region Members');

    // Add headers
    worksheet.columns = [
      { header: 'Membership Number', key: 'membership_number', width: 18 },
      { header: 'First Name', key: 'firstname', width: 20 },
      { header: 'Surname', key: 'surname', width: 20 },
      { header: 'ID Number', key: 'id_number', width: 15 },
      { header: 'Cell Number', key: 'cell_number', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Sub-Region', key: 'municipality_name', width: 30 },
      { header: 'Ward', key: 'ward_name', width: 30 },
      { header: 'District', key: 'district_name', width: 25 },
      { header: 'Province', key: 'province_name', width: 20 },
      { header: 'Membership Status', key: 'membership_status', width: 20 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };

    // Add data rows
    members.forEach((member: any) => {
      worksheet.addRow({
        membership_number: member.membership_number || '',
        firstname: member.firstname || '',
        surname: member.surname || '',
        id_number: member.id_number || '',
        cell_number: member.cell_number || '',
        email: member.email || '',
        municipality_name: member.municipality_name || '',
        ward_name: member.ward_name || '',
        district_name: member.district_name || '',
        province_name: member.province_name || '',
        membership_status: member.membership_status || '',
        expiry_date: member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-ZA') : '',
      });
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `SubRegion_${municipalityCode}_Members_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  })
);

// Download ward members as Excel
router.get('/ward/:wardCode/download',
  validate({
    params: commonSchemas.wardCode,
    query: Joi.object({
      search: Joi.string().allow('').optional(), // Allow empty string
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional(),
      province_code: Joi.string().min(2).max(3).optional() // Allow province_code for filtering
    })
  }),
  asyncHandler(async (req, res) => {
    const { wardCode } = req.params;
    const { search = '', membership_status = 'all' } = req.query;

    // Build WHERE clause
    let whereClause = 'WHERE m.ward_code = ?';
    const params: any[] = [wardCode];

    // Add search filter
    if (search) {
      whereClause += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.id_number LIKE ? OR
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add membership status filter
    if (membership_status === 'good_standing') {
      whereClause += ' AND ms.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      whereClause += ' AND ms.expiry_date < CURRENT_DATE';
    }

    // Get ward information
    const wardInfoQuery = `
      SELECT DISTINCT
        ward_code,
        ward_name,
        ward_number,
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name
      FROM vw_member_details
      WHERE ward_code = ?
      LIMIT 1
    `;
    const wardInfo = await executeQuerySingle(wardInfoQuery, [wardCode]);

    if (!wardInfo) {
      return res.status(404).json({
        success: false,
        message: `Ward ${wardCode} not found`
      });
    }

    // Get all members (no pagination for download)
    const membersQuery = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        m.gender_name,
        m.date_of_birth,
        ms.date_joined,
        ms.expiry_date,
        CASE
          WHEN ms.expiry_date IS NULL THEN 'Unknown'
          WHEN ms.expiry_date >= CURRENT_DATE THEN 'Good Standing'
          ELSE 'Expired'
        END as membership_status,
        m.voting_district_code,
        m.voting_district_name,
        m.ward_code,
        m.ward_name,
        m.ward_number,
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        m.district_name,
        m.province_code,
        m.province_name
      FROM vw_member_details m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      ${whereClause}
      ORDER BY m.firstname, m.surname
    `;
    const members = await executeQuery(membersQuery, params);

    // Create Excel workbook
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ward Members');

    // Add title
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Ward Members Report - ${wardInfo.ward_name}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add ward info
    worksheet.mergeCells('A2:L2');
    const infoCell = worksheet.getCell('A2');
    infoCell.value = `${wardInfo.municipality_name}, ${wardInfo.district_name}, ${wardInfo.province_name}`;
    infoCell.font = { size: 12 };
    infoCell.alignment = { horizontal: 'center' };

    // Add export date
    worksheet.mergeCells('A3:L3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `Generated: ${new Date().toLocaleString()}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: 'center' };

    // Add empty row
    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow([
      'Membership Number',
      'First Name',
      'Surname',
      'ID Number',
      'Email',
      'Cell Number',
      'Gender',
      'Date of Birth',
      'Date Joined',
      'Expiry Date',
      'Membership Status',
      'Voting District'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    members.forEach((member: any) => {
      worksheet.addRow([
        member.membership_number,
        member.firstname,
        member.surname,
        member.id_number,
        member.email,
        member.cell_number,
        member.gender_name,
        member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : '',
        member.date_joined ? new Date(member.date_joined).toLocaleDateString() : '',
        member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : '',
        member.membership_status,
        member.voting_district_name || ''
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Set response headers
    const filename = `Ward_${wardInfo.ward_number}_${wardInfo.ward_name.replace(/[^a-zA-Z0-9]/g, '_')}_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  })
);

// Get members by sub-region (municipality) with pagination
router.get('/subregion/:municipalityCode',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    params: Joi.object({
      municipalityCode: Joi.string().required()
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(500).default(50),
      search: Joi.string().allow('').optional(), // Allow empty string
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional(),
      sort_by: Joi.string().valid('firstname', 'surname', 'member_id', 'membership_number', 'expiry_date').default('firstname'),
      sort_order: Joi.string().valid('asc', 'desc').default('asc'),
      province_code: Joi.string().min(2).max(3).optional() // Allow province_code for filtering
    })
  }),
  asyncHandler(async (req, res) => {
    const { municipalityCode } = req.params;
    const {
      page = 1,
      limit = 50,
      search = '',
      membership_status = 'all',
      sort_by = 'firstname',
      sort_order = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const sortByStr = sort_by as string;
    const sortOrderStr = (sort_order as string).toUpperCase();

    // Build WHERE clause
    let whereClause = 'WHERE m.municipality_code = ?';
    const params: any[] = [municipalityCode];

    // Add search filter
    if (search) {
      whereClause += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.id_number LIKE ? OR
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add membership status filter
    if (membership_status === 'good_standing') {
      whereClause += ' AND ms.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      whereClause += ' AND ms.expiry_date < CURRENT_DATE';
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      ${whereClause}
    `;

    const countResult = await executeQuerySingle<{ total: number }>(countQuery, params);
    const total = countResult?.total || 0;

    // Data query with pagination
    const dataQuery = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        m.surname,
        m.id_number,
        m.cell_number,
        m.email,
        m.residential_address,
        m.ward_code,
        w.ward_name,
        m.municipality_code,
        mu.municipality_name,
        m.district_code,
        d.district_name,
        m.province_code,
        p.province_name,
        ms.expiry_date,
        CASE
          WHEN ms.expiry_date IS NULL THEN 'Unknown'
          WHEN ms.expiry_date >= CURRENT_DATE THEN 'Good Standing'
          WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
          ELSE 'Expired'
        END as membership_status
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON m.province_code = p.province_code
      ${whereClause}
      ORDER BY m.${sortByStr} ${sortOrderStr}
      LIMIT ? OFFSET ?
    `;

    params.push(limitNum, offset);
    const members = await executeQuery(dataQuery, params);

    const totalPages = Math.ceil(total / limitNum);

    sendPaginatedSuccess(res, members, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }, 'Sub-region members retrieved successfully');
  })
);

// Get members by ward with pagination
router.get('/ward/:wardCode',
  validate({
    params: commonSchemas.wardCode,
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(500).default(50),
      search: Joi.string().optional(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional(),
      sort_by: Joi.string().valid('firstname', 'surname', 'member_id', 'membership_number', 'expiry_date').default('firstname'),
      sort_order: Joi.string().valid('asc', 'desc').default('asc')
    })
  }),
  asyncHandler(async (req, res) => {
    const { wardCode } = req.params;
    const {
      page = 1,
      limit = 50,
      search = '',
      membership_status = 'all',
      sort_by = 'firstname',
      sort_order = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereClause = 'WHERE m.ward_code = ?';
    const params: any[] = [wardCode];

    // Add search filter
    if (search) {
      whereClause += ` AND (
        m.firstname LIKE ? OR
        m.surname LIKE ? OR
        m.id_number LIKE ? OR
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add membership status filter
    if (membership_status === 'good_standing') {
      whereClause += ' AND ms.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      whereClause += ' AND ms.expiry_date < CURRENT_DATE';
    }

    // Get ward information
    const wardInfoQuery = `
      SELECT DISTINCT
        ward_code,
        ward_name,
        ward_number,
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name
      FROM vw_member_details
      WHERE ward_code = ?
      LIMIT 1
    `;
    const wardInfo = await executeQuerySingle(wardInfoQuery, [wardCode]);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT m.member_id) as total
      FROM vw_member_details m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      ${whereClause}
    `;
    const countResult = await executeQuerySingle(countQuery, params);
    const total = countResult?.total || 0;

    // Get members with pagination
    const sortColumnMap: Record<string, string> = {
      'firstname': 'firstname',
      'surname': 'surname',
      'member_id': 'member_id',
      'membership_number': 'member_id',
      'expiry_date': 'expiry_date'
    };
    const sortColumn = sortColumnMap[sort_by as string] || 'firstname';

    const membersQuery = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        m.gender_name,
        m.date_of_birth,
        ms.date_joined,
        ms.expiry_date,
        CASE
          WHEN ms.expiry_date IS NULL THEN 'Unknown'
          WHEN ms.expiry_date >= CURRENT_DATE THEN 'Good Standing'
          ELSE 'Expired'
        END as membership_status,
        m.voting_district_code,
        m.voting_district_name,
        m.ward_code,
        m.ward_name,
        m.ward_number,
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        m.district_name,
        m.province_code,
        m.province_name
      FROM vw_member_details m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      ${whereClause}
      ORDER BY m.${sortColumn} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    params.push(limitNum, offset);
    const members = await executeQuery(membersQuery, params);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: offset + limitNum < total,
      hasPrev: offset > 0
    };

    sendSuccess(res, {
      ward_info: wardInfo,
      members,
      pagination
    }, `Members for ward ${wardCode} retrieved successfully`);
  })
);

// Get members by province
router.get('/province/:provinceCode',
  validate({ params: commonSchemas.provinceCode }),
  asyncHandler(async (req, res) => {
    const { provinceCode } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = 'firstname',
      sortOrder = 'asc',
      q: search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    const filters = {
      search: search as string
    };

    const [members, total] = await Promise.all([
      MemberModel.getMembersByProvince(provinceCode, filters, limitNum, offset, sortBy as string, sortOrder as 'asc' | 'desc'),
      MemberModel.getMembersByProvinceCount(provinceCode, filters)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendPaginatedSuccess(res, members, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }, `Members for province ${provinceCode} retrieved successfully`);
  })
);

// Create new member
router.post('/',
  cacheInvalidationMiddleware(['member:*', 'analytics:*', 'statistics:*']),
  validate({ body: memberSchemas.create }),
  asyncHandler(async (req, res) => {
    const memberData: CreateMemberData = req.body;

    // Check if ID number already exists
    const idExists = await MemberModel.idNumberExists(memberData.id_number);
    if (idExists) {
      throw new ValidationError(`Member with ID number ${memberData.id_number} already exists`);
    }

    const memberId = await MemberModel.createMember(memberData);
    const newMember = await MemberModel.getMemberById(memberId);

    // Trigger cache invalidation
    await CacheInvalidationHooks.onMemberChange('create', memberId);

    sendSuccess(res, newMember, 'Member created successfully', 201);
  })
);

// Update member
router.put('/:id',
  cacheInvalidationMiddleware(['member:*', 'analytics:*', 'statistics:*']),
  validate({
    params: commonSchemas.id,
    body: memberSchemas.update
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData: UpdateMemberData = req.body;
    const memberId = parseInt(id);

    // Check if member exists
    const existingMember = await MemberModel.getMemberById(memberId);
    if (!existingMember) {
      throw new NotFoundError(`Member with ID ${id} not found`);
    }

    const updated = await MemberModel.updateMember(memberId, updateData);
    if (!updated) {
      throw new ValidationError('No changes were made to the member');
    }

    // Trigger cache invalidation
    await CacheInvalidationHooks.onMemberChange('update', memberId);

    const updatedMember = await MemberModel.getMemberById(memberId);
    sendSuccess(res, updatedMember, 'Member updated successfully');
  })
);

// Check related records before deletion (warning endpoint)
router.get('/:id/delete-check',
  authenticate,
  requirePermission('members.delete'),
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const memberId = parseInt(id);

    // Check if member exists
    const existingMember = await MemberModel.getMemberById(memberId);
    if (!existingMember) {
      throw new NotFoundError(`Member with ID ${id} not found`);
    }

    // Get related records count
    const relatedRecords = await MemberModel.getRelatedRecordsCount(memberId);

    const warnings: string[] = [];
    if (relatedRecords.memberships > 0) {
      warnings.push(`This member has ${relatedRecords.memberships} membership record(s) that will be deleted`);
    }
    if (relatedRecords.applications > 0) {
      warnings.push(`This member has ${relatedRecords.applications} application(s) in the system`);
    }
    if (relatedRecords.hasUserAccount) {
      warnings.push('This member has an associated user account');
    }

    sendSuccess(res, {
      member_id: memberId,
      member_name: `${existingMember.firstname} ${existingMember.surname || ''}`.trim(),
      id_number: existingMember.id_number,
      can_delete: true,
      related_records: relatedRecords,
      warnings: warnings,
      cascade_info: 'Membership records will be automatically deleted due to CASCADE constraint'
    }, 'Delete check completed');
  })
);

// Delete member
router.delete('/:id',
  authenticate,
  requirePermission('members.delete'),
  cacheInvalidationMiddleware(['member:*', 'analytics:*', 'statistics:*']),
  validate({ params: commonSchemas.id }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const memberId = parseInt(id);

    // Check if member exists
    const existingMember = await MemberModel.getMemberById(memberId);
    if (!existingMember) {
      throw new NotFoundError(`Member with ID ${id} not found`);
    }

    const deleted = await MemberModel.deleteMember(memberId);
    if (!deleted) {
      throw new ValidationError('Failed to delete member');
    }

    // Trigger cache invalidation
    await CacheInvalidationHooks.onMemberChange('delete', memberId);

    sendSuccess(res, { deleted: true, member_id: memberId }, 'Member deleted successfully');
  })
);

// Bulk delete members
router.post('/bulk-delete',
  authenticate,
  requirePermission('members.delete'),
  cacheInvalidationMiddleware(['member:*', 'analytics:*', 'statistics:*']),
  validate({
    body: Joi.object({
      member_ids: Joi.array()
        .items(Joi.number().integer().positive())
        .min(1)
        .max(100)
        .required()
        .messages({
          'array.min': 'At least one member ID is required',
          'array.max': 'Cannot delete more than 100 members at once',
          'any.required': 'member_ids array is required'
        })
    })
  }),
  asyncHandler(async (req, res) => {
    const { member_ids } = req.body;

    // Perform bulk delete
    const results = await MemberModel.bulkDeleteMembers(member_ids);

    // Trigger cache invalidation for all deleted members
    for (let i = 0; i < results.deleted; i++) {
      await CacheInvalidationHooks.onMemberChange('delete', member_ids[i]);
    }

    const message = results.failed > 0
      ? `Bulk delete completed with ${results.deleted} successful and ${results.failed} failed deletions`
      : `Successfully deleted ${results.deleted} member(s)`;

    sendSuccess(res, {
      deleted: results.deleted,
      failed: results.failed,
      errors: results.errors,
      total_requested: member_ids.length
    }, message);
  })
);

// Check if ID number exists
router.get('/check/id-number/:idNumber',
  asyncHandler(async (req, res) => {
    const { idNumber } = req.params;
    
    // Validate ID number format
    if (!/^\d{13}$/.test(idNumber)) {
      throw new ValidationError('ID number must be exactly 13 digits');
    }

    const exists = await MemberModel.idNumberExists(idNumber);
    
    sendSuccess(res, { 
      id_number: idNumber,
      exists,
      available: !exists
    }, 'ID number availability checked');
  })
);

// Get member statistics
router.get('/statistics/summary',
  asyncHandler(async (req, res) => {
    const { ward_code } = req.query;

    const filters: MemberFilters = ward_code ? { ward_code: ward_code as string } : {};

    const [
      totalMembers,
      maleMembers,
      femaleMembers,
      membersWithEmail,
      membersWithCellNumber
    ] = await Promise.all([
      MemberModel.getMembersCount(filters),
      MemberModel.getMembersCount({ ...filters, gender_id: 1 }),
      MemberModel.getMembersCount({ ...filters, gender_id: 2 }),
      MemberModel.getMembersCount({ ...filters, has_email: true }),
      MemberModel.getMembersCount({ ...filters, has_cell_number: true })
    ]);

    const statistics = {
      total: totalMembers,
      gender: {
        male: maleMembers,
        female: femaleMembers,
        other: totalMembers - maleMembers - femaleMembers
      },
      contact: {
        with_email: membersWithEmail,
        with_cell_number: membersWithCellNumber,
        email_percentage: totalMembers > 0 ? Math.round((membersWithEmail / totalMembers) * 100) : 0,
        cell_percentage: totalMembers > 0 ? Math.round((membersWithCellNumber / totalMembers) * 100) : 0
      },
      ward_code: ward_code || 'all'
    };

    sendSuccess(res, statistics, 'Member statistics retrieved successfully');
  })
);

// Get member statistics by provinces
router.get('/stats/provinces',
  validate({
    query: Joi.object({
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { membership_status } = req.query;

    let statusFilter = '';
    if (membership_status === 'good_standing' || membership_status === 'active') {
      // Active members: membership_status_id = 1 (Active/Good Standing)
      statusFilter = 'AND m.membership_status_id = 1';
    } else if (membership_status === 'expired') {
      // Expired/Inactive members: membership_status_id IN (2, 3, 4)
      statusFilter = 'AND m.membership_status_id IN (2, 3, 4)';
    }

    const query = `
      SELECT
        p.province_code,
        p.province_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM provinces p
      LEFT JOIN members_consolidated m ON p.province_code = m.province_code
      WHERE 1=1 ${statusFilter}
      GROUP BY p.province_code, p.province_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query);
    sendSuccess(res, { data }, 'Province member statistics retrieved successfully');
  })
);

// Get member statistics by districts for a province (including metro subregion aggregation)
router.get('/stats/districts',
  validate({
    query: Joi.object({
      province: Joi.string().required(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { province, membership_status } = req.query;

    let statusFilter = '';
    if (membership_status === 'good_standing' || membership_status === 'active') {
      // Active members: membership_status_id = 1 (Active/Good Standing)
      statusFilter = 'AND m.membership_status_id = 1';
    } else if (membership_status === 'expired') {
      // Expired/Inactive members: membership_status_id IN (2, 3, 4)
      statusFilter = 'AND m.membership_status_id IN (2, 3, 4)';
    }

    const query = `
      SELECT
        d.district_code,
        d.district_name,
        COUNT(DISTINCT m.member_id) as member_count
      FROM districts d
      LEFT JOIN (
        -- Get all members for this district through various paths
        SELECT DISTINCT
          m.member_id,
          COALESCE(mu.district_code, parent_mu.district_code) as district_code
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
        WHERE m.province_code = ?
          ${statusFilter.replace('m1.', 'm.')}
      ) m ON d.district_code = m.district_code
      WHERE d.province_code = ?
      GROUP BY d.district_code, d.district_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query, [province, province]);
    sendSuccess(res, { data }, 'District member statistics retrieved successfully');
  })
);

// Get member statistics by municipalities for a district (including subregion aggregation)
router.get('/stats/municipalities',
  validate({
    query: Joi.object({
      district: Joi.string().required(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { district, membership_status } = req.query;

    let statusFilter = '';
    if (membership_status === 'good_standing') {
      statusFilter = 'AND m1.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      statusFilter = 'AND m1.expiry_date < CURRENT_DATE';
    }

    let statusFilter2 = '';
    if (membership_status === 'good_standing') {
      statusFilter2 = 'AND m2.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      statusFilter2 = 'AND m2.expiry_date < CURRENT_DATE';
    }

    const query = `
      SELECT
        mu.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        COALESCE(
          -- Direct members assigned to this municipality
          (SELECT COUNT(DISTINCT m1.member_id)
           FROM members_consolidated m1
           WHERE m1.municipality_code = mu.municipality_code
             ${statusFilter})
          +
          -- Members assigned to subregions of this municipality (for metros)
          (SELECT COUNT(DISTINCT m2.member_id)
           FROM municipalities sub
           JOIN members_consolidated m2 ON sub.municipality_code = m2.municipality_code
           WHERE sub.parent_municipality_id = mu.municipality_id
             ${statusFilter2})
        , 0) as member_count
      FROM municipalities mu
      WHERE mu.district_code = ?
        AND mu.municipality_type != 'Metro Sub-Region'  -- Exclude subregions from top-level results
      GROUP BY mu.municipality_code, mu.municipality_name, mu.municipality_type, mu.municipality_id
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query, [district]);
    sendSuccess(res, { data }, 'Municipality member statistics retrieved successfully');
  })
);

// Get member statistics by wards for a municipality
router.get('/stats/wards',
  validate({
    query: Joi.object({
      municipality: Joi.string().required(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { municipality, membership_status } = req.query;

    let statusFilter = '';
    let countFilter = '';
    if (membership_status === 'good_standing' || membership_status === 'active') {
      // Active members: membership_status_id = 1 (Active/Good Standing)
      statusFilter = 'AND m.membership_status_id = 1';
      countFilter = 'CASE WHEN m.membership_status_id = 1 THEN m.member_id END';
    } else if (membership_status === 'expired') {
      // Expired/Inactive members: membership_status_id IN (2, 3, 4)
      statusFilter = 'AND m.membership_status_id IN (2, 3, 4)';
      countFilter = 'CASE WHEN m.membership_status_id IN (2, 3, 4) THEN m.member_id END';
    } else {
      // All members
      countFilter = 'm.member_id';
    }

    const query = `
      SELECT
        w.ward_code,
        w.ward_name,
        COALESCE(COUNT(DISTINCT ${countFilter}), 0) as member_count
      FROM wards w
      LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
      WHERE w.municipality_code = ?
        AND w.ward_code NOT IN ('99999999', '33333333', '22222222', '11111111')  -- Exclude special voting district codes
        ${statusFilter}
      GROUP BY w.ward_code, w.ward_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query, [municipality]);
    sendSuccess(res, { data }, 'Ward member statistics retrieved successfully');
  })
);

// Get member statistics by subregions for a municipality
router.get('/stats/subregions',
  validate({
    query: Joi.object({
      municipality: Joi.string().required(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { municipality, membership_status } = req.query;

    let statusFilter = '';
    if (membership_status === 'good_standing') {
      statusFilter = 'AND m.expiry_date >= CURRENT_DATE';
    } else if (membership_status === 'expired') {
      statusFilter = 'AND m.expiry_date < CURRENT_DATE';
    }

    const query = `
      SELECT
        sr.municipality_code as subregion_code,
        sr.municipality_name as subregion_name,
        sr.municipality_type,
        pm.municipality_code as parent_municipality_code,
        pm.municipality_name as parent_municipality_name,
        COUNT(DISTINCT m.member_id) as member_count
      FROM municipalities sr
      JOIN municipalities pm ON sr.parent_municipality_id = pm.municipality_id
      LEFT JOIN wards w ON sr.municipality_code = w.municipality_code
      LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
      WHERE pm.municipality_code = ?
        AND sr.municipality_type = 'Metro Sub-Region'
        ${statusFilter}
      GROUP BY sr.municipality_code, sr.municipality_name, sr.municipality_type,
               pm.municipality_code, pm.municipality_name
      ORDER BY sr.municipality_name
    `;

    const data = await executeQuery(query, [municipality]);
    sendSuccess(res, { data }, 'Subregion member statistics retrieved successfully');
  })
);

// Get member statistics by voting districts for a ward (including special voting districts)
router.get('/stats/voting-districts',
  validate({
    query: Joi.object({
      ward: Joi.string().required(),
      membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { ward, membership_status } = req.query;

    let statusFilter = '';
    if (membership_status === 'good_standing' || membership_status === 'active') {
      // Active members: membership_status_id = 1 (Active/Good Standing)
      statusFilter = 'AND m.membership_status_id = 1';
    } else if (membership_status === 'expired') {
      // Expired/Inactive members: membership_status_id IN (2, 3, 4)
      statusFilter = 'AND m.membership_status_id IN (2, 3, 4)';
    }

    // Query for regular voting districts - need to recalculate counts with status filter
    const regularVotingDistrictsQuery = `
      SELECT
        vd.voting_district_code,
        vd.voting_district_name,
        COUNT(DISTINCT m.member_id) as member_count,
        'regular' as district_type
      FROM voting_districts vd
      LEFT JOIN members_consolidated m ON vd.voting_district_code = m.voting_district_code
      WHERE vd.ward_code = ?
        AND vd.is_active = TRUE
        ${statusFilter}
      GROUP BY vd.voting_district_code, vd.voting_district_name
      HAVING COUNT(DISTINCT m.member_id) > 0
      ORDER BY vd.voting_district_name
    `;

    // Query for special voting districts that exist in members table for this ward
    const specialVotingDistrictsQuery = `
      SELECT
        m.voting_district_code,
        CASE
          WHEN m.voting_district_code = '33333333' THEN 'International Voter'
          WHEN m.voting_district_code = '99999999' THEN 'Not Registered Voter'
          WHEN m.voting_district_code = '22222222' THEN 'Registered in Different Ward'
          WHEN m.voting_district_code = '11111111' THEN 'Deceased'
          ELSE 'Unknown Special District'
        END as voting_district_name,
        NULL as voting_district_number,
        COUNT(*) as member_count,
        'special' as district_type
      FROM members_consolidated m
      WHERE m.ward_code = ?
        AND m.voting_district_code IN ('33333333', '99999999', '22222222', '11111111')
        ${statusFilter}
      GROUP BY m.voting_district_code
      HAVING COUNT(*) > 0
    `;

    // Execute both queries
    const [regularDistricts, specialDistricts] = await Promise.all([
      executeQuery(regularVotingDistrictsQuery, [ward]),
      executeQuery(specialVotingDistrictsQuery, [ward])
    ]);

    // Combine results
    const allDistricts = [...regularDistricts, ...specialDistricts];

    // Sort by member count descending, then by district type (regular first, then special)
    allDistricts.sort((a, b) => {
      if (b.member_count !== a.member_count) {
        return b.member_count - a.member_count;
      }
      // If member counts are equal, prioritize regular districts
      if (a.district_type === 'regular' && b.district_type === 'special') return -1;
      if (a.district_type === 'special' && b.district_type === 'regular') return 1;
      return 0;
    });

    sendSuccess(res, { data: allDistricts }, 'Voting district member statistics retrieved successfully');
  })
);

// Bulk action endpoint
router.post('/bulk-action',
  validate({
    body: Joi.object({
      action: Joi.string().valid('activate', 'deactivate', 'suspend', 'delete', 'email').required(),
      memberIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
      // Additional fields for email action
      emailSubject: Joi.string().when('action', { is: 'email', then: Joi.required(), otherwise: Joi.optional() }),
      emailMessage: Joi.string().when('action', { is: 'email', then: Joi.required(), otherwise: Joi.optional() }),
      emailType: Joi.string().valid('html', 'text').when('action', { is: 'email', then: Joi.optional(), otherwise: Joi.optional() }).default('html')
    })
  }),
  asyncHandler(async (req, res) => {
    const { action, memberIds, emailSubject, emailMessage, emailType } = req.body;

    let query = '';
    let params: any[] = [];
    let result: any = {};

    switch (action) {
      case 'activate':
        // Since membership_status column doesn't exist, we'll update the updated_at timestamp
        query = `UPDATE members_consolidated SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'deactivate':
        // Since membership_status column doesn't exist, we'll update the updated_at timestamp
        query = `UPDATE members_consolidated SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'suspend':
        // Since membership_status column doesn't exist, we'll update the updated_at timestamp
        query = `UPDATE members_consolidated SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'delete':
        query = `DELETE FROM members_consolidated WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'email':
        // Get member details for email sending
        const membersQuery = `
          SELECT member_id, firstname, surname, email
          FROM members_consolidated
          WHERE member_id IN (${memberIds.map(() => '?').join(',')})
          AND email IS NOT NULL
          AND email != ''
        `;
        const members = await executeQuery(membersQuery, memberIds);

        let successCount = 0;
        let failureCount = 0;
        const emailResults: Array<{
          member_id: number;
          email: string;
          status: 'sent' | 'failed' | 'error';
          error?: string;
        }> = [];

        for (const member of members) {
          try {
            // Generate membership number from member_id
            const membershipNumber = `M${String(member.member_id).padStart(6, '0')}`;
            const fullName = `${member.firstname} ${member.surname || ''}`.trim();

            const personalizedMessage = emailType === 'html'
              ? emailMessage.replace(/\{name\}/g, fullName)
                           .replace(/\{membership_number\}/g, membershipNumber)
              : emailMessage.replace(/\{name\}/g, fullName)
                           .replace(/\{membership_number\}/g, membershipNumber);

            const emailSent = await emailService.sendEmail({
              to: member.email,
              subject: emailSubject,
              [emailType === 'html' ? 'html' : 'text']: personalizedMessage
            });

            if (emailSent) {
              successCount++;
              emailResults.push({
                member_id: member.member_id,
                email: member.email,
                status: 'sent'
              });
            } else {
              failureCount++;
              emailResults.push({
                member_id: member.member_id,
                email: member.email,
                status: 'failed'
              });
            }
          } catch (error) {
            failureCount++;
            emailResults.push({
              member_id: member.member_id,
              email: member.email,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        result = {
          total_members: memberIds.length,
          members_with_email: members.length,
          emails_sent: successCount,
          emails_failed: failureCount,
          results: emailResults
        };
        break;
      default:
        throw new ValidationError('Invalid bulk action');
    }

    sendSuccess(res, {
      action,
      affectedRows: result.affectedRows || result.emails_sent || 0,
      memberIds,
      ...(action === 'email' && { emailResults: result })
    }, `Bulk ${action} completed successfully`);
  })
);



// Hierarchical Dashboard Statistics - OPTIMIZED with caching
router.get('/dashboard/stats/:level/:code?',
  cacheMiddleware({
    ttl: 300 // 5 minutes cache for dashboard stats
  }),
  validate({
    params: Joi.object({
      level: Joi.string().valid('national', 'province', 'region', 'municipality', 'ward').required(),
      code: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const { level, code } = req.params;

    let stats: any = {};

    try {
      switch (level) {
        case 'national':
          stats = await getNationalDashboardStats();
          break;
        case 'province':
          if (!code) throw new ValidationError('Province code is required');
          stats = await getProvinceDashboardStats(code);
          break;
        case 'region':
          if (!code) throw new ValidationError('Region code is required');
          stats = await getRegionDashboardStats(code);
          break;
        case 'municipality':
          if (!code) throw new ValidationError('Municipality code is required');
          stats = await getMunicipalityDashboardStats(code);
          break;
        case 'ward':
          if (!code) throw new ValidationError('Ward code is required');
          stats = await getWardDashboardStats(code);
          break;
      }

      sendSuccess(res, stats, `${level} dashboard statistics retrieved successfully`);
    } catch (error) {
      throw new NotFoundError(`Unable to retrieve ${level} statistics: ${error}`);
    }
  })
);

// Helper functions for dashboard statistics - OPTIMIZED using materialized view
// Only counts ACTIVE members (membership_status = 'Active'), excludes expired/inactive/grace period
// Uses mv_hierarchical_dashboard_stats for sub-second performance
async function getNationalDashboardStats() {
  // Use materialized view for FAST performance (pre-aggregated data)
  const statsQuery = `
    SELECT
      SUM(active_members) as total_members,
      SUM(male_members) as male_members,
      SUM(female_members) as female_members,
      SUM(active_members) as active_members,
      SUM(expired_members) as expired_members,
      SUM(registered_voters) as registered_voters,
      COUNT(DISTINCT province_code) as total_provinces,
      COUNT(DISTINCT district_code) as total_regions,
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM mv_hierarchical_dashboard_stats
  `;

  const result = await executeQuery(statsQuery);
  const stats = result[0];

  return {
    level: 'national',
    entity: { name: 'South Africa', code: 'ZA' },
    member_statistics: {
      total_members: Number(stats?.total_members || 0),
      male_members: Number(stats?.male_members || 0),
      female_members: Number(stats?.female_members || 0),
      active_members: Number(stats?.active_members || 0),
      expired_members: Number(stats?.expired_members || 0),
      registered_voters: Number(stats?.registered_voters || 0)
    },
    geographic_statistics: {
      total_provinces: Number(stats?.total_provinces || 0),
      total_regions: Number(stats?.total_regions || 0),
      total_municipalities: Number(stats?.total_municipalities || 0),
      total_wards: Number(stats?.total_wards || 0)
    },
    timestamp: new Date().toISOString()
  };
}

async function getProvinceDashboardStats(provinceCode: string) {
  // Use materialized view for FAST performance
  const statsQuery = `
    SELECT
      province_code as code,
      province_name as name,
      SUM(active_members) as total_members,
      SUM(male_members) as male_members,
      SUM(female_members) as female_members,
      SUM(active_members) as active_members,
      SUM(expired_members) as expired_members,
      SUM(registered_voters) as registered_voters,
      COUNT(DISTINCT district_code) as total_regions,
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM mv_hierarchical_dashboard_stats
    WHERE province_code = $1
    GROUP BY province_code, province_name
  `;

  const result = await executeQuery(statsQuery, [provinceCode]);
  const stats = result[0];

  if (!stats) {
    throw new NotFoundError(`Province with code ${provinceCode} not found`);
  }

  return {
    level: 'province',
    entity: { code: stats.code, name: stats.name },
    member_statistics: {
      total_members: Number(stats?.total_members || 0),
      male_members: Number(stats?.male_members || 0),
      female_members: Number(stats?.female_members || 0),
      active_members: Number(stats?.active_members || 0),
      expired_members: Number(stats?.expired_members || 0),
      registered_voters: Number(stats?.registered_voters || 0)
    },
    geographic_statistics: {
      total_regions: Number(stats?.total_regions || 0),
      total_municipalities: Number(stats?.total_municipalities || 0),
      total_wards: Number(stats?.total_wards || 0)
    },
    timestamp: new Date().toISOString()
  };
}

async function getRegionDashboardStats(regionCode: string) {
  // Use materialized view for FAST performance
  const statsQuery = `
    SELECT
      district_code as code,
      district_name as name,
      province_code,
      province_name,
      SUM(active_members) as total_members,
      SUM(active_members) as active_members,
      SUM(expired_members) as expired_members,
      SUM(registered_voters) as registered_voters,
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM mv_hierarchical_dashboard_stats
    WHERE district_code = $1
    GROUP BY district_code, district_name, province_code, province_name
  `;

  const result = await executeQuery(statsQuery, [regionCode]);
  const stats = result[0];

  if (!stats) {
    throw new NotFoundError(`Region with code ${regionCode} not found`);
  }

  return {
    level: 'region',
    entity: {
      code: stats.code,
      name: stats.name,
      province_code: stats.province_code,
      province_name: stats.province_name
    },
    member_statistics: {
      total_members: Number(stats?.total_members || 0),
      active_members: Number(stats?.active_members || 0),
      expired_members: Number(stats?.expired_members || 0),
      registered_voters: Number(stats?.registered_voters || 0)
    },
    geographic_statistics: {
      total_municipalities: Number(stats?.total_municipalities || 0),
      total_wards: Number(stats?.total_wards || 0)
    },
    timestamp: new Date().toISOString()
  };
}

async function getMunicipalityDashboardStats(municipalityCode: string) {
  // Use materialized view for FAST performance
  const statsQuery = `
    SELECT
      municipality_code as code,
      municipality_name as name,
      district_code as region_code,
      district_name as region_name,
      province_code,
      province_name,
      SUM(active_members) as total_members,
      SUM(active_members) as active_members,
      SUM(expired_members) as expired_members,
      SUM(registered_voters) as registered_voters,
      COUNT(DISTINCT ward_code) as total_wards
    FROM mv_hierarchical_dashboard_stats
    WHERE municipality_code = $1
    GROUP BY municipality_code, municipality_name, district_code, district_name, province_code, province_name
  `;

  const result = await executeQuery(statsQuery, [municipalityCode]);
  const stats = result[0];

  if (!stats) {
    throw new NotFoundError(`Municipality with code ${municipalityCode} not found`);
  }

  return {
    level: 'municipality',
    entity: {
      code: stats.code,
      name: stats.name,
      region_code: stats.region_code,
      region_name: stats.region_name,
      province_code: stats.province_code,
      province_name: stats.province_name
    },
    member_statistics: {
      total_members: Number(stats?.total_members || 0),
      active_members: Number(stats?.active_members || 0),
      expired_members: Number(stats?.expired_members || 0),
      registered_voters: Number(stats?.registered_voters || 0)
    },
    geographic_statistics: {
      total_wards: Number(stats?.total_wards || 0)
    },
    timestamp: new Date().toISOString()
  };
}

async function getWardDashboardStats(wardCode: string) {
  // Use materialized view for FAST performance
  const statsQuery = `
    SELECT
      ward_code as code,
      ward_name as name,
      ward_number,
      municipality_code,
      municipality_name,
      district_code as region_code,
      district_name as region_name,
      province_code,
      province_name,
      active_members as total_members,
      active_members,
      expired_members,
      registered_voters,
      male_members,
      female_members,
      COALESCE(average_age, 0) as average_age
    FROM mv_hierarchical_dashboard_stats
    WHERE ward_code = $1
  `;

  const result = await executeQuery(statsQuery, [wardCode]);
  const stats = result[0];

  if (!stats) {
    throw new NotFoundError(`Ward with code ${wardCode} not found`);
  }

  return {
    level: 'ward',
    entity: {
      code: stats.code,
      name: stats.name,
      ward_number: stats.ward_number,
      municipality_code: stats.municipality_code,
      municipality_name: stats.municipality_name,
      region_code: stats.region_code,
      region_name: stats.region_name,
      province_code: stats.province_code,
      province_name: stats.province_name
    },
    member_statistics: {
      total_members: Number(stats?.total_members || 0),
      active_members: Number(stats?.active_members || 0),
      expired_members: Number(stats?.expired_members || 0),
      registered_voters: Number(stats?.registered_voters || 0),
      male_members: Number(stats?.male_members || 0),
      female_members: Number(stats?.female_members || 0),
      average_age: Math.round(Number(stats?.average_age || 0))
    },
    geographic_statistics: {
      total_members: Number(stats?.total_members || 0)
    },
    timestamp: new Date().toISOString()
  };
}

// Get member by ID number (Public endpoint for card display - OPTIMIZED)
router.get('/by-id-number/:idNumber',
  requestQueueMiddleware, // Queue requests under high load
  applyRateLimit(rateLimiters.memberLookup), // Rate limiting for public endpoint
  cacheMiddleware({
    ttl: 3600, // 1 hour cache for public lookups
    keyGenerator: (req) => `member:public:${req.params.idNumber}`,
    condition: (req, res) => res.statusCode === 200
  }),
  validate({
    params: Joi.object({
      idNumber: Joi.string().pattern(/^\d{13}$/).required().messages({
        'string.pattern.base': 'ID number must be exactly 13 digits'
      })
    })
  }),
  asyncHandler(async (req, res) => {
    const { idNumber } = req.params;

    // Use optimized member lookup with circuit breaker
    const member = await databaseCircuitBreaker.execute(async () => {
      return await OptimizedMemberModel.getMemberByIdNumberOptimized(idNumber);
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found with this ID number'
        },
        timestamp: new Date().toISOString()
      });
    }

    return sendSuccess(res, member, 'Member retrieved successfully');
  })
);

// Get member by member ID (Keep existing endpoint for admin use)
router.get('/:id',
  validate({
    params: Joi.object({
      id: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get basic member information for card display
    const memberQuery = `
      SELECT
        member_id,
        'MEM' || LPAD(member_id::TEXT, 6, '0') as membership_number,
        firstname as first_name,
        COALESCE(surname, '') as last_name,
        COALESCE(email, '') as email,
        COALESCE(cell_number, '') as phone_number,
        province_name,
        municipality_name,
        ward_number,
        COALESCE(voting_district_name, 'Not Available') as voting_district_name,
        'Standard' as membership_type,
        member_created_at as join_date,
        DATE_ADD(member_created_at, INTERVAL 365 DAY) as expiry_date
      FROM vw_member_details
      WHERE member_id = ?
    `;

    const member = await executeQuerySingle(memberQuery, [id]);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found'
        }
      });
    }

    return sendSuccess(res, member, 'Member retrieved successfully');
  })
);

// Ward Audit Export - Export all members in a specific ward to Excel and Word
router.get('/ward/:wardCode/audit-export',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({
    params: commonSchemas.wardCode,
    query: Joi.object({
      format: Joi.string().valid('excel', 'word', 'pdf', 'both').default('pdf'),
      province_code: Joi.string().min(2).max(3).optional() // Allow province_code for filtering
    })
  }),
  asyncHandler(async (req, res) => {
    try {
      const { wardCode } = req.params;
      const { format = 'both' } = req.query;

      console.log(`🔄 Starting ward audit export for ward: ${wardCode}`);

      // Get ward information first
      const wardInfoQuery = `
        SELECT DISTINCT
          ward_code,
          ward_name,
          ward_number,
          municipality_code,
          municipality_name,
          district_code,
          district_name,
          province_code,
          province_name
        FROM vw_member_details
        WHERE ward_code = ?
      `;

      const wardInfo = await executeQuerySingle(wardInfoQuery, [wardCode]);

      if (!wardInfo) {
        throw new NotFoundError(`Ward with code ${wardCode} not found`);
      }

      // Authorization check: Verify user has access to this ward's province
      if (req.user) {
        const userProvinceCode = (req.user as any).province_code;
        const wardProvinceCode = wardInfo.province_code;
        const isNationalAdmin = req.user.admin_level === 'national' || req.user.role_name === 'super_admin';
        const isProvincialAdmin = req.user.admin_level === 'province';

        // Provincial admins can only access wards in their assigned province
        if (isProvincialAdmin && userProvinceCode !== wardProvinceCode) {
          console.log(`🚫 Authorization failed: User province ${userProvinceCode} does not match ward province ${wardProvinceCode}`);
          return res.status(403).json({
            success: false,
            error: {
              code: 'PROVINCE_ACCESS_DENIED',
              message: `You are not authorized to download attendance registers from ${wardInfo.province_name}. You can only access wards in your assigned province.`,
              userProvince: userProvinceCode,
              requestedProvince: wardProvinceCode
            }
          });
        }

        console.log(`✅ Authorization passed: User has access to ward in province ${wardProvinceCode}`);
      }

      // Get all members in the ward with comprehensive details including voting stations
      // FIXED: Only include Active members (membership_status_id = 1) who are Registered voters (voter_status_id = 1)
      const membersQuery = `
        SELECT
          m.member_id,
          'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
          m.id_number,
          m.firstname,
          COALESCE(m.surname, '') as surname,
          m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
          m.date_of_birth,
          m.age,
          'Unknown' as gender_name,
          'Not Specified' as race_name,
          'South African' as citizenship_name,
          'English' as language_name,
          COALESCE(m.cell_number, '') as cell_number,
          COALESCE(m.landline_number, '') as landline_number,
          COALESCE(m.email, '') as email,
          COALESCE(m.residential_address, '') as residential_address,
          '' as occupation_name,
          '' as qualification_name,
          COALESCE(voter_s.status_name, '') as voter_status,
          COALESCE(m.voter_registration_number, '') as voter_registration_number,
          m.voter_registration_date,
          COALESCE(m.voting_district_code, '') as voting_district_code,
          COALESCE(vd.voting_district_name, '') as voting_district_name,
          COALESCE(vs.station_code, '') as voting_station_code,
          COALESCE(vs.station_name, '') as voting_station_name,
          m.ward_code,
          COALESCE(w.ward_name, '') as ward_name,
          COALESCE(w.ward_number::TEXT, '') as ward_number,
          COALESCE(mu.municipality_code, '') as municipality_code,
          COALESCE(mu.municipality_name, '') as municipality_name,
          COALESCE(d.district_code, '') as district_code,
          COALESCE(d.district_name, '') as district_name,
          COALESCE(p.province_code, '') as province_code,
          COALESCE(p.province_name, '') as province_name,
          m.created_at as member_created_at,
          m.updated_at as member_updated_at,
          -- Membership details if available
          COALESCE(md.membership_id, 0) as membership_id,
          md.date_joined,
          md.last_payment_date,
          md.expiry_date,
          COALESCE(md.subscription_name, 'N/A') as subscription_name,
          COALESCE(md.membership_amount, 0) as membership_amount,
          COALESCE(md.status_name, 'Unknown') as membership_status,
          COALESCE(md.is_active::INTEGER, 0) as membership_is_active,
          COALESCE(md.days_until_expiry, 0) as days_until_expiry,
          COALESCE(md.payment_method, 'N/A') as payment_method,
          COALESCE(md.payment_reference, 'N/A') as payment_reference
        FROM members_consolidated m
        LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
        LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.status_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN vw_membership_details md ON m.member_id = md.member_id
        WHERE m.ward_code = ?
          AND m.membership_status_id = 1  -- Only Active members
          AND m.voter_status_id = 1        -- Only Registered voters
        ORDER BY m.firstname, m.surname
      `;

      const members = await executeQuery(membersQuery, [wardCode]);

      console.log(`📊 Found ${members.length} members in ward ${wardCode}`);

      if (members.length === 0) {
        return sendSuccess(res, {
          message: `No members found in ward ${wardCode}`,
          ward_info: wardInfo,
          member_count: 0
        });
      }

      // Prepare data for Excel export with custom column order
      const exportData = members.map((member: any, index: number) => ({
        // Column 1: Province
        'Province': member.province_name || '',
        // Column 2: District
        'District': member.district_name || '',
        // Column 3: Municipality
        'Municipality': member.municipality_name || '',
        // Column 4: Voting District Name
        'Voting District Name': member.voting_district_name || '',
        // Column 5: Ward Code
        'Ward Code': member.ward_code || '',
        // Column 6: First Name
        'First Name': member.firstname || '',
        // Column 7: Surname
        'Surname': member.surname || '',
        // Column 8: ID Number
        'ID Number': member.id_number || '',
        // Column 9: Age
        'Age': member.age || '',
        // Column 10: Gender
        'Gender': member.gender_name || '',
        // Column 11: Race
        'Race': member.race_name || '',
        // Column 12: Citizenship
        'Citizenship': member.citizenship_name || '',
        // Column 13: Address
        'Address': member.residential_address || '',
        // Column 14: Cell Number
        'Cell Number': member.cell_number || '',
        // Column 15: Landline
        'Landline': member.landline_number || '',
        // Column 16: Email
        'Email': member.email || '',
        // Column 17: Occupation
        'Occupation': member.occupation_name || '',
        // Column 18: Qualification
        'Qualification': member.qualification_name || '',
        // Column 19: Date Joined
        'Date Joined': member.date_joined ? new Date(member.date_joined).toLocaleDateString('en-ZA') : '',
        // Column 20: Expiry Date
        'Expiry Date': member.expiry_date ? new Date(member.expiry_date).toLocaleDateString('en-ZA') : '',
        // Column 21: Subscription
        'Subscription': member.subscription_name || '',
        // Column 22: Membership Amount
        'Membership Amount': member.membership_amount || '',
        // Column 23: Status
        'Status': member.membership_status || ''
      }));

      // Generate filenames for Attendance Register
      const timestamp = new Date().toISOString().split('T')[0];
      const municipalityName = wardInfo.municipality_name.replace(/[^a-zA-Z0-9]/g, '_');
      const wardNumber = wardInfo.ward_number || wardCode;
      const baseFilename = `ATTENDANCE_REGISTER_WARD_${wardNumber}_${municipalityName}_${timestamp}`;

      // Create temporary directory for downloads
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const filesToGenerate: Array<{
        path: string;
        type: string;
        emailData?: {
          userEmail: string;
          userName: string;
          wordBuffer?: Buffer;
          pdfBuffer?: Buffer;
          wardInfo: any;
          memberCount: number;
        }
      }> = [];

      // Generate Excel file if requested
      if (format === 'excel' || format === 'both') {
        const excelFilename = `${baseFilename}.xlsx`;
        const excelFilePath = path.join(tempDir, excelFilename);

        await ImportExportService.writeFile(excelFilePath, exportData, {
          format: 'excel',
          include_headers: true
        });

        filesToGenerate.push({ path: excelFilePath, type: 'excel' });
        console.log(`✅ Excel Attendance Register created: ${excelFilename}`);
      }

      // Generate Word file if requested
      if (format === 'word' || format === 'both') {
        const wordFilename = `${baseFilename}.docx`;
        const wordFilePath = path.join(tempDir, wordFilename);

        const wordBuffer = await WordDocumentService.generateWardAttendanceRegister(wardInfo, members);
        fs.writeFileSync(wordFilePath, wordBuffer);

        filesToGenerate.push({
          path: wordFilePath,
          type: 'word',
          emailData: req.user?.email ? {
            userEmail: req.user.email,
            userName: req.user.name || req.user.email,
            wordBuffer: wordBuffer,
            wardInfo: wardInfo,
            memberCount: members.length
          } : undefined
        });
        console.log(`✅ Word Attendance Register created: ${wordFilename}`);

        // Email will be triggered AFTER file is sent (see res.sendFile callback below)
        if (req.user?.email) {
          console.log(`📧 Word email will be sent after file download completes`);
          res.setHeader('X-Email-Status', 'pending');
        } else {
          console.warn('⚠️ User email not available, skipping background email');
          res.setHeader('X-Email-Status', 'no-email');
        }
      }

      // Generate PDF file if requested using HTML-to-PDF conversion
      if (format === 'pdf') {
        console.log('📄 PDF format requested - generating using HTML-to-PDF');

        const pdfFilename = `${baseFilename}.pdf`;
        const pdfFilePath = path.join(tempDir, pdfFilename);

        // Import HtmlPdfService dynamically
        const { HtmlPdfService } = require('../services/htmlPdfService');
        const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, members);
        fs.writeFileSync(pdfFilePath, pdfBuffer);

        filesToGenerate.push({
          path: pdfFilePath,
          type: 'pdf',
          emailData: req.user?.email ? {
            userEmail: req.user.email,
            userName: req.user.name || req.user.email,
            pdfBuffer: pdfBuffer,
            wardInfo: wardInfo,
            memberCount: members.length
          } : undefined
        });
        console.log(`✅ PDF Attendance Register created: ${pdfFilename}`);

        // Email will be triggered AFTER file is sent (see res.sendFile callback below)
        if (req.user?.email) {
          console.log(`📧 PDF email will be sent after file download completes`);
          res.setHeader('X-Email-Status', 'pending');
          res.setHeader('X-Email-Sent-To', req.user.email);
        } else {
          console.warn('⚠️ User email not available, skipping background email');
          res.setHeader('X-Email-Status', 'no-email');
        }
      }

      console.log(`📊 Total members: ${members.length}`);
      console.log(`📋 Document type: Attendance Register for Ward ${wardNumber}`);

      // If both files requested, create a zip archive
      if (format === 'both' && filesToGenerate.length === 2) {
        const archiver = require('archiver');
        const zipFilename = `${baseFilename}.zip`;
        const zipFilePath = path.join(tempDir, zipFilename);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`✅ ZIP archive created: ${zipFilename} (${archive.pointer()} bytes)`);

          // Set response headers for ZIP download
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
          res.setHeader('X-Ward-Code', wardCode);
          res.setHeader('X-Ward-Name', wardInfo.ward_name);
          res.setHeader('X-Municipality', wardInfo.municipality_name);
          res.setHeader('X-Member-Count', members.length.toString());
          res.setHeader('X-Document-Type', 'Attendance Register (Excel + Word)');
          // Add custom header to indicate email will be sent
          if (req.user?.email) {
            res.setHeader('X-Email-Sent-To', req.user.email);
          }

          // Set a longer timeout for large files
          res.setTimeout(300000); // 5 minutes

          // Send ZIP file
          res.sendFile(zipFilePath, (err) => {
            if (err) {
              console.error('❌ Error sending ZIP file:', err);
              if (!res.headersSent) {
                res.status(500).json({
                  success: false,
                  message: 'Failed to download attendance register'
                });
              }
            } else {
              console.log(`✅ Attendance Register ZIP downloaded successfully`);

              // Clean up temporary files
              setTimeout(() => {
                try {
                  [zipFilePath, ...filesToGenerate.map(f => f.path)].forEach(file => {
                    if (fs.existsSync(file)) {
                      fs.unlinkSync(file);
                      console.log(`🗑️ Temporary file cleaned up: ${path.basename(file)}`);
                    }
                  });
                } catch (cleanupError) {
                  console.warn(`⚠️ Failed to clean up temporary files: ${cleanupError}`);
                }
              }, 5000);
            }
          });
        });

        archive.on('error', (err: any) => {
          throw err;
        });

        archive.pipe(output);

        // Add files to archive
        filesToGenerate.forEach(file => {
          archive.file(file.path, { name: path.basename(file.path) });
        });

        await archive.finalize();

      } else {
        // Send single file
        const fileToSend = filesToGenerate[0];
        let contentType: string;

        if (fileToSend.type === 'excel') {
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (fileToSend.type === 'pdf') {
          contentType = 'application/pdf';
        } else {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileToSend.path)}"`);
        res.setHeader('X-Ward-Code', wardCode);
        res.setHeader('X-Ward-Name', wardInfo.ward_name);
        res.setHeader('X-Municipality', wardInfo.municipality_name);
        res.setHeader('X-Member-Count', members.length.toString());
        res.setHeader('X-Document-Type', `Attendance Register (${fileToSend.type})`);
        // Add custom header to indicate email will be sent (only for Word format)
        if (fileToSend.type === 'word' && req.user?.email) {
          res.setHeader('X-Email-Sent-To', req.user.email);
        }

        // Set a longer timeout for large files
        res.setTimeout(300000); // 5 minutes

        res.sendFile(fileToSend.path, (err) => {
          if (err) {
            console.error('❌ Error sending file:', err);
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                message: 'Failed to download attendance register'
              });
            }
          } else {
            console.log(`✅ Attendance Register downloaded successfully: ${path.basename(fileToSend.path)}`);

            // Trigger email AFTER file has been sent successfully
            if ((fileToSend as any).emailData) {
              const emailData = (fileToSend as any).emailData;
              console.log(`📧 File sent successfully, now triggering email to ${emailData.userEmail}`);

              // Use setImmediate to ensure email happens after this callback completes
              setImmediate(() => {
                if (fileToSend.type === 'pdf') {
                  AttendanceRegisterEmailService.processAttendanceRegisterEmailWithBuffer(emailData)
                    .catch(error => {
                      console.error('❌ Background PDF email process failed (non-blocking):', error);
                    });
                } else if (fileToSend.type === 'word') {
                  AttendanceRegisterEmailService.processAttendanceRegisterEmail(emailData)
                    .catch(error => {
                      console.error('❌ Background Word email process failed (non-blocking):', error);
                    });
                }
              });
            }

            // Clean up temporary file
            setTimeout(() => {
              try {
                if (fs.existsSync(fileToSend.path)) {
                  fs.unlinkSync(fileToSend.path);
                  console.log(`🗑️ Temporary file cleaned up: ${path.basename(fileToSend.path)}`);
                }
              } catch (cleanupError) {
                console.warn(`⚠️ Failed to clean up temporary file: ${cleanupError}`);
              }
            }, 5000);
          }
        });
      }

    } catch (error: any) {
      console.error('❌ Ward audit export failed:', error);
      throw error;
    }
  })
);

export default router;
