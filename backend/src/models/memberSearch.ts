import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Advanced search interfaces
export interface AdvancedMemberFilters {
  // Basic search
  search?: string;
  search_fields?: string[]; // ['name', 'id_number', 'email', 'phone', 'address']
  
  // Demographics
  gender_id?: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  age_min?: number;
  age_max?: number;
  date_of_birth_from?: string;
  date_of_birth_to?: string;
  
  // Location filters
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  voting_station_id?: number;
  
  // Contact information
  has_email?: boolean;
  has_cell_number?: boolean;
  has_landline?: boolean;
  email_domain?: string;
  phone_area_code?: string;
  
  // Professional information
  occupation_id?: number;
  qualification_id?: number;
  
  // Voter information
  voter_status_id?: number;
  is_eligible_to_vote?: boolean;
  voter_registration_date_from?: string;
  voter_registration_date_to?: string;
  has_voter_registration_number?: boolean;
  
  // Membership information
  membership_status_id?: number;
  membership_expiry_from?: string;
  membership_expiry_to?: string;
  membership_expired?: boolean;
  membership_active?: boolean;
  membership_date_joined_from?: string;
  membership_date_joined_to?: string;
  
  // Advanced filters
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
  
  // Exclusion filters
  exclude_member_ids?: number[];
  exclude_ward_codes?: string[];
  
  // Custom filters
  custom_sql_filter?: string;
  custom_params?: any[];
}

export interface MemberSearchResult {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  age?: number;
  date_of_birth?: string;
  gender_name?: string;
  race_name?: string;
  citizenship_name?: string;
  language_name?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  residential_address?: string;
  ward_code: string;
  ward_name?: string;
  ward_display?: string;
  municipality_code?: string;
  municipality_name?: string;
  district_code?: string;
  district_name?: string;
  province_code?: string;
  province_name?: string;
  location_display?: string;
  voting_station_name?: string;
  occupation_name?: string;
  qualification_name?: string;
  voter_status?: string;
  voter_registration_number?: string;
  voter_registration_date?: string;
  is_eligible_to_vote?: boolean;
  membership_status?: string;
  membership_expiry_date?: string;
  membership_date_joined?: string;
  membership_status_display?: string;
  search_text?: string;
  created_at: string;
  updated_at: string;
  // Calculated fields
  days_until_expiry?: number;
  membership_duration_years?: number;
  search_relevance_score?: number;
}

export interface SearchStatistics {
  total_results: number;
  demographics: {
    gender_breakdown: { gender: string; count: number }[];
    age_breakdown: { age_range: string; count: number }[];
    race_breakdown: { race: string; count: number }[];
  };
  geographic: {
    province_breakdown: { province: string; count: number }[];
    district_breakdown: { district: string; count: number }[];
    municipality_breakdown: { municipality: string; count: number }[];
  };
  membership: {
    status_breakdown: { status: string; count: number }[];
    expiry_breakdown: { period: string; count: number }[];
  };
  contact: {
    has_email: number;
    has_cell_number: number;
    has_landline: number;
  };
}

export interface SearchSuggestion {
  type: 'member' | 'location' | 'occupation' | 'keyword';
  value: string;
  display: string;
  count?: number;
  category?: string;
}

