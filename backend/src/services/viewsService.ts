import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export class ViewsService {
  // Create members with voting districts view
  static async createMembersVotingDistrictViews(): Promise<void> {
    try {
      // Drop existing views
      await executeQuery('DROP VIEW IF EXISTS members_with_voting_districts');
      await executeQuery('DROP VIEW IF EXISTS members_by_voting_district_summary');
      await executeQuery('DROP VIEW IF EXISTS geographic_membership_distribution');

      // Create main members with voting districts view
      const mainViewQuery = `
        CREATE VIEW members_with_voting_districts AS
        SELECT
          -- Member basic information
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.firstname || ' ' || COALESCE(m.surname || '') as full_name,
          m.age,
          m.date_of_birth,
          m.gender_id,
          m.race_id,
          m.citizenship_id,
          m.language_id,

          -- Contact information
          m.residential_address,
          m.cell_number,
          m.landline_number,
          m.email,

          -- Professional information
          m.occupation_id,
          m.qualification_id,

          -- Voter information
          m.voter_status_id,
          m.voter_registration_number,
          m.voter_registration_date,
          m.voting_station_id,
          
          -- Complete Geographic Hierarchy
          m.voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          vd.latitude as voting_district_latitude,
          vd.longitude as voting_district_longitude,
          
          m.ward_code,
          w.ward_name,
          w.ward_number,
          
          w.municipal_code,
          mu.municipal_name,
          
          mu.district_code,
          d.district_name,
          
          d.province_code,
          p.province_name,
          
          -- Geographic hierarchy as concatenated string
          p.province_name || ' → ' || d.district_name || ' → ' || mu.municipal_name || ' → ' || 'Ward ' || w.ward_number || CASE 
              WHEN vd.voting_district_name IS NOT NULL 
              THEN CONCAT(' → VD ' || vd.voting_district_number || ' (' || vd.voting_district_name || '')
              ELSE ''
            END
          ) as full_geographic_hierarchy,
          
          -- Membership information
          m.membership_type,
          m.application_id,
          
          -- Timestamps
          m.created_at as member_created_at,
          m.updated_at as member_updated_at,
          
          -- Calculated fields
          CASE 
            WHEN m.voting_district_code IS NOT NULL THEN 'Yes'
            ELSE 'No'
          END as has_voting_district,
          
          CASE 
            WHEN m.voter_registration_number IS NOT NULL THEN 'Registered'
            ELSE 'Not Registered'
          END as voter_registration_status,
          
          -- Age group classification
          CASE 
            WHEN m.age IS NULL THEN 'Unknown'
            WHEN m.age < 18 THEN 'Under 18'
            WHEN m.age BETWEEN 18 AND 25 THEN '18-25'
            WHEN m.age BETWEEN 26 AND 35 THEN '26-35'
            WHEN m.age BETWEEN 36 AND 45 THEN '36-45'
            WHEN m.age BETWEEN 46 AND 55 THEN '46-55'
            WHEN m.age BETWEEN 56 AND 65 THEN '56-65'
            ELSE '65+'
          END as age_group

        FROM members_consolidated m

        -- Geographic joins (complete hierarchy)
        LEFT JOIN voting_districts vd ON REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '')
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
      `;

      await executeQuery(mainViewQuery);

      // Create members by voting district summary view
      const summaryViewQuery = `
        CREATE VIEW members_by_voting_district_summary AS
        SELECT 
          vd.vd_code as voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          w.ward_code,
          w.ward_name,
          w.ward_number,
          mu.municipal_name,
          d.district_name,
          p.province_name,
          COUNT(m.member_id) as total_members,
          COUNT(CASE WHEN m.voter_registration_number IS NOT NULL THEN 1 END) as registered_voters,
          COUNT(CASE WHEN m.gender_id = 1 THEN 1 END) as male_members,
          COUNT(CASE WHEN m.gender_id = 2 THEN 1 END) as female_members,
          ROUND(AVG(m.age), 1) as average_age,
          MIN(m.created_at) as first_member_joined,
          MAX(m.created_at) as latest_member_joined
        FROM voting_districts vd
        LEFT JOIN members_consolidated m ON REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
        LEFT JOIN wards w ON vd.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        WHERE vd.is_active = TRUE
        GROUP BY 
          vd.voting_district_code, vd.voting_district_name, vd.voting_district_id,
          w.ward_code, w.ward_name, w.ward_number,
          mu.municipal_name, d.district_name, p.province_name
        ORDER BY p.province_name, d.district_name, w.ward_number, vd.voting_district_number
      `;

      await executeQuery(summaryViewQuery);

      // Create indexes for better performance
      await executeQuery('CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code)');
      await executeQuery('CREATE INDEX IF NOT EXISTS idx_members_ward_code ON members(ward_code)');
      await executeQuery('CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at)');
      await executeQuery('CREATE INDEX IF NOT EXISTS idx_voting_districts_ward_code ON voting_districts(ward_code)');

    } catch (error) {
      throw createDatabaseError('Failed to create members voting district views', error);
    }
  }

  // Get members with voting district information
  static async getMembersWithVotingDistricts(filters: any = {}): Promise<any> {
    try {
      // Build query directly from members_consolidated table
      // UPDATED: Include ALL members (active and inactive) when include_all_members=true
      // Otherwise, filter by active members only (90-day grace period)
      // members_consolidated already has expiry_date column
      let query = `
        SELECT
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
          m.age,
          m.date_of_birth,
          m.gender_id,
          m.cell_number,
          m.landline_number,
          m.email,
          m.residential_address,
          m.voter_registration_number,
          m.voter_registration_date,
          m.voter_status_id,
          m.membership_status_id,
          m.voting_station_id,
          m.voting_district_code,
          m.ward_code,
          m.province_code,
          m.province_name,
          m.district_code,
          m.district_name,
          m.municipality_code,
          m.municipality_name,
          m.expiry_date,
          m.membership_number,
          m.date_joined,
          w.ward_name,
          w.ward_number,
          vd.voting_district_name,
          vd.voting_district_id as voting_district_number,
          vs.station_name as voting_station_name,
          CASE
            WHEN m.expiry_date IS NULL THEN 'Inactive'
            WHEN m.expiry_date >= CURRENT_DATE THEN 'Active'
            WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
            ELSE 'Expired'
          END as membership_status
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
        LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Apply active member filter only if:
      // 1. include_all_members is NOT set, AND
      // 2. membership_status is NOT provided (default behavior)
      // If membership_status is provided ('all', 'active', 'expired'), it will be handled later (lines 301-309)
      if (!filters.include_all_members && !filters.membership_status) {
        // Default behavior when no membership_status filter: show only active members (not expired OR in grace period)
        query += ` AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days'`;
      }

      let paramIndex = 1;

      if (filters.province_code) {
        query += ` AND m.province_code = $${paramIndex}`;
        params.push(filters.province_code);
        paramIndex++;
      }

      if (filters.district_code) {
        query += ` AND m.district_code = $${paramIndex}`;
        params.push(filters.district_code);
        paramIndex++;
      }

      if (filters.municipal_code) {
        query += ` AND m.municipality_code = $${paramIndex}`;
        params.push(filters.municipal_code);
        paramIndex++;
      }

      if (filters.ward_code) {
        query += ` AND m.ward_code = $${paramIndex}`;
        params.push(filters.ward_code);
        paramIndex++;
      }

      if (filters.voting_district_code) {
        query += ` AND REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') = REPLACE(CAST($${paramIndex} AS TEXT), '.0', '')`;
        params.push(filters.voting_district_code);
        paramIndex++;
      }

      if (filters.voting_station_id) {
        query += ` AND m.voting_station_id = $${paramIndex}`;
        params.push(filters.voting_station_id);
        paramIndex++;
      }

      if (filters.voting_station_name) {
        query += ` AND vs.station_name ILIKE $${paramIndex}`;
        params.push('%' + filters.voting_station_name + '%');
        paramIndex++;
      }

      if (filters.has_voting_district) {
        const hasVD = filters.has_voting_district === 'true' || filters.has_voting_district === true;
        if (hasVD) {
          query += ` AND m.voting_district_code IS NOT NULL`;
        } else {
          query += ` AND m.voting_district_code IS NULL`;
        }
      }

      if (filters.age_group) {
        // Age group filtering logic
        if (filters.age_group === '18-25') {
          query += ` AND m.age BETWEEN 18 AND 25`;
        } else if (filters.age_group === '26-35') {
          query += ` AND m.age BETWEEN 26 AND 35`;
        } else if (filters.age_group === '36-50') {
          query += ` AND m.age BETWEEN 36 AND 50`;
        } else if (filters.age_group === '51+') {
          query += ` AND m.age >= 51`;
        }
      }

      if (filters.gender_id) {
        query += ` AND m.gender_id = $${paramIndex}`;
        params.push(filters.gender_id);
        paramIndex++;
      }

      // Membership status filter
      if (filters.membership_status && filters.membership_status !== 'all') {
        if (filters.membership_status === 'active') {
          // Active members: membership_status_id = 1 (Active/Good Standing)
          query += ` AND m.membership_status_id = 1`;
        } else if (filters.membership_status === 'expired') {
          // Expired/Inactive members: membership_status_id IN (2, 3, 4) (Expired, Inactive, Grace Period)
          query += ` AND m.membership_status_id IN (2, 3, 4)`;
        }
      }

      if (filters.search) {
        query += ` AND (m.id_number LIKE $${paramIndex} OR (m.firstname || ' ' || COALESCE(m.surname, '')) ILIKE $${paramIndex} OR m.membership_number LIKE $${paramIndex} OR m.cell_number LIKE $${paramIndex} OR m.email ILIKE $${paramIndex})`;
        params.push('%' + filters.search + '%');
        paramIndex++;
      }

      // Get total count before pagination
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await executeQuery(countQuery, params);
      const total = countResult[0]?.total || 0;

      query += ' ORDER BY m.firstname, m.surname';

      // Pagination support
      const page = filters.page ? parseInt(filters.page) : 1;
      const limit = filters.limit ? parseInt(filters.limit) : 100;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const members = await executeQuery(query, params);

      return {
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch members with voting districts', error);
    }
  }

  // Get voting district summary
  static async getVotingDistrictSummary(filters : any = {}): Promise<any[]> {
    try {
      let query = 'SELECT * FROM members_by_voting_district_summary WHERE 1= TRUE';
      const params: any[] = [];

      if (filters.province_name) {
        query += ' AND province_name = $1';
        params.push(filters.province_name);
      }

      if (filters.district_name) {
        query += ' AND district_name = $1';
        params.push(filters.district_name);
      }

      if (filters.municipal_name) {
        query += ' AND municipal_name = $1';
        params.push(filters.municipal_name);
      }

      if (filters.ward_code) {
        query += ' AND ward_code = $1';
        params.push(filters.ward_code);
      }

      if (filters.min_members) {
        query += ' AND total_members >= $1';
        params.push(parseInt(filters.min_members));
      }

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voting district summary', error);
    }
  }
}
