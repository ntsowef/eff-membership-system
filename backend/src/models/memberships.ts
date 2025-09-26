import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Membership interfaces
export interface Membership {
  membership_id: number;
  member_id: number;
  date_joined: string;
  last_payment_date?: string;
  expiry_date?: string;
  subscription_type_id: number;
  membership_amount: number;
  status_id: number;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipDetails extends Membership {
  id_number: string;
  firstname: string;
  surname?: string;
  full_name: string;
  age?: number;
  gender_name: string;
  ward_code: string;
  ward_number?: string;
  municipality_name?: string;
  district_name?: string;
  province_name?: string;
  cell_number?: string;
  email?: string;
  subscription_name: string;
  status_name: string;
  is_active: boolean;
  days_until_expiry?: number;
  is_expired: boolean;
  membership_duration_days?: number;
}

export interface CreateMembershipData {
  member_id: number;
  date_joined: string;
  last_payment_date?: string;
  expiry_date?: string;
  subscription_type_id: number;
  membership_amount?: number;
  status_id?: number;
  payment_method?: string;
  payment_reference?: string;
}

export interface UpdateMembershipData {
  last_payment_date?: string;
  expiry_date?: string;
  subscription_type_id?: number;
  membership_amount?: number;
  status_id?: number;
  payment_method?: string;
  payment_reference?: string;
}

export interface MembershipFilters {
  member_id?: number;
  status_id?: number;
  subscription_type_id?: number;
  ward_code?: string;
  is_expired?: boolean;
  expires_within_days?: number;
  date_joined_from?: string;
  date_joined_to?: string;
}

// Membership model class
export class MembershipModel {
  // Get all memberships with optional filtering and pagination
  static async getAllMemberships(
    filters: MembershipFilters = {},
    limit: number = 20,
    offset: number = 0,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<MembershipDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Apply filters
      if (filters.member_id) {
        whereClause += ' AND member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.status_id) {
        whereClause += ' AND status_id = ?';
        params.push(filters.status_id);
      }

      if (filters.subscription_type_id) {
        whereClause += ' AND subscription_type_id = ?';
        params.push(filters.subscription_type_id);
      }

      if (filters.ward_code) {
        whereClause += ' AND ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.is_expired !== undefined) {
        whereClause += filters.is_expired 
          ? ' AND (expiry_date IS NOT NULL AND expiry_date < CURDATE())'
          : ' AND (expiry_date IS NULL OR expiry_date >= CURDATE())';
      }

      if (filters.expires_within_days) {
        whereClause += ' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)';
        params.push(filters.expires_within_days);
      }

      if (filters.date_joined_from) {
        whereClause += ' AND date_joined >= ?';
        params.push(filters.date_joined_from);
      }

      if (filters.date_joined_to) {
        whereClause += ' AND date_joined <= ?';
        params.push(filters.date_joined_to);
      }

      // Validate sort column
      const allowedSortColumns = ['date_joined', 'expiry_date', 'membership_amount', 'firstname', 'surname', 'membership_id'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'date_joined';

      const query = `
        SELECT * FROM vw_membership_details
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<MembershipDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch memberships', error);
    }
  }

  // Get total count of memberships with filters
  static async getMembershipsCount(filters: MembershipFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Apply same filters as getAllMemberships
      if (filters.member_id) {
        whereClause += ' AND member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.status_id) {
        whereClause += ' AND status_id = ?';
        params.push(filters.status_id);
      }

      if (filters.subscription_type_id) {
        whereClause += ' AND subscription_type_id = ?';
        params.push(filters.subscription_type_id);
      }

      if (filters.ward_code) {
        whereClause += ' AND ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.is_expired !== undefined) {
        whereClause += filters.is_expired 
          ? ' AND (expiry_date IS NOT NULL AND expiry_date < CURDATE())'
          : ' AND (expiry_date IS NULL OR expiry_date >= CURDATE())';
      }

      if (filters.expires_within_days) {
        whereClause += ' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)';
        params.push(filters.expires_within_days);
      }

      if (filters.date_joined_from) {
        whereClause += ' AND date_joined >= ?';
        params.push(filters.date_joined_from);
      }

      if (filters.date_joined_to) {
        whereClause += ' AND date_joined <= ?';
        params.push(filters.date_joined_to);
      }

      const query = `SELECT COUNT(*) as count FROM vw_membership_details ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get memberships count', error);
    }
  }

  // Get membership by ID
  static async getMembershipById(id: number): Promise<MembershipDetails | null> {
    try {
      const query = 'SELECT * FROM vw_membership_details WHERE membership_id = ?';
      return await executeQuerySingle<MembershipDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership', error);
    }
  }

  // Get membership by member ID
  static async getMembershipByMemberId(memberId: number): Promise<MembershipDetails | null> {
    try {
      const query = 'SELECT * FROM vw_membership_details WHERE member_id = ? ORDER BY created_at DESC LIMIT 1';
      return await executeQuerySingle<MembershipDetails>(query, [memberId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch membership by member ID', error);
    }
  }

  // Create new membership
  static async createMembership(membershipData: CreateMembershipData): Promise<number> {
    try {
      const query = `
        INSERT INTO memberships (
          member_id, date_joined, last_payment_date, expiry_date,
          subscription_type_id, membership_amount, status_id,
          payment_method, payment_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        membershipData.member_id,
        membershipData.date_joined,
        membershipData.last_payment_date || null,
        membershipData.expiry_date || null,
        membershipData.subscription_type_id,
        membershipData.membership_amount || 10.00,
        membershipData.status_id || 1,
        membershipData.payment_method || null,
        membershipData.payment_reference || null
      ];

      const result = await executeQuery(query, params);
      return (result as any).insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create membership', error);
    }
  }

  // Update membership
  static async updateMembership(id: number, membershipData: UpdateMembershipData): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      // Build dynamic update query
      Object.entries(membershipData).forEach(([key, value]) => {
        updateFields.push(`${key} = ?`);
        params.push(value);
      });

      if (updateFields.length === 0) {
        return false;
      }

      params.push(id);

      const query = `
        UPDATE memberships 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE membership_id = ?
      `;

      const result = await executeQuery(query, params);
      return (result as any).affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update membership', error);
    }
  }

  // Delete membership
  static async deleteMembership(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM memberships WHERE membership_id = ?';
      const result = await executeQuery(query, [id]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete membership', error);
    }
  }

  // Check if member already has active membership
  static async memberHasActiveMembership(memberId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM memberships m
        JOIN membership_statuses ms ON m.status_id = ms.status_id
        WHERE m.member_id = ? AND ms.is_active = TRUE
      `;
      const result = await executeQuerySingle<{ count: number }>(query, [memberId]);
      return (result?.count || 0) > 0;
    } catch (error) {
      throw createDatabaseError('Failed to check active membership', error);
    }
  }

  // Get expiring memberships
  static async getExpiringMemberships(days: number = 30): Promise<MembershipDetails[]> {
    try {
      const query = `
        SELECT * FROM vw_membership_details
        WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND is_active = TRUE
        ORDER BY expiry_date ASC
      `;
      return await executeQuery<MembershipDetails>(query, [days]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch expiring memberships', error);
    }
  }

  // Get expired memberships
  static async getExpiredMemberships(): Promise<MembershipDetails[]> {
    try {
      const query = `
        SELECT * FROM vw_membership_details
        WHERE expiry_date < CURDATE()
        AND status_id != 3
        ORDER BY expiry_date DESC
      `;
      return await executeQuery<MembershipDetails>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch expired memberships', error);
    }
  }
}
