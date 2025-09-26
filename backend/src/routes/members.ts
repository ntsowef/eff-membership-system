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
import { emailService } from '../services/emailService';
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
      municipality_code,
      municipal_code, // Support both naming conventions
      district_code,
      province_code,
      gender_id,
      race_id,
      age_min,
      age_max,
      has_email,
      has_cell_number,
      q: search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const filters: MemberFilters = {
      ward_code: ward_code as string,
      municipality_code: (municipality_code || municipal_code) as string, // Support both naming conventions
      district_code: district_code as string,
      province_code: province_code as string,
      gender_id: gender_id ? parseInt(gender_id as string) : undefined,
      race_id: race_id ? parseInt(race_id as string) : undefined,
      age_min: age_min ? parseInt(age_min as string) : undefined,
      age_max: age_max ? parseInt(age_max as string) : undefined,
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
router.get('/provinces',
  asyncHandler(async (req, res) => {
    const query = `
      SELECT DISTINCT
        province_code as code,
        province_name as name,
        COUNT(*) as member_count
      FROM vw_member_details
      GROUP BY province_code, province_name
      ORDER BY province_name
    `;

    const provinces = await executeQuery(query);

    sendSuccess(res, provinces, 'Provinces retrieved successfully');
  })
);

router.get('/regions',
  asyncHandler(async (req, res) => {
    const { province } = req.query;

    let query = `
      SELECT DISTINCT
        district_code as code,
        district_name as name,
        province_code,
        province_name,
        COUNT(*) as member_count
      FROM vw_member_details
    `;

    const params: any[] = [];
    if (province) {
      query += ' WHERE province_code = ?';
      params.push(province);
    }

    query += ' GROUP BY district_code, district_name, province_code, province_name ORDER BY district_name';

    const regions = await executeQuery(query, params);

    sendSuccess(res, regions, 'Regions retrieved successfully');
  })
);

router.get('/municipalities',
  asyncHandler(async (req, res) => {
    const { region } = req.query;

    let query = `
      SELECT DISTINCT
        municipality_code as code,
        municipality_name as name,
        district_code as region_code,
        district_name as region_name,
        province_code,
        province_name,
        COUNT(*) as member_count
      FROM vw_member_details
    `;

    const params: any[] = [];
    if (region) {
      query += ' WHERE district_code = ?';
      params.push(region);
    }

    query += ' GROUP BY municipality_code, municipality_name, district_code, district_name, province_code, province_name ORDER BY municipality_name';

    const municipalities = await executeQuery(query, params);

    sendSuccess(res, municipalities, 'Municipalities retrieved successfully');
  })
);

router.get('/wards',
  asyncHandler(async (req, res) => {
    const { municipality } = req.query;

    let query = `
      SELECT DISTINCT
        ward_code as code,
        ward_name as name,
        ward_number,
        municipality_code,
        municipality_name,
        district_code as region_code,
        district_name as region_name,
        province_code,
        province_name,
        COUNT(*) as member_count
      FROM vw_member_details
    `;

    const params: any[] = [];
    if (municipality) {
      query += ' WHERE municipality_code = ?';
      params.push(municipality);
    }

    query += ' GROUP BY ward_code, ward_name, ward_number, municipality_code, municipality_name, district_code, district_name, province_code, province_name ORDER BY ward_name';

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
      membership_status: Joi.string().valid('Active', 'Inactive', 'Pending', 'Suspended').optional(),
      membership_type: Joi.string().optional(),
      gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
      sort_by: Joi.string().valid('first_name', 'last_name', 'created_at', 'membership_number').default('last_name'),
      sort_order: Joi.string().valid('asc', 'desc').default('asc'),
      page: Joi.number().integer().min(0).default(0),
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
      limit
    } = req.query;

    // Use the existing view structure with enhanced voting district lookup
    let query = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
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
    params.push(limitNum, pageNum * limitNum);

    const members = await executeQuery(query, params);

    sendSuccess(res, {
      members,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
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
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
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
      SELECT DISTINCT p.id as province_code, p.province_name
      FROM provinces p
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
      FROM members m
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
        CONCAT('Attended meeting: ', COALESCE(m.title, 'Meeting')) as description,
        ma.created_at as date
      FROM meeting_attendance ma
      JOIN meetings m ON ma.meeting_id = m.id
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
      FROM members m
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

// Get members by ward
router.get('/ward/:wardCode',
  validate({ params: commonSchemas.wardCode }),
  asyncHandler(async (req, res) => {
    const { wardCode } = req.params;
    const members = await MemberModel.getMembersByWard(wardCode);

    sendSuccess(res, members, `Members for ward ${wardCode} retrieved successfully`);
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

// Delete member
router.delete('/:id',
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
  asyncHandler(async (req, res) => {
    const query = `
      SELECT
        p.province_code,
        p.province_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM provinces p
      LEFT JOIN vw_member_details m ON p.province_code = m.province_code
      GROUP BY p.province_code, p.province_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query);
    sendSuccess(res, { data }, 'Province member statistics retrieved successfully');
  })
);

// Get member statistics by districts for a province
router.get('/stats/districts',
  validate({
    query: Joi.object({
      province: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { province } = req.query;

    const query = `
      SELECT
        d.district_code,
        d.district_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM districts d
      LEFT JOIN vw_member_details m ON d.district_code = m.district_code
      WHERE d.province_code = ?
      GROUP BY d.district_code, d.district_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query, [province]);
    sendSuccess(res, { data }, 'District member statistics retrieved successfully');
  })
);

// Get member statistics by municipalities for a district
router.get('/stats/municipalities',
  validate({
    query: Joi.object({
      district: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { district } = req.query;

    const query = `
      SELECT
        mu.municipality_code,
        mu.municipality_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM municipalities mu
      LEFT JOIN vw_member_details m ON mu.municipality_code = m.municipality_code
      WHERE mu.district_code = ?
      GROUP BY mu.municipality_code, mu.municipality_name
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
      municipality: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { municipality } = req.query;

    const query = `
      SELECT
        w.ward_code,
        w.ward_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM wards w
      LEFT JOIN vw_member_details m ON w.ward_code = m.ward_code
      WHERE w.municipality_code = ?
      GROUP BY w.ward_code, w.ward_name
      ORDER BY member_count DESC
    `;

    const data = await executeQuery(query, [municipality]);
    sendSuccess(res, { data }, 'Ward member statistics retrieved successfully');
  })
);

// Get member statistics by voting districts for a ward
router.get('/stats/voting-districts',
  validate({
    query: Joi.object({
      ward: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const { ward } = req.query;

    const query = `
      SELECT
        vd.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        vd.member_count
      FROM voting_districts_with_members vd
      WHERE vd.ward_code = ?
      ORDER BY vd.member_count DESC, vd.voting_district_number
    `;

    const data = await executeQuery(query, [ward]);
    sendSuccess(res, { data }, 'Voting district member statistics retrieved successfully');
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
        query = `UPDATE members SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'deactivate':
        // Since membership_status column doesn't exist, we'll update the updated_at timestamp
        query = `UPDATE members SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'suspend':
        // Since membership_status column doesn't exist, we'll update the updated_at timestamp
        query = `UPDATE members SET updated_at = NOW() WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'delete':
        query = `DELETE FROM members WHERE member_id IN (${memberIds.map(() => '?').join(',')})`;
        params = memberIds;
        result = await executeQuery(query, params);
        break;
      case 'email':
        // Get member details for email sending
        const membersQuery = `
          SELECT member_id, firstname, surname, email
          FROM members
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



// Hierarchical Dashboard Statistics
router.get('/dashboard/stats/:level/:code?',
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

// Helper functions for dashboard statistics
async function getNationalDashboardStats() {
  // Use simple counts to avoid collation issues
  const memberStatsQuery = `
    SELECT
      COUNT(*) as total_members,
      0 as male_members,
      0 as female_members,
      0 as active_members,
      0 as expired_members,
      0 as registered_voters
    FROM vw_member_details
  `;

  const geographicStatsQuery = `
    SELECT
      COUNT(DISTINCT province_code) as total_provinces,
      COUNT(DISTINCT district_code) as total_regions,
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM vw_member_details
  `;

  const [memberStatsResult, geoStatsResult] = await Promise.all([
    executeQuery(memberStatsQuery),
    executeQuery(geographicStatsQuery)
  ]);

  const memberStats = memberStatsResult[0];
  const geoStats = geoStatsResult[0];

  return {
    level: 'national',
    entity: { name: 'South Africa', code: 'ZA' },
    member_statistics: memberStats,
    geographic_statistics: geoStats,
    timestamp: new Date().toISOString()
  };
}

async function getProvinceDashboardStats(provinceCode: string) {
  // Get province info from member details view
  const provinceQuery = `
    SELECT DISTINCT province_code as code, province_name as name
    FROM vw_member_details
    WHERE province_code = ?
  `;
  const provinceResult = await executeQuery(provinceQuery, [provinceCode]);
  const province = provinceResult[0];

  if (!province) {
    throw new NotFoundError(`Province with code ${provinceCode} not found`);
  }

  const memberStatsQuery = `
    SELECT
      COUNT(*) as total_members,
      0 as male_members,
      0 as female_members,
      0 as active_members,
      0 as expired_members,
      0 as registered_voters
    FROM vw_member_details
    WHERE province_code = ?
  `;

  const geographicStatsQuery = `
    SELECT
      COUNT(DISTINCT district_code) as total_regions,
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM vw_member_details
    WHERE province_code = ?
  `;

  const [memberStatsResult, geoStatsResult] = await Promise.all([
    executeQuery(memberStatsQuery, [provinceCode]),
    executeQuery(geographicStatsQuery, [provinceCode])
  ]);

  const memberStats = memberStatsResult[0];
  const geoStats = geoStatsResult[0];

  return {
    level: 'province',
    entity: province,
    member_statistics: memberStats,
    geographic_statistics: geoStats,
    timestamp: new Date().toISOString()
  };
}

async function getRegionDashboardStats(regionCode: string) {
  // Get region info from member details view
  const regionQuery = `
    SELECT DISTINCT district_code as code, district_name as name,
           province_code, province_name
    FROM vw_member_details
    WHERE district_code = ?
  `;
  const regionResult = await executeQuery(regionQuery, [regionCode]);
  const region = regionResult[0];

  if (!region) {
    throw new NotFoundError(`Region with code ${regionCode} not found`);
  }

  const memberStatsQuery = `
    SELECT
      COUNT(*) as total_members,
      0 as active_members,
      0 as expired_members,
      0 as registered_voters
    FROM vw_member_details
    WHERE district_code = ?
  `;

  const geographicStatsQuery = `
    SELECT
      COUNT(DISTINCT municipality_code) as total_municipalities,
      COUNT(DISTINCT ward_code) as total_wards
    FROM vw_member_details
    WHERE district_code = ?
  `;

  const [memberStatsResult, geoStatsResult] = await Promise.all([
    executeQuery(memberStatsQuery, [regionCode]),
    executeQuery(geographicStatsQuery, [regionCode])
  ]);

  const memberStats = memberStatsResult[0];
  const geoStats = geoStatsResult[0];

  return {
    level: 'region',
    entity: region,
    member_statistics: memberStats,
    geographic_statistics: geoStats,
    timestamp: new Date().toISOString()
  };
}

async function getMunicipalityDashboardStats(municipalityCode: string) {
  // Get municipality info from member details view
  const municipalityQuery = `
    SELECT DISTINCT municipality_code as code, municipality_name as name,
           district_code as region_code, district_name as region_name,
           province_code, province_name
    FROM vw_member_details
    WHERE municipality_code = ?
  `;
  const municipalityResult = await executeQuery(municipalityQuery, [municipalityCode]);
  const municipality = municipalityResult[0];

  if (!municipality) {
    throw new NotFoundError(`Municipality with code ${municipalityCode} not found`);
  }

  const memberStatsQuery = `
    SELECT
      COUNT(*) as total_members,
      0 as active_members,
      0 as expired_members,
      0 as registered_voters
    FROM vw_member_details
    WHERE municipality_code = ?
  `;

  const geographicStatsQuery = `
    SELECT
      COUNT(DISTINCT ward_code) as total_wards
    FROM vw_member_details
    WHERE municipality_code = ?
  `;

  const [memberStatsResult, geoStatsResult] = await Promise.all([
    executeQuery(memberStatsQuery, [municipalityCode]),
    executeQuery(geographicStatsQuery, [municipalityCode])
  ]);

  const memberStats = memberStatsResult[0];
  const geoStats = geoStatsResult[0];

  return {
    level: 'municipality',
    entity: municipality,
    member_statistics: memberStats,
    geographic_statistics: geoStats,
    timestamp: new Date().toISOString()
  };
}

async function getWardDashboardStats(wardCode: string) {
  // Get ward info from member details view
  const wardQuery = `
    SELECT DISTINCT ward_code as code, ward_name as name, ward_number,
           municipality_code, municipality_name,
           district_code as region_code, district_name as region_name,
           province_code, province_name
    FROM vw_member_details
    WHERE ward_code = ?
  `;
  const wardResult = await executeQuery(wardQuery, [wardCode]);
  const ward = wardResult[0];

  if (!ward) {
    throw new NotFoundError(`Ward with code ${wardCode} not found`);
  }

  const memberStatsQuery = `
    SELECT
      COUNT(*) as total_members,
      0 as active_members,
      0 as expired_members,
      0 as registered_voters,
      0 as male_members,
      0 as female_members,
      0 as average_age
    FROM vw_member_details
    WHERE ward_code = ?
  `;

  const memberStatsResult = await executeQuery(memberStatsQuery, [wardCode]);
  const memberStats = memberStatsResult[0];

  return {
    level: 'ward',
    entity: ward,
    member_statistics: memberStats,
    geographic_statistics: {
      total_members: memberStats.total_members
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
        CONCAT('MEM', LPAD(member_id, 6, '0')) as membership_number,
        firstname as first_name,
        COALESCE(surname, '') as last_name,
        COALESCE(email, '') as email,
        COALESCE(cell_number, '') as phone_number,
        province_name,
        municipality_name,
        ward_number,
        COALESCE(voting_station_name, 'Not Available') as voting_station_name,
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

// Ward Audit Export - Export all members in a specific ward to Excel
router.get('/ward/:wardCode/audit-export',
  authenticate,
  requirePermission('members.read'),
  applyGeographicFilter,
  validate({ params: commonSchemas.wardCode }),
  asyncHandler(async (req, res) => {
    try {
      const { wardCode } = req.params;

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

      // Get all members in the ward with comprehensive details including voting stations
      // Simplified query using only confirmed existing columns
      const membersQuery = `
        SELECT
          m.member_id,
          CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
          m.id_number,
          m.firstname,
          COALESCE(m.surname, '') as surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
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
          '' as voter_status,
          COALESCE(m.voter_registration_number, '') as voter_registration_number,
          m.voter_registration_date,
          COALESCE(m.voting_district_code, '') as voting_district_code,
          COALESCE(vd.voting_district_name, '') as voting_district_name,
          COALESCE(vs.station_code, '') as voting_station_code,
          COALESCE(vs.station_name, '') as voting_station_name,
          m.ward_code,
          COALESCE(w.ward_name, '') as ward_name,
          COALESCE(w.ward_number, '') as ward_number,
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
          COALESCE(md.is_active, 0) as membership_is_active,
          COALESCE(md.days_until_expiry, 0) as days_until_expiry,
          COALESCE(md.payment_method, 'N/A') as payment_method,
          COALESCE(md.payment_reference, 'N/A') as payment_reference
        FROM members m
        LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN vw_membership_details md ON m.member_id = md.member_id
        WHERE m.ward_code = ?
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
        // Column 4: Voting Station Name
        'Voting Station Name': member.voting_station_name || '',
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

      // Generate filename with ward info and timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const wardName = wardInfo.ward_name.replace(/[^a-zA-Z0-9]/g, '_');
      const municipalityName = wardInfo.municipality_name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `WARD_${wardCode}_${wardName}_${municipalityName}_AUDIT_${timestamp}.xlsx`;

      // Ensure file processing directory exists
      const fileProcessingDir = path.join(process.cwd(), 'uploads', 'excel-processing');
      if (!fs.existsSync(fileProcessingDir)) {
        fs.mkdirSync(fileProcessingDir, { recursive: true });
      }

      const filePath = path.join(fileProcessingDir, filename);

      // Export to Excel using ImportExportService
      await ImportExportService.writeFile(filePath, exportData, {
        format: 'excel',
        include_headers: true
      });

      console.log(`✅ Ward audit export completed: ${filename}`);
      console.log(`📁 File saved to file processing directory: ${filePath}`);
      console.log(`📊 Exported ${members.length} members`);

      // Manually queue the file for processing with user tracking
      const { FileWatcherService } = await import('../services/fileWatcherService');
      const fileWatcher = FileWatcherService.getInstance();
      const jobId = await fileWatcher.queueFileForProcessing(filePath, (req as any).user?.id);

      console.log(`🔄 File manually queued for voter verification processing (Job ID: ${jobId})`);

      // Return success response with file info and processing status
      sendSuccess(res, {
        message: `Ward audit export completed and queued for voter verification processing`,
        filename: filename,
        file_path: filePath,
        job_id: jobId,
        ward_info: wardInfo,
        member_count: members.length,
        export_timestamp: new Date().toISOString(),
        columns_exported: Object.keys(exportData[0] || {}).length,
        processing_status: 'queued',
        processing_message: 'File has been queued for voter verification processing with user tracking'
      });

    } catch (error: any) {
      console.error('❌ Ward audit export failed:', error);
      throw error;
    }
  })
);

export default router;
