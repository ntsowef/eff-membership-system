import { Router, Request, Response, NextFunction } from 'express';
import { MemberSearchModel, AdvancedMemberFilters } from '../models/memberSearch';
import { authenticate, requirePermission, applyProvinceFilter, logProvinceAccess } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import { executeQuery, executeQuerySingle } from '../config/database';
import Joi from 'joi';

const router = Router();

// Validation schemas
const advancedSearchSchema = Joi.object({
  // Basic search
  search: Joi.string().max(255).optional(),
  search_fields: Joi.array().items(Joi.string().valid('name', 'id_number', 'email', 'phone', 'address')).optional(),
  
  // Demographics
  gender_id: Joi.number().integer().positive().optional(),
  race_id: Joi.number().integer().positive().optional(),
  citizenship_id: Joi.number().integer().positive().optional(),
  language_id: Joi.number().integer().positive().optional(),
  age_min: Joi.number().integer().min(0).max(120).optional(),
  age_max: Joi.number().integer().min(0).max(120).optional(),
  date_of_birth_from: Joi.date().iso().optional(),
  date_of_birth_to: Joi.date().iso().optional(),
  
  // Location filters
  province_code: Joi.string().max(10).optional(),
  district_code: Joi.string().max(10).optional(),
  municipal_code: Joi.string().max(10).optional(),
  ward_code: Joi.string().max(15).optional(),
  voting_station_id: Joi.number().integer().positive().optional(),
  
  // Contact information
  has_email: Joi.boolean().optional(),
  has_cell_number: Joi.boolean().optional(),
  has_landline: Joi.boolean().optional(),
  email_domain: Joi.string().max(100).optional(),
  phone_area_code: Joi.string().max(10).optional(),
  
  // Professional information
  occupation_id: Joi.number().integer().positive().optional(),
  qualification_id: Joi.number().integer().positive().optional(),
  
  // Voter information
  voter_status_id: Joi.number().integer().positive().optional(),
  is_eligible_to_vote: Joi.boolean().optional(),
  voter_registration_date_from: Joi.date().iso().optional(),
  voter_registration_date_to: Joi.date().iso().optional(),
  has_voter_registration_number: Joi.boolean().optional(),
  
  // Membership information
  membership_status_id: Joi.number().integer().positive().optional(),
  membership_expiry_from: Joi.date().iso().optional(),
  membership_expiry_to: Joi.date().iso().optional(),
  membership_expired: Joi.boolean().optional(),
  membership_active: Joi.boolean().optional(),
  membership_date_joined_from: Joi.date().iso().optional(),
  membership_date_joined_to: Joi.date().iso().optional(),
  
  // Advanced filters
  created_from: Joi.date().iso().optional(),
  created_to: Joi.date().iso().optional(),
  updated_from: Joi.date().iso().optional(),
  updated_to: Joi.date().iso().optional(),
  
  // Exclusion filters
  exclude_member_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  exclude_ward_codes: Joi.array().items(Joi.string().max(15)).optional()
});

const saveSearchSchema = Joi.object({
  query_name: Joi.string().max(255).required(),
  search_filters: Joi.object().required(),
  is_public: Joi.boolean().optional(),
  is_favorite: Joi.boolean().optional()
});

