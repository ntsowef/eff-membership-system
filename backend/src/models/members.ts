import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Member interfaces
export interface Member {
  member_id: number;
  id_number: string;
  firstname: string;
  surname?: string;
  age?: number;
  date_of_birth?: string;
  gender_id: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  ward_code: string;
  voting_district_code?: string;
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface MemberDetails extends Member {
  // From vw_member_details
  full_name: string;
  gender_name: string;
  race_name?: string;
  citizenship_name?: string;
  language_name?: string;
  voter_status: string;
  is_eligible_to_vote?: boolean;
  ward_number: string;
  ward_name: string;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  district_name: string;
  province_code: string;
  province_name: string;
  voting_station_name?: string;
  voting_station_code?: string;
  occupation_name?: string;
  occupation_category?: string;
  qualification_name?: string;
  qualification_level?: string;
  member_created_at: string;
  member_updated_at: string;
  // From vw_membership_details (when available)
  membership_id?: number;
  date_joined?: string;
  last_payment_date?: string;
  expiry_date?: string;
  subscription_name?: string;
  membership_amount?: string;
  status_name?: string;
  is_active?: number;
  days_until_expiry?: number;
  membership_status_calculated?: string;
  payment_method?: string;
  payment_reference?: string;
  membership_created_at?: string;
  membership_updated_at?: string;
  // Computed fields for compatibility
  id: number; // alias for member_id
  first_name: string; // alias for firstname
  last_name: string; // alias for surname
  membership_number: string; // computed from member_id
  membership_status: string; // alias for membership_status_calculated or status_name
  membership_expiry: string; // alias for expiry_date
  region_name: string; // alias for district_name
}

export interface CreateMemberData {
  id_number: string;
  firstname: string;
  surname?: string;
  gender_id: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  ward_code: string;
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  occupation_id?: number;
  qualification_id?: number;
}

export interface UpdateMemberData {
  firstname?: string;
  surname?: string;
  gender_id?: number;
  race_id?: number;
  citizenship_id?: number;
  language_id?: number;
  ward_code?: string;
  voting_station_id?: number;
  residential_address?: string;
  cell_number?: string;
  landline_number?: string;
  email?: string;
  occupation_id?: number;
  qualification_id?: number;
  voter_status_id?: number;
  voter_registration_number?: string;
  voter_registration_date?: string;
}

// Interface for API compatibility (maps to database fields)
export interface UpdateMemberProfileData {
  first_name?: string; // maps to firstname
  last_name?: string; // maps to surname
  email?: string;
  cell_number?: string;
  alternative_contact?: string; // maps to landline_number
  residential_address?: string;
  postal_address?: string; // not in database, ignore
  occupation?: string; // would need lookup
  employer?: string; // not in database, ignore
}

export interface MemberFilters {
  ward_code?: string;
  municipality_code?: string;
  district_code?: string;
  province_code?: string;
  gender_id?: number;
  race_id?: number;
  age_min?: number;
  age_max?: number;
  has_email?: boolean;
  has_cell_number?: boolean;
  search?: string;
}

// Member model class
export class MemberModel {
  // Get all members with optional filtering and pagination
  static async getAllMembers(
    filters: MemberFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<MemberDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Apply filters (using column names without alias since we're querying a view)
      if (filters.ward_code) {
        whereClause += ' AND ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipality_code) {
        // Check if this is a metropolitan municipality by querying for subregions
        // Metropolitan municipalities have subregions (e.g., JHB has JHB001, JHB002, etc.)
        const subregionsQuery = `
          SELECT municipality_code
          FROM municipalities
          WHERE parent_municipality_id = (
            SELECT municipality_id
            FROM municipalities
            WHERE municipality_code = ?
          )
        `;
        const subregions = await executeQuery<{ municipality_code: string }>(subregionsQuery, [filters.municipality_code]);

        if (subregions.length > 0) {
          // This is a metro with subregions - include both the metro and all its subregions
          const municipalityCodes = [filters.municipality_code, ...subregions.map(s => s.municipality_code)];
          const placeholders = municipalityCodes.map(() => '?').join(',');
          whereClause += ` AND municipality_code IN (${placeholders})`;
          params.push(...municipalityCodes);
        } else {
          // Regular municipality or subregion - filter directly
          whereClause += ' AND municipality_code = ?';
          params.push(filters.municipality_code);
        }
      }

      if (filters.district_code) {
        whereClause += ' AND district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.gender_id) {
        whereClause += ' AND gender_id = ?';
        params.push(filters.gender_id);
      }

      if (filters.race_id) {
        whereClause += ' AND race_id = ?';
        params.push(filters.race_id);
      }

      if (filters.age_min) {
        whereClause += ' AND age >= ?';
        params.push(filters.age_min);
      }

      if (filters.age_max) {
        whereClause += ' AND age <= ?';
        params.push(filters.age_max);
      }

      if (filters.has_email !== undefined) {
        whereClause += filters.has_email ? ' AND email IS NOT NULL' : ' AND email IS NULL';
      }

      if (filters.has_cell_number !== undefined) {
        whereClause += filters.has_cell_number ? ' AND cell_number IS NOT NULL' : ' AND cell_number IS NULL';
      }

      if (filters.search) {
        whereClause += ' AND (firstname LIKE ? OR surname LIKE ? OR id_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Validate sort column (now using vw_membership_details which includes date_joined)
      const allowedSortColumns = ['firstname', 'surname', 'age', 'id_number', 'member_id', 'date_joined', 'created_at'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'member_id';

      // Use vw_enhanced_member_search which has both membership data and geographic columns
      const query = `
        SELECT * FROM vw_enhanced_member_search
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<MemberDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch members', error);
    }
  }

  // Get total count of members with filters
  static async getMembersCount(filters: MemberFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Apply same filters as getAllMembers
      if (filters.ward_code) {
        whereClause += ' AND ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipality_code) {
        // Check if this is a metropolitan municipality by querying for subregions
        // Metropolitan municipalities have subregions (e.g., JHB has JHB001, JHB002, etc.)
        const subregionsQuery = `
          SELECT municipality_code
          FROM municipalities
          WHERE parent_municipality_id = (
            SELECT municipality_id
            FROM municipalities
            WHERE municipality_code = ?
          )
        `;
        const subregions = await executeQuery<{ municipality_code: string }>(subregionsQuery, [filters.municipality_code]);

        if (subregions.length > 0) {
          // This is a metro with subregions - include both the metro and all its subregions
          const municipalityCodes = [filters.municipality_code, ...subregions.map(s => s.municipality_code)];
          const placeholders = municipalityCodes.map(() => '?').join(',');
          whereClause += ` AND municipality_code IN (${placeholders})`;
          params.push(...municipalityCodes);
        } else {
          // Regular municipality or subregion - filter directly
          whereClause += ' AND municipality_code = ?';
          params.push(filters.municipality_code);
        }
      }

      if (filters.district_code) {
        whereClause += ' AND district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.gender_id) {
        whereClause += ' AND gender_id = ?';
        params.push(filters.gender_id);
      }

      if (filters.race_id) {
        whereClause += ' AND race_id = ?';
        params.push(filters.race_id);
      }

      if (filters.age_min) {
        whereClause += ' AND age >= ?';
        params.push(filters.age_min);
      }

      if (filters.age_max) {
        whereClause += ' AND age <= ?';
        params.push(filters.age_max);
      }

      if (filters.has_email !== undefined) {
        whereClause += filters.has_email ? ' AND email IS NOT NULL' : ' AND email IS NULL';
      }

      if (filters.has_cell_number !== undefined) {
        whereClause += filters.has_cell_number ? ' AND cell_number IS NOT NULL' : ' AND cell_number IS NULL';
      }

      if (filters.search) {
        whereClause += ' AND (firstname LIKE ? OR surname LIKE ? OR id_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `SELECT COUNT(*) as count FROM vw_enhanced_member_search ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get members count', error);
    }
  }

  // Get member by ID with membership details
  static async getMemberById(id: number): Promise<MemberDetails | null> {
    try {
      // Use enhanced member search view which has both membership and geographic data
      let query = 'SELECT * FROM vw_enhanced_member_search WHERE member_id = ?';
      let member = await executeQuerySingle<any>(query, [id]);

      // If not found in enhanced view, try membership details view
      if (!member) {
        query = 'SELECT * FROM vw_membership_details WHERE member_id = ?';
        member = await executeQuerySingle<any>(query, [id]);
      }

      // If still not found, try member details view
      if (!member) {
        query = 'SELECT * FROM vw_member_details WHERE member_id = ?';
        member = await executeQuerySingle<any>(query, [id]);
      }

      if (!member) {
        return null;
      }

      // Add computed fields for compatibility
      const memberDetails: MemberDetails = {
        ...member,
        id: member.member_id,
        first_name: member.firstname,
        last_name: member.surname || '',
        membership_number: `M${String(member.member_id).padStart(6, '0')}`,
        membership_status: member.membership_status_calculated || member.status_name || 'Unknown',
        membership_expiry: member.expiry_date || '',
        region_name: member.district_name
      };

      return memberDetails;
    } catch (error) {
      throw createDatabaseError('Failed to fetch member', error);
    }
  }

  // Get member by ID number
  static async getMemberByIdNumber(idNumber: string): Promise<MemberDetails | null> {
    try {
      const query = 'SELECT * FROM vw_member_details WHERE id_number = ?';
      return await executeQuerySingle<MemberDetails>(query, [idNumber]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch member by ID number', error);
    }
  }

  // Create new member
  static async createMember(memberData: CreateMemberData): Promise<number> {
    try {
      const query = `
        INSERT INTO members (
          id_number, firstname, surname, gender_id, race_id, citizenship_id,
          language_id, ward_code, voting_station_id, residential_address,
          cell_number, landline_number, email, occupation_id, qualification_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        memberData.id_number,
        memberData.firstname,
        memberData.surname || null,
        memberData.gender_id,
        memberData.race_id || null,
        memberData.citizenship_id || 1,
        memberData.language_id || null,
        memberData.ward_code,
        memberData.voting_station_id || null,
        memberData.residential_address || null,
        memberData.cell_number || null,
        memberData.landline_number || null,
        memberData.email || null,
        memberData.occupation_id || null,
        memberData.qualification_id || null
      ];

      const result = await executeQuery(query, params);
      return (result as any).insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create member', error);
    }
  }

  // Update member
  static async updateMember(id: number, memberData: any): Promise<boolean> {
    try {
      // Map frontend fields to actual database fields
      const fieldMapping: { [key: string]: string } = {
        'firstname': 'firstname',
        'surname': 'surname',
        'cell_number': 'cell_number',
        'landline_number': 'landline_number',
        'email': 'email',
        'residential_address': 'residential_address',
        'ward_code': 'ward_code',
        'id_number': 'id_number',
        'date_of_birth': 'date_of_birth',
        'gender_id': 'gender_id',
        'race_id': 'race_id',
        'citizenship_id': 'citizenship_id',
        'language_id': 'language_id',
        'occupation_id': 'occupation_id',
        'qualification_id': 'qualification_id',
        'voting_station_id': 'voting_station_id',
        'voter_status_id': 'voter_status_id',
        'voter_registration_number': 'voter_registration_number',
        'voter_registration_date': 'voter_registration_date'
      };

      const updateFields: string[] = [];
      const params: any[] = [];

      // Only update fields that exist in the members table
      Object.entries(memberData).forEach(([key, value]) => {
        if (fieldMapping[key]) {
          updateFields.push(`${fieldMapping[key]} = ?`);
          params.push(value);
        }
      });

      if (updateFields.length === 0) {
        return false;
      }

      params.push(id);

      const query = `
        UPDATE members
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE member_id = ?
      `;

      const result = await executeQuery(query, params);
      return (result as any).affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update member', error);
    }
  }

  // Delete member
  static async deleteMember(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM members WHERE member_id = ?';
      const result = await executeQuery(query, [id]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete member', error);
    }
  }

  // Check if ID number exists
  static async idNumberExists(idNumber: string, excludeMemberId?: number): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM members WHERE id_number = ?';
      const params: any[] = [idNumber];

      if (excludeMemberId) {
        query += ' AND member_id != ?';
        params.push(excludeMemberId);
      }

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return (result?.count || 0) > 0;
    } catch (error) {
      throw createDatabaseError('Failed to check ID number existence', error);
    }
  }

  // Get members by ward
  static async getMembersByWard(wardCode: string): Promise<MemberDetails[]> {
    try {
      const query = `
        SELECT * FROM vw_member_details
        WHERE ward_code = ?
        ORDER BY firstname, surname
      `;
      return await executeQuery<MemberDetails>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch members by ward', error);
    }
  }

  // Get members by province with pagination and filtering
  static async getMembersByProvince(
    provinceCode: string,
    filters: { search?: string } = {},
    limit: number = 50,
    offset: number = 0,
    sortBy: string = 'firstname',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<MemberDetails[]> {
    try {
      let whereClause = 'WHERE province_code = ?';
      const params: any[] = [provinceCode];

      // Add search filter
      if (filters.search) {
        whereClause += ' AND (firstname LIKE ? OR surname LIKE ? OR id_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Validate sort column
      const validSortColumns = ['firstname', 'surname', 'age', 'gender_name', 'ward_number', 'municipality_name', 'district_name', 'created_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'firstname';

      const query = `
        SELECT * FROM vw_member_details
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}, firstname ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<MemberDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch members by province', error);
    }
  }

  // Get count of members by province with filtering
  static async getMembersByProvinceCount(
    provinceCode: string,
    filters: { search?: string } = {}
  ): Promise<number> {
    try {
      let whereClause = 'WHERE province_code = ?';
      const params: any[] = [provinceCode];

      // Add search filter
      if (filters.search) {
        whereClause += ' AND (firstname LIKE ? OR surname LIKE ? OR id_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT COUNT(*) as count FROM vw_member_details
        ${whereClause}
      `;

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to count members by province', error);
    }
  }
}