// Advanced Member Search Model
export class MemberSearchModel {
  // Advanced member search with comprehensive filtering
  static async advancedSearch(
    filters: AdvancedMemberFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'relevance',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<MemberSearchResult[]> {
    try {
      let selectClause = `
        SELECT DISTINCT
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
          m.age,
          m.date_of_birth,
          g.gender_name,
          r.race_name,
          c.citizenship_name,
          l.language_name,
          m.cell_number,
          m.landline_number,
          m.email,
          m.residential_address,
          m.ward_code,
          w.ward_name,
          CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) as ward_display,
          m.municipality_code,
          mu.municipality_name,
          m.district_code,
          d.district_name,
          m.province_code,
          m.province_name,
          CONCAT(w.ward_name, ', ', mu.municipality_name, ', ', d.district_name, ', ', m.province_name) as location_display,
          vs_table.station_name as voting_station_name,
          o.occupation_name,
          q.qualification_name,
          voter_s.status_name as voter_status,
          m.voter_registration_number,
          m.voter_registration_date,
          voter_s.is_eligible_to_vote,
          ms.status_name as membership_status,
          m.expiry_date as membership_expiry_date,
          m.date_joined as membership_date_joined,
          CASE
            WHEN m.expiry_date > CURDATE() THEN 'Active'
            WHEN m.expiry_date <= CURDATE() THEN 'Expired'
            ELSE 'Unknown'
          END as membership_status_display,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, ''), ' ', m.id_number, ' ', COALESCE(m.email, ''), ' ', COALESCE(m.cell_number, '')) as search_text,
          m.created_at,
          m.updated_at,
          DATEDIFF(m.expiry_date, CURDATE()) as days_until_expiry,
          TIMESTAMPDIFF(YEAR, m.date_joined, CURDATE()) as membership_duration_years
      `;

      let fromClause = `
        FROM members_consolidated m
        LEFT JOIN genders g ON m.gender_id = g.gender_id
        LEFT JOIN races r ON m.race_id = r.race_id
        LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
        LEFT JOIN languages l ON m.language_id = l.language_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN voting_stations vs_table ON m.voting_station_id = vs_table.voting_station_id
        LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
        LEFT JOIN qualification_levels q ON m.qualification_id = q.qualification_id
        LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.voter_status_id
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      `;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Build where clause based on filters
      const { whereConditions, queryParams } = this.buildWhereClause(filters);
      whereClause += whereConditions;
      params.push(...queryParams);

      // Add search relevance scoring if search term provided
      if (filters.search) {
        selectClause += `, ${this.buildRelevanceScore(filters.search)} as search_relevance_score`;
      }

      // Build sort clause
      const sortClause = this.buildSortClause(sortBy, sortOrder, !!filters.search);

      const query = `${selectClause} ${fromClause} ${whereClause} ${sortClause} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      return await executeQuery<MemberSearchResult>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to perform advanced member search', error);
    }
  }

  // Get search result count
  static async getSearchCount(filters: AdvancedMemberFilters = {}): Promise<number> {
    try {
      let fromClause = `
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.voter_status_id
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
      `;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      const { whereConditions, queryParams } = this.buildWhereClause(filters);
      whereClause += whereConditions;
      params.push(...queryParams);

      const query = `SELECT COUNT(DISTINCT m.member_id) as count ${fromClause} ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get search count', error);
    }
  }

  // Build where clause for filters
  private static buildWhereClause(filters: AdvancedMemberFilters): { whereConditions: string; queryParams: any[] } {
    let whereConditions = '';
    const queryParams: any[] = [];

    // Basic search
    if (filters.search) {
      const searchFields = filters.search_fields || ['name', 'id_number', 'email', 'phone'];
      const searchConditions: string[] = [];
      
      if (searchFields.includes('name')) {
        searchConditions.push('(m.firstname LIKE ? OR m.surname LIKE ?)');
        queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (searchFields.includes('id_number')) {
        searchConditions.push('m.id_number LIKE ?');
        queryParams.push(`%${filters.search}%`);
      }
      
      if (searchFields.includes('email')) {
        searchConditions.push('m.email LIKE ?');
        queryParams.push(`%${filters.search}%`);
      }
      
      if (searchFields.includes('phone')) {
        searchConditions.push('(m.cell_number LIKE ? OR m.landline_number LIKE ?)');
        queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      
      if (searchFields.includes('address')) {
        searchConditions.push('m.residential_address LIKE ?');
        queryParams.push(`%${filters.search}%`);
      }

      if (searchConditions.length > 0) {
        whereConditions += ` AND (${searchConditions.join(' OR ')})`;
      }
    }

    // Demographics
    if (filters.gender_id) {
      whereConditions += ' AND m.gender_id = ?';
      queryParams.push(filters.gender_id);
    }

    if (filters.race_id) {
      whereConditions += ' AND m.race_id = ?';
      queryParams.push(filters.race_id);
    }

    if (filters.citizenship_id) {
      whereConditions += ' AND m.citizenship_id = ?';
      queryParams.push(filters.citizenship_id);
    }

    if (filters.language_id) {
      whereConditions += ' AND m.language_id = ?';
      queryParams.push(filters.language_id);
    }

    if (filters.age_min) {
      whereConditions += ' AND m.age >= ?';
      queryParams.push(filters.age_min);
    }

    if (filters.age_max) {
      whereConditions += ' AND m.age <= ?';
      queryParams.push(filters.age_max);
    }

    if (filters.date_of_birth_from) {
      whereConditions += ' AND m.date_of_birth >= ?';
      queryParams.push(filters.date_of_birth_from);
    }

    if (filters.date_of_birth_to) {
      whereConditions += ' AND m.date_of_birth <= ?';
      queryParams.push(filters.date_of_birth_to);
    }

    // Location filters
    if (filters.province_code) {
      whereConditions += ' AND w.province_code = ?';
      queryParams.push(filters.province_code);
    }

    if (filters.district_code) {
      whereConditions += ' AND w.district_code = ?';
      queryParams.push(filters.district_code);
    }

    if (filters.municipal_code) {
      whereConditions += ' AND w.municipality_code = ?';
      queryParams.push(filters.municipal_code);
    }

    if (filters.ward_code) {
      whereConditions += ' AND m.ward_code = ?';
      queryParams.push(filters.ward_code);
    }

    if (filters.voting_station_id) {
      whereConditions += ' AND m.voting_station_id = ?';
      queryParams.push(filters.voting_station_id);
    }

    // Contact information
    if (filters.has_email !== undefined) {
      whereConditions += filters.has_email ? ' AND m.email IS NOT NULL AND m.email != ""' : ' AND (m.email IS NULL OR m.email = "")';
    }

    if (filters.has_cell_number !== undefined) {
      whereConditions += filters.has_cell_number ? ' AND m.cell_number IS NOT NULL AND m.cell_number != ""' : ' AND (m.cell_number IS NULL OR m.cell_number = "")';
    }

    if (filters.has_landline !== undefined) {
      whereConditions += filters.has_landline ? ' AND m.landline_number IS NOT NULL AND m.landline_number != ""' : ' AND (m.landline_number IS NULL OR m.landline_number = "")';
    }

    if (filters.email_domain) {
      whereConditions += ' AND m.email LIKE ?';
      queryParams.push(`%@${filters.email_domain}%`);
    }

    if (filters.phone_area_code) {
      whereConditions += ' AND (m.cell_number LIKE ? OR m.landline_number LIKE ?)';
      queryParams.push(`${filters.phone_area_code}%`, `${filters.phone_area_code}%`);
    }

    // Professional information
    if (filters.occupation_id) {
      whereConditions += ' AND m.occupation_id = ?';
      queryParams.push(filters.occupation_id);
    }

    if (filters.qualification_id) {
      whereConditions += ' AND m.qualification_id = ?';
      queryParams.push(filters.qualification_id);
    }

    // Voter information
    if (filters.voter_status_id) {
      whereConditions += ' AND m.voter_status_id = ?';
      queryParams.push(filters.voter_status_id);
    }

    if (filters.is_eligible_to_vote !== undefined) {
      whereConditions += ' AND voter_s.is_eligible_to_vote = ?';
      queryParams.push(filters.is_eligible_to_vote ? 1 : 0);
    }

    if (filters.voter_registration_date_from) {
      whereConditions += ' AND m.voter_registration_date >= ?';
      queryParams.push(filters.voter_registration_date_from);
    }

    if (filters.voter_registration_date_to) {
      whereConditions += ' AND m.voter_registration_date <= ?';
      queryParams.push(filters.voter_registration_date_to);
    }

    if (filters.has_voter_registration_number !== undefined) {
      whereConditions += filters.has_voter_registration_number ? ' AND m.voter_registration_number IS NOT NULL AND m.voter_registration_number != ""' : ' AND (m.voter_registration_number IS NULL OR m.voter_registration_number = "")';
    }

    // Membership information
    if (filters.membership_status_id) {
      whereConditions += ' AND mem.status_id = ?';
      queryParams.push(filters.membership_status_id);
    }

    if (filters.membership_expiry_from) {
      whereConditions += ' AND mem.expiry_date >= ?';
      queryParams.push(filters.membership_expiry_from);
    }

    if (filters.membership_expiry_to) {
      whereConditions += ' AND mem.expiry_date <= ?';
      queryParams.push(filters.membership_expiry_to);
    }

    if (filters.membership_expired !== undefined) {
      whereConditions += filters.membership_expired ? ' AND mem.expiry_date < CURDATE()' : ' AND mem.expiry_date >= CURDATE()';
    }

    if (filters.membership_active !== undefined) {
      whereConditions += filters.membership_active ? ' AND mem.status_id = 1' : ' AND mem.status_id != 1';
    }

    if (filters.membership_date_joined_from) {
      whereConditions += ' AND mem.date_joined >= ?';
      queryParams.push(filters.membership_date_joined_from);
    }

    if (filters.membership_date_joined_to) {
      whereConditions += ' AND mem.date_joined <= ?';
      queryParams.push(filters.membership_date_joined_to);
    }

    // Date filters
    if (filters.created_from) {
      whereConditions += ' AND m.created_at >= ?';
      queryParams.push(filters.created_from);
    }

    if (filters.created_to) {
      whereConditions += ' AND m.created_at <= ?';
      queryParams.push(filters.created_to);
    }

    if (filters.updated_from) {
      whereConditions += ' AND m.updated_at >= ?';
      queryParams.push(filters.updated_from);
    }

    if (filters.updated_to) {
      whereConditions += ' AND m.updated_at <= ?';
      queryParams.push(filters.updated_to);
    }

    // Exclusion filters
    if (filters.exclude_member_ids && filters.exclude_member_ids.length > 0) {
      const placeholders = filters.exclude_member_ids.map(() => '?').join(',');
      whereConditions += ` AND m.member_id NOT IN (${placeholders})`;
      queryParams.push(...filters.exclude_member_ids);
    }

    if (filters.exclude_ward_codes && filters.exclude_ward_codes.length > 0) {
      const placeholders = filters.exclude_ward_codes.map(() => '?').join(',');
      whereConditions += ` AND m.ward_code NOT IN (${placeholders})`;
      queryParams.push(...filters.exclude_ward_codes);
    }

    // Custom SQL filter
    if (filters.custom_sql_filter) {
      whereConditions += ` AND (${filters.custom_sql_filter})`;
      if (filters.custom_params) {
        queryParams.push(...filters.custom_params);
      }
    }

    return { whereConditions, queryParams };
  }

  // Build relevance score for search results
  private static buildRelevanceScore(searchTerm: string): string {
    return `
      (
        CASE 
          WHEN m.firstname = '${searchTerm}' OR m.surname = '${searchTerm}' THEN 100
          WHEN m.id_number = '${searchTerm}' THEN 95
          WHEN m.email = '${searchTerm}' THEN 90
          WHEN m.cell_number = '${searchTerm}' THEN 85
          WHEN CONCAT(m.firstname, ' ', m.surname) = '${searchTerm}' THEN 80
          WHEN m.firstname LIKE '${searchTerm}%' OR m.surname LIKE '${searchTerm}%' THEN 70
          WHEN m.id_number LIKE '${searchTerm}%' THEN 65
          WHEN m.firstname LIKE '%${searchTerm}%' OR m.surname LIKE '%${searchTerm}%' THEN 50
          WHEN m.id_number LIKE '%${searchTerm}%' THEN 45
          WHEN m.email LIKE '%${searchTerm}%' THEN 40
          WHEN m.cell_number LIKE '%${searchTerm}%' THEN 35
          WHEN m.residential_address LIKE '%${searchTerm}%' THEN 20
          ELSE 10
        END
      )
    `;
  }

  // Build sort clause
  private static buildSortClause(sortBy: string, sortOrder: 'asc' | 'desc', hasSearch: boolean): string {
    const validSortColumns = [
      'firstname', 'surname', 'full_name', 'age', 'id_number', 'member_id',
      'gender_name', 'ward_name', 'municipality_name', 'district_name', 'province_name',
      'membership_expiry_date', 'created_at', 'updated_at', 'relevance'
    ];

    let sortColumn = 'member_id';
    
    if (sortBy === 'relevance' && hasSearch) {
      return 'ORDER BY search_relevance_score DESC, firstname ASC';
    } else if (validSortColumns.includes(sortBy)) {
      sortColumn = sortBy;
    }

    return `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
  }

  // Get search statistics for current filters
  static async getSearchStatistics(filters: AdvancedMemberFilters = {}): Promise<SearchStatistics> {
    try {
      const baseQuery = `
        FROM members_consolidated m
        LEFT JOIN genders g ON m.gender_id = g.gender_id
        LEFT JOIN races r ON m.race_id = r.race_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        LEFT JOIN voter_statuses voter_s ON m.voter_status_id = voter_s.voter_status_id
        LEFT JOIN memberships mem ON m.member_id = mem.member_id
        LEFT JOIN membership_statuses ms ON mem.status_id = ms.status_id
      `;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      const { whereConditions, queryParams } = this.buildWhereClause(filters);
      whereClause += whereConditions;
      params.push(...queryParams);

      // Get total count
      const totalQuery = `SELECT COUNT(DISTINCT m.member_id) as total ${baseQuery} ${whereClause}`;
      const totalResult = await executeQuerySingle<{ total: number }>(totalQuery, params);
      const totalResults = totalResult?.total || 0;

      // Get demographics breakdown
      const genderQuery = `
        SELECT g.gender_name as gender, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND g.gender_name IS NOT NULL
        GROUP BY g.gender_name ORDER BY count DESC
      `;
      const genderBreakdown = await executeQuery<{ gender: string; count: number }>(genderQuery, params);

      const ageQuery = `
        SELECT
          CASE
            WHEN m.age < 18 THEN 'Under 18'
            WHEN m.age BETWEEN 18 AND 25 THEN '18-25'
            WHEN m.age BETWEEN 26 AND 35 THEN '26-35'
            WHEN m.age BETWEEN 36 AND 45 THEN '36-45'
            WHEN m.age BETWEEN 46 AND 55 THEN '46-55'
            WHEN m.age BETWEEN 56 AND 65 THEN '56-65'
            WHEN m.age > 65 THEN 'Over 65'
            ELSE 'Unknown'
          END as age_range,
          COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause}
        GROUP BY age_range ORDER BY count DESC
      `;
      const ageBreakdown = await executeQuery<{ age_range: string; count: number }>(ageQuery, params);

      const raceQuery = `
        SELECT r.race_name as race, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND r.race_name IS NOT NULL
        GROUP BY r.race_name ORDER BY count DESC
      `;
      const raceBreakdown = await executeQuery<{ race: string; count: number }>(raceQuery, params);

      // Get geographic breakdown
      const provinceQuery = `
        SELECT p.province_name as province, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND p.province_name IS NOT NULL
        GROUP BY p.province_name ORDER BY count DESC
      `;
      const provinceBreakdown = await executeQuery<{ province: string; count: number }>(provinceQuery, params);

      const districtQuery = `
        SELECT d.district_name as district, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND d.district_name IS NOT NULL
        GROUP BY d.district_name ORDER BY count DESC LIMIT 10
      `;
      const districtBreakdown = await executeQuery<{ district: string; count: number }>(districtQuery, params);

      const municipalityQuery = `
        SELECT mu.municipality_name as municipality, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND mu.municipality_name IS NOT NULL
        GROUP BY mu.municipality_name ORDER BY count DESC LIMIT 10
      `;
      const municipalityBreakdown = await executeQuery<{ municipality: string; count: number }>(municipalityQuery, params);

      // Get membership breakdown
      const statusQuery = `
        SELECT ms.status_name as status, COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND ms.status_name IS NOT NULL
        GROUP BY ms.status_name ORDER BY count DESC
      `;
      const statusBreakdown = await executeQuery<{ status: string; count: number }>(statusQuery, params);

      const expiryQuery = `
        SELECT
          CASE
            WHEN mem.expiry_date < CURDATE() THEN 'Expired'
            WHEN mem.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon (30 days)'
            WHEN mem.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expiring in 3 months'
            WHEN mem.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 180 DAY) THEN 'Expiring in 6 months'
            WHEN mem.expiry_date > DATE_ADD(CURDATE(), INTERVAL 180 DAY) THEN 'Active (6+ months)'
            ELSE 'Unknown'
          END as period,
          COUNT(DISTINCT m.member_id) as count
        ${baseQuery} ${whereClause} AND mem.expiry_date IS NOT NULL
        GROUP BY period ORDER BY count DESC
      `;
      const expiryBreakdown = await executeQuery<{ period: string; count: number }>(expiryQuery, params);

      // Get contact information breakdown
      const contactQuery = `
        SELECT
          COUNT(CASE WHEN m.email IS NOT NULL AND m.email != '' THEN 1 END) as has_email,
          COUNT(CASE WHEN m.cell_number IS NOT NULL AND m.cell_number != '' THEN 1 END) as has_cell_number,
          COUNT(CASE WHEN m.landline_number IS NOT NULL AND m.landline_number != '' THEN 1 END) as has_landline
        ${baseQuery} ${whereClause}
      `;
      const contactResult = await executeQuerySingle<{ has_email: number; has_cell_number: number; has_landline: number }>(contactQuery, params);

      return {
        total_results: totalResults,
        demographics: {
          gender_breakdown: genderBreakdown,
          age_breakdown: ageBreakdown,
          race_breakdown: raceBreakdown
        },
        geographic: {
          province_breakdown: provinceBreakdown,
          district_breakdown: districtBreakdown,
          municipality_breakdown: municipalityBreakdown
        },
        membership: {
          status_breakdown: statusBreakdown,
          expiry_breakdown: expiryBreakdown
        },
        contact: {
          has_email: contactResult?.has_email || 0,
          has_cell_number: contactResult?.has_cell_number || 0,
          has_landline: contactResult?.has_landline || 0
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to get search statistics', error);
    }
  }

  // Get search suggestions based on partial input
  static async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];
      const searchTerm = `%${query}%`;

      // Member name suggestions
      const memberQuery = `
        SELECT DISTINCT
          CONCAT(firstname, ' ', COALESCE(surname, '')) as value,
          CONCAT(firstname, ' ', COALESCE(surname, ''), ' (', id_number, ')') as display,
          'member' as type,
          'Members' as category
        FROM members_consolidated
        WHERE (firstname LIKE ? OR surname LIKE ?)
        AND firstname IS NOT NULL
        ORDER BY firstname
        LIMIT ?
      `;
      const memberSuggestions = await executeQuery<SearchSuggestion>(memberQuery, [searchTerm, searchTerm, Math.ceil(limit * 0.4)]);
      suggestions.push(...memberSuggestions);

      // Location suggestions
      const locationQuery = `
        SELECT DISTINCT
          ward_name as value,
          CONCAT(ward_name, ' (Ward)') as display,
          'location' as type,
          'Locations' as category
        FROM wards
        WHERE ward_name LIKE ?
        ORDER BY ward_name
        LIMIT ?
      `;
      const locationSuggestions = await executeQuery<SearchSuggestion>(locationQuery, [searchTerm, Math.ceil(limit * 0.3)]);
      suggestions.push(...locationSuggestions);

      // Municipality suggestions
      const municipalityQuery = `
        SELECT DISTINCT
          municipality_name as value,
          CONCAT(municipality_name, ' (Municipality)') as display,
          'location' as type,
          'Locations' as category
        FROM municipalities
        WHERE municipality_name LIKE ?
        ORDER BY municipality_name
        LIMIT ?
      `;
      const municipalitySuggestions = await executeQuery<SearchSuggestion>(municipalityQuery, [searchTerm, Math.ceil(limit * 0.2)]);
      suggestions.push(...municipalitySuggestions);

      // Occupation suggestions
      const occupationQuery = `
        SELECT DISTINCT
          occupation_name as value,
          CONCAT(occupation_name, ' (Occupation)') as display,
          'occupation' as type,
          'Occupations' as category
        FROM occupations
        WHERE occupation_name LIKE ?
        ORDER BY occupation_name
        LIMIT ?
      `;
      const occupationSuggestions = await executeQuery<SearchSuggestion>(occupationQuery, [searchTerm, Math.ceil(limit * 0.1)]);
      suggestions.push(...occupationSuggestions);

      return suggestions.slice(0, limit);
    } catch (error) {
      throw createDatabaseError('Failed to get search suggestions', error);
    }
  }

  // Export search results to CSV
  static async exportSearchResults(filters: AdvancedMemberFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<string> {
    try {
      const results = await this.advancedSearch(filters, 10000, 0); // Export up to 10k results

      if (format === 'csv') {
        const headers = [
          'Member ID', 'ID Number', 'First Name', 'Surname', 'Full Name', 'Age', 'Gender',
          'Cell Number', 'Email', 'Ward', 'Municipality', 'District', 'Province',
          'Membership Status', 'Expiry Date', 'Voter Status', 'Created Date'
        ];

        const csvRows = [headers.join(',')];

        for (const member of results) {
          const row = [
            member.member_id,
            `"${member.id_number}"`,
            `"${member.firstname}"`,
            `"${member.surname || ''}"`,
            `"${member.full_name}"`,
            member.age || '',
            `"${member.gender_name || ''}"`,
            `"${member.cell_number || ''}"`,
            `"${member.email || ''}"`,
            `"${member.ward_name || ''}"`,
            `"${member.municipality_name || ''}"`,
            `"${member.district_name || ''}"`,
            `"${member.province_name || ''}"`,
            `"${member.membership_status || ''}"`,
            member.membership_expiry_date || '',
            `"${member.voter_status || ''}"`,
            member.created_at
          ];
          csvRows.push(row.join(','));
        }

        return csvRows.join('\n');
      }

      throw new Error('Excel export not implemented yet');
    } catch (error) {
      throw createDatabaseError('Failed to export search results', error);
    }
  }

  // Save search query for later use
  static async saveSearchQuery(userId: number, queryName: string, filters: AdvancedMemberFilters): Promise<number> {
    try {
      const query = `
        INSERT INTO saved_searches (user_id, query_name, search_filters, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const result = await executeQuery(query, [userId, queryName, JSON.stringify(filters)]);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to save search query', error);
    }
  }

  // Get saved search queries for user
  static async getSavedSearches(userId: number): Promise<any[]> {
    try {
      const query = `
        SELECT id, query_name, search_filters, created_at, updated_at
        FROM saved_searches
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `;

      const results = await executeQuery(query, [userId]);
      return results.map((result: any) => ({
        ...result,
        search_filters: JSON.parse(result.search_filters)
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get saved searches', error);
    }
  }

  // Quick search using the consolidated search view
  static async quickSearch(searchTerm: string, limit: number = 20): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM vw_member_search_consolidated
        WHERE search_text LIKE ?
        ORDER BY
          CASE
            WHEN firstname LIKE ? OR surname LIKE ? THEN 1
            WHEN id_number LIKE ? THEN 2
            WHEN email LIKE ? THEN 3
            ELSE 4
          END,
          firstname ASC
        LIMIT ?
      `;

      const searchPattern = `%${searchTerm}%`;
      const exactPattern = `${searchTerm}%`;

      return await executeQuery(query, [
        searchPattern, exactPattern, exactPattern, exactPattern, exactPattern, limit
      ]);
    } catch (error) {
      throw createDatabaseError('Failed to perform quick search', error);
    }
  }
}