// Advanced member search
router.post('/advanced', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    const { error, value } = advancedSearchSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort_by as string || 'relevance';
    const sortOrder = (req.query.sort_order as string || 'desc') as 'asc' | 'desc';

    const filters: AdvancedMemberFilters = value;

    // No geographic filtering needed - all admins are national level

    const [results, totalCount] = await Promise.all([
      MemberSearchModel.advancedSearch(filters, limit, offset, sortBy, sortOrder),
      MemberSearchModel.getSearchCount(filters)
    ]);

    const executionTime = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limit);

    // Log search activity
    try {
      await executeQuery(
        'INSERT INTO search_history (user_id, search_query, search_filters, results_count, execution_time_ms, search_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user?.id || null,
          filters.search || 'Advanced Search',
          JSON.stringify(filters),
          totalCount,
          executionTime,
          'advanced',
          req.ip,
          req.get('User-Agent') || null
        ]
      );
    } catch (logError) {
      console.error('Failed to log search activity:', logError);
    }

    res.json({
      success: true,
      message: 'Advanced search completed successfully',
      data: {
        results,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        search_info: {
          execution_time_ms: executionTime,
          filters_applied: Object.keys(filters).length,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Quick search (simple text search) with province filtering
router.get('/quick', authenticate, requirePermission('members.read'), applyProvinceFilter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    const searchTerm = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError('Search term must be at least 2 characters long');
    }

    // Log province access for audit
    await logProvinceAccess(req, 'member_quick_search', (req as any).provinceContext?.province_code);

    // Apply province filtering to search
    const provinceCode = (req as any).provinceContext?.province_code;

    // For now, use the existing quickSearch method and filter results if needed
    let results = await MemberSearchModel.quickSearch(searchTerm.trim(), limit);

    // Filter results by province if provincial admin
    if (provinceCode) {
      results = results.filter((member: any) =>
        member.province_code === provinceCode || member.province_name?.includes(provinceCode)
      );
    }
    const executionTime = Date.now() - startTime;

    // Log search activity
    try {
      await executeQuery(
        'INSERT INTO search_history (user_id, search_query, results_count, execution_time_ms, search_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.user?.id || null,
          searchTerm,
          results.length,
          executionTime,
          'quick',
          req.ip,
          req.get('User-Agent') || null
        ]
      );
    } catch (logError) {
      console.error('Failed to log search activity:', logError);
    }

    res.json({
      success: true,
      message: 'Quick search completed successfully',
      data: {
        results,
        search_info: {
          query: searchTerm,
          execution_time_ms: executionTime,
          result_count: results.length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get search suggestions
router.get('/suggestions', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    if (!query || query.trim().length < 2) {
      res.json({
        success: true,
        message: 'Search suggestions retrieved successfully',
        data: {
          suggestions: []
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const suggestions = await MemberSearchModel.getSearchSuggestions(query.trim(), limit);

    res.json({
      success: true,
      message: 'Search suggestions retrieved successfully',
      data: {
        suggestions,
        query: query.trim()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get search statistics
router.post('/statistics', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = advancedSearchSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const filters: AdvancedMemberFilters = value;

    // No geographic filtering needed - all admins are national level

    const statistics = await MemberSearchModel.getSearchStatistics(filters);

    res.json({
      success: true,
      message: 'Search statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export search results
router.post('/export', authenticate, requirePermission('members.export'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = advancedSearchSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const format = req.query.format as string || 'csv';
    if (!['csv', 'excel'].includes(format)) {
      throw new ValidationError('Export format must be csv or excel');
    }

    const filters: AdvancedMemberFilters = value;

    // No geographic filtering needed - all admins are national level

    const exportData = await MemberSearchModel.exportSearchResults(filters, format as 'csv' | 'excel');

    // Log export activity
    await logAudit(
      req.user!.id,
      AuditAction.EXPORT,
      EntityType.MEMBER,
      0,
      undefined,
      { export_format: format, filters_applied: Object.keys(filters).length },
      req
    );

    const filename = `member_search_export_${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    next(error);
  }
});

// Save search query
router.post('/save', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = saveSearchSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const searchId = await MemberSearchModel.saveSearchQuery(
      req.user!.id,
      value.query_name,
      value.search_filters
    );

    res.status(201).json({
      success: true,
      message: 'Search query saved successfully',
      data: {
        search_id: searchId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get saved searches
router.get('/saved', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const savedSearches = await MemberSearchModel.getSavedSearches(req.user!.id);

    res.json({
      success: true,
      message: 'Saved searches retrieved successfully',
      data: {
        saved_searches: savedSearches
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get predefined search filters
router.get('/filters', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = `
      SELECT id, filter_name, filter_category, filter_config, description, usage_count
      FROM search_filters
      WHERE is_active = TRUE
      ORDER BY filter_category, usage_count DESC, filter_name
    `;

    const filters = await executeQuery(query);

    // Group filters by category
    const groupedFilters = filters.reduce((acc: any, filter: any) => {
      if (!acc[filter.filter_category]) {
        acc[filter.filter_category] = [];
      }
      acc[filter.filter_category].push({
        id: filter.id,
        name: filter.filter_name,
        config: JSON.parse(filter.filter_config),
        description: filter.description,
        usage_count: filter.usage_count
      });
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'Search filters retrieved successfully',
      data: {
        filters: groupedFilters,
        categories: Object.keys(groupedFilters)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get search analytics
router.get('/analytics', authenticate, requirePermission('analytics.view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Get search analytics
    const analyticsQuery = `
      SELECT * FROM vw_search_analytics
      WHERE search_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY search_date DESC
      LIMIT 100
    `;
    const analytics = await executeQuery(analyticsQuery, [days]);

    // Get popular searches
    const popularQuery = `
      SELECT * FROM vw_popular_searches
      LIMIT 20
    `;
    const popularSearches = await executeQuery(popularQuery);

    // Get user search activity
    const userActivityQuery = `
      SELECT
        u.name as user_name,
        COUNT(*) as search_count,
        AVG(sh.results_count) as avg_results,
        MAX(sh.created_at) as last_search
      FROM search_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE sh.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY sh.user_id, u.name
      ORDER BY search_count DESC
      LIMIT 10
    `;
    const userActivity = await executeQuery(userActivityQuery, [days]);

    res.json({
      success: true,
      message: 'Search analytics retrieved successfully',
      data: {
        analytics,
        popular_searches: popularSearches,
        user_activity: userActivity,
        period_days: days
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get lookup data for search filters (NO AUTH for development)
router.get('/lookup/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.params.type;
    const search = req.query.search as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let query = '';
    let params: any[] = [];

    switch (type) {
      case 'genders':
        query = 'SELECT gender_id as id, gender_name as name FROM genders ORDER BY gender_name';
        break;
      case 'races':
        query = 'SELECT race_id as id, race_name as name FROM races ORDER BY race_name';
        break;
      case 'citizenships':
        query = 'SELECT citizenship_id as id, citizenship_name as name FROM citizenships ORDER BY citizenship_name';
        break;
      case 'languages':
        query = 'SELECT language_id as id, language_name as name FROM languages ORDER BY language_name';
        break;
      case 'occupations':
        query = search
          ? 'SELECT occupation_id as id, occupation_name as name FROM occupations WHERE occupation_name LIKE ? ORDER BY occupation_name LIMIT ?'
          : 'SELECT occupation_id as id, occupation_name as name FROM occupations ORDER BY occupation_name LIMIT ?';
        params = search ? [`%${search}%`, limit] : [limit];
        break;
      case 'qualifications':
        query = 'SELECT qualification_id as id, qualification_name as name FROM qualification_levels ORDER BY qualification_name';
        break;
      case 'voter_statuses':
        query = 'SELECT voter_status_id as id, status_name as name FROM voter_statuses ORDER BY status_name';
        break;
      case 'provinces':
        query = 'SELECT province_code as id, province_name as name FROM provinces ORDER BY province_name';
        break;
      case 'districts':
        if (req.query.province_code) {
          query = 'SELECT DISTINCT d.district_code as id, d.district_name as name FROM districts d LEFT JOIN wards w ON d.district_code = w.district_code WHERE w.province_code = ? ORDER BY d.district_name';
          params = [req.query.province_code];
        } else {
          query = 'SELECT district_code as id, district_name as name FROM districts ORDER BY district_name LIMIT ?';
          params = [limit];
        }
        break;
      case 'municipalities':
        if (req.query.district_code) {
          query = 'SELECT DISTINCT m.municipality_code as id, m.municipality_name as name FROM municipalities m LEFT JOIN wards w ON m.municipality_code = w.municipality_code WHERE w.district_code = ? ORDER BY m.municipality_name';
          params = [req.query.district_code];
        } else if (req.query.province_code) {
          query = 'SELECT DISTINCT m.municipality_code as id, m.municipality_name as name FROM municipalities m LEFT JOIN wards w ON m.municipality_code = w.municipality_code WHERE w.province_code = ? ORDER BY m.municipality_name';
          params = [req.query.province_code];
        } else {
          query = 'SELECT municipality_code as id, municipality_name as name FROM municipalities ORDER BY municipality_name LIMIT ?';
          params = [limit];
        }
        break;
      case 'wards':
        if (req.query.municipal_code) {
          query = 'SELECT ward_code as id, CONCAT("Ward ", ward_number, " - ", ward_name) as name FROM wards WHERE municipality_code = ?';
          params = [req.query.municipal_code];
          if (search) {
            query += ' AND (ward_name LIKE ? OR ward_code LIKE ? OR CAST(ward_number AS CHAR) LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }
          query += ' ORDER BY ward_number LIMIT ?';
          params.push(limit);
        } else if (req.query.district_code) {
          query = 'SELECT ward_code as id, CONCAT("Ward ", ward_number, " - ", ward_name) as name FROM wards WHERE district_code = ?';
          params = [req.query.district_code];
          if (search) {
            query += ' AND (ward_name LIKE ? OR ward_code LIKE ? OR CAST(ward_number AS CHAR) LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }
          query += ' ORDER BY ward_number LIMIT ?';
          params.push(limit);
        } else if (req.query.province_code) {
          query = 'SELECT ward_code as id, CONCAT("Ward ", ward_number, " - ", ward_name) as name FROM wards WHERE province_code = ?';
          params = [req.query.province_code];
          if (search) {
            query += ' AND (ward_name LIKE ? OR ward_code LIKE ? OR CAST(ward_number AS CHAR) LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }
          query += ' ORDER BY ward_number LIMIT ?';
          params.push(limit);
        } else {
          query = 'SELECT ward_code as id, CONCAT("Ward ", ward_number, " - ", ward_name) as name FROM wards';
          if (search) {
            query += ' WHERE (ward_name LIKE ? OR ward_code LIKE ? OR CAST(ward_number AS CHAR) LIKE ?)';
            params = [`%${search}%`, `%${search}%`, `%${search}%`];
          }
          query += ' ORDER BY ward_number LIMIT ?';
          params.push(limit);
        }
        break;
      case 'voting_stations':
        {
          query = `
            SELECT
              vs.voting_station_id as id,
              vs.station_name as name,
              vs.station_code,
              vs.address,
              vs.ward_code,
              COUNT(m.member_id) as member_count
            FROM voting_stations vs
            LEFT JOIN members m ON vs.voting_station_id = m.voting_station_id
            WHERE vs.is_active = 1
          `;
          if (req.query.ward_code) {
            query += ' AND vs.ward_code = ?';
            params.push(req.query.ward_code);
          }
          if (search) {
            query += ' AND (vs.station_name LIKE ? OR vs.station_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
          }
          query += ' GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address, vs.ward_code';
          query += ' ORDER BY vs.station_name LIMIT ?';
          params.push(limit);
        }
        break;
      case 'voting_districts':
        {
          query = `
            SELECT
              vd.vd_code as id,
              vd.vd_name as name,
              vd.voting_district_number,
              vd.ward_code,
              COUNT(m.member_id) as member_count
            FROM voting_districts vd
            LEFT JOIN members m ON REPLACE(CAST(vd.vd_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
            WHERE vd.is_active = 1
          `;
          if (req.query.ward_code) {
            query += ' AND vd.ward_code = ?';
            params.push(req.query.ward_code);
          }
          if (search) {
            query += " AND (vd.vd_name LIKE ? OR vd.vd_code LIKE ? OR REPLACE(CAST(vd.vd_code AS CHAR), '.0', '') LIKE REPLACE(?, '.0', '') OR CAST(vd.voting_district_number AS CHAR) LIKE ? )";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
          }
          query += ' GROUP BY vd.vd_code, vd.vd_name, vd.voting_district_number, vd.ward_code';
          query += ' ORDER BY vd.voting_district_number, vd.vd_name LIMIT ?';
          params.push(limit);
        }
        break;
      default:
        throw new ValidationError('Invalid lookup type');
    }

    const results = await executeQuery(query, params);

    res.json({
      success: true,
      message: `${type} lookup data retrieved successfully`,
      data: {
        results,
        type,
        count: results.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Execute saved search
router.get('/saved/:id/execute', authenticate, requirePermission('members.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchId = parseInt(req.params.id);
    if (isNaN(searchId)) {
      throw new ValidationError('Invalid search ID');
    }

    // Get saved search
    const savedSearchQuery = `
      SELECT * FROM saved_searches
      WHERE id = ? AND (user_id = ? OR is_public = TRUE)
    `;
    const savedSearches = await executeQuery(savedSearchQuery, [searchId, req.user!.id]);

    if (savedSearches.length === 0) {
      throw new NotFoundError('Saved search not found');
    }

    const savedSearch = savedSearches[0];
    const filters: AdvancedMemberFilters = JSON.parse(savedSearch.search_filters);

    // No geographic filtering needed - all admins are national level

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort_by as string || 'relevance';
    const sortOrder = (req.query.sort_order as string || 'desc') as 'asc' | 'desc';

    const startTime = Date.now();
    const [results, totalCount] = await Promise.all([
      MemberSearchModel.advancedSearch(filters, limit, offset, sortBy, sortOrder),
      MemberSearchModel.getSearchCount(filters)
    ]);

    const executionTime = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limit);

    // Update usage count and last used
    await executeQuery(
      'UPDATE saved_searches SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [searchId]
    );

    // Log search activity
    try {
      await executeQuery(
        'INSERT INTO search_history (user_id, search_query, search_filters, results_count, execution_time_ms, search_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user?.id || null,
          savedSearch.query_name,
          savedSearch.search_filters,
          totalCount,
          executionTime,
          'saved',
          req.ip,
          req.get('User-Agent') || null
        ]
      );
    } catch (logError) {
      console.error('Failed to log search activity:', logError);
    }

    res.json({
      success: true,
      message: 'Saved search executed successfully',
      data: {
        results,
        saved_search: {
          id: savedSearch.id,
          name: savedSearch.query_name,
          usage_count: savedSearch.usage_count + 1
        },
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        search_info: {
          execution_time_ms: executionTime,
          filters_applied: Object.keys(filters).length,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get members by voting district (NO AUTH for development)
router.get('/members-by-voting-district/:votingDistrictCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { votingDistrictCode } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    // Get members in this voting district using the members_with_voting_districts view
    const query = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        m.membership_type as membership_status,
        m.member_created_at as membership_date,
        m.voting_district_name,
        m.voting_district_number,
        m.ward_name,
        m.ward_number,
        m.municipality_name,
        m.district_name,
        m.province_name
      FROM members_with_voting_districts m
      WHERE REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
      ORDER BY m.firstname, COALESCE(m.surname, '')
      LIMIT ? OFFSET ?
    `;

    const members = await executeQuery(query, [votingDistrictCode, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members_with_voting_districts m
      WHERE REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
    `;

    const countResult = await executeQuerySingle(countQuery, [votingDistrictCode]);
    const total = countResult?.total || 0;

    // Get voting district info from the first member record (since they all have the same district info)
    const districtQuery = `
      SELECT
        m.voting_district_code as vd_code,
        m.voting_district_name as vd_name,
        m.voting_district_number,
        m.ward_name,
        m.ward_number,
        m.municipality_name as municipal_name,
        m.district_name,
        m.province_name
      FROM members_with_voting_districts m
      WHERE REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(? AS CHAR), '.0', '')
      LIMIT 1
    `;

    const districtInfo = await executeQuerySingle(districtQuery, [votingDistrictCode]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    res.json({
      success: true,
      data: {
        members,
        district_info: districtInfo,
        pagination
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get members by voting station (NO AUTH for development)
router.get('/members-by-voting-station/:votingStationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { votingStationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    // Get members in this voting station using the members table directly
    const query = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as cell_number,
        m.membership_type as membership_status,
        m.member_created_at as membership_date,
        COALESCE(vs.station_name, 'Unknown') as voting_station_name,
        vs.station_code,
        COALESCE(vs.address, 'Address not available') as voting_station_address,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        w.ward_name,
        w.ward_number,
        mu.municipal_name,
        d.district_name,
        p.province_name
      FROM members m
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      LEFT JOIN voting_districts vd ON vs.vd_code = vd.vd_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE m.voting_station_id = ?
      ORDER BY m.firstname, COALESCE(m.surname, '')
      LIMIT ? OFFSET ?
    `;

    const members = await executeQuery(query, [votingStationId, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM members m
      WHERE m.voting_station_id = ?
    `;

    const countResult = await executeQuerySingle(countQuery, [votingStationId]);
    const total = countResult?.total || 0;

    // Get voting station info
    const stationQuery = `
      SELECT
        vs.voting_station_id,
        vs.station_name,
        vs.station_code,
        vs.address,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        w.ward_name,
        w.ward_number,
        mu.municipal_name,
        d.district_name,
        p.province_name
      FROM voting_stations vs
      LEFT JOIN voting_districts vd ON vs.vd_code = vd.vd_code
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE vs.voting_station_id = ?
      LIMIT 1
    `;

    const stationInfo = await executeQuerySingle(stationQuery, [votingStationId]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };

    res.json({
      success: true,
      data: {
        members,
        station_info: stationInfo,
        pagination
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
