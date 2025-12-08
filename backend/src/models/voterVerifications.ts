import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Voter verification interfaces
export interface VoterVerification {
  id: number;
  member_id: number;
  verification_method: 'API' | 'Manual' | 'Document';
  status: 'Registered' | 'Not Registered' | 'Pending' | 'Error';
  voter_registration_number?: string;
  voting_district?: string;
  verification_date: string;
  verified_by?: number;
  next_verification_date?: string;
  verification_notes?: string;
  api_response?: string;
  created_at: string;
  updated_at: string;
}

export interface VoterVerificationDetails extends VoterVerification {
  member_name: string;
  member_id_number: string;
  verifier_name?: string;
  ward_name?: string;
  municipality_name?: string;
  district_name?: string;
  province_name?: string;
}

export interface CreateVoterVerificationData {
  member_id: number;
  verification_method: 'API' | 'Manual' | 'Document';
  status: 'Registered' | 'Not Registered' | 'Pending' | 'Error';
  voter_registration_number?: string;
  voting_district?: string;
  verified_by?: number;
  next_verification_date?: string;
  verification_notes?: string;
  api_response?: string;
}

export interface UpdateVoterVerificationData {
  status?: 'Registered' | 'Not Registered' | 'Pending' | 'Error';
  voter_registration_number?: string;
  voting_district?: string;
  verified_by?: number;
  next_verification_date?: string;
  verification_notes?: string;
  api_response?: string;
}

export interface VoterVerificationFilters {
  member_id?: number;
  verification_method?: string;
  status?: string;
  verified_by?: number;
  ward_code?: string;
  municipal_code?: string;
  district_code?: string;
  province_code?: string;
  verification_date_from?: string;
  verification_date_to?: string;
  next_verification_due?: boolean;
  search?: string;
}

// Voter verification model class
export class VoterVerificationModel {
  // Create new voter verification record
  static async createVerification(verificationData: CreateVoterVerificationData): Promise<number> {
    try {
      const query = `
        INSERT INTO voter_verifications (
          member_id, verification_method, status, voter_registration_number,
          voting_district, verification_date, verified_by, next_verification_date,
          verification_notes, api_response
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      `;

      const params = [
        verificationData.member_id,
        verificationData.verification_method,
        verificationData.status,
        verificationData.voter_registration_number || null,
        verificationData.voting_district || null,
        verificationData.verified_by || null,
        verificationData.next_verification_date || null,
        verificationData.verification_notes || null,
        verificationData.api_response || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create voter verification', error);
    }
  }

  // Get voter verification by ID with details
  static async getVerificationById(id: number): Promise<VoterVerificationDetails | null> {
    try {
      const query = `
        SELECT 
          vv.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          verifier.name as verifier_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN users verifier ON vv.verified_by = verifier.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE vv.id = ?
      `;

      return await executeQuerySingle<VoterVerificationDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voter verification', error);
    }
  }

  // Get voter verifications with filtering and pagination
  static async getVerifications(
    limit: number = 20,
    offset: number = 0,
    filters: VoterVerificationFilters = {}
  ): Promise<VoterVerificationDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.member_id) {
        whereClause += ' AND vv.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.verification_method) {
        whereClause += ' AND vv.verification_method = ?';
        params.push(filters.verification_method);
      }

      if (filters.status) {
        whereClause += ' AND vv.status = ?';
        params.push(filters.status);
      }

      if (filters.verified_by) {
        whereClause += ' AND vv.verified_by = ?';
        params.push(filters.verified_by);
      }

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.verification_date_from) {
        whereClause += ' AND vv.verification_date >= ?';
        params.push(filters.verification_date_from);
      }

      if (filters.verification_date_to) {
        whereClause += ' AND vv.verification_date <= ?';
        params.push(filters.verification_date_to);
      }

      if (filters.next_verification_due) {
        whereClause += ' AND vv.next_verification_date <= CURDATE()';
      }

      if (filters.search) {
        whereClause += ' AND (m.firstname LIKE ? OR m.surname LIKE ? OR m.id_number LIKE ? OR vv.voter_registration_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT 
          vv.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          verifier.name as verifier_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN users verifier ON vv.verified_by = verifier.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        ${whereClause}
        ORDER BY vv.verification_date DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<VoterVerificationDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voter verifications', error);
    }
  }

  // Get voter verification count with filters
  static async getVerificationCount(filters: VoterVerificationFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.member_id) {
        whereClause += ' AND vv.member_id = ?';
        params.push(filters.member_id);
      }

      if (filters.verification_method) {
        whereClause += ' AND vv.verification_method = ?';
        params.push(filters.verification_method);
      }

      if (filters.status) {
        whereClause += ' AND vv.status = ?';
        params.push(filters.status);
      }

      if (filters.verified_by) {
        whereClause += ' AND vv.verified_by = ?';
        params.push(filters.verified_by);
      }

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      if (filters.verification_date_from) {
        whereClause += ' AND vv.verification_date >= ?';
        params.push(filters.verification_date_from);
      }

      if (filters.verification_date_to) {
        whereClause += ' AND vv.verification_date <= ?';
        params.push(filters.verification_date_to);
      }

      if (filters.next_verification_due) {
        whereClause += ' AND vv.next_verification_date <= CURDATE()';
      }

      if (filters.search) {
        whereClause += ' AND (m.firstname LIKE ? OR m.surname LIKE ? OR m.id_number LIKE ? OR vv.voter_registration_number LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        ${whereClause}
      `;

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get voter verification count', error);
    }
  }

  // Update voter verification
  static async updateVerification(id: number, updateData: UpdateVoterVerificationData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.status !== undefined) {
        fields.push('status = ?');
        params.push(updateData.status);
      }

      if (updateData.voter_registration_number !== undefined) {
        fields.push('voter_registration_number = ?');
        params.push(updateData.voter_registration_number);
      }

      if (updateData.voting_district !== undefined) {
        fields.push('voting_district = ?');
        params.push(updateData.voting_district);
      }

      if (updateData.verified_by !== undefined) {
        fields.push('verified_by = ?');
        params.push(updateData.verified_by);
      }

      if (updateData.next_verification_date !== undefined) {
        fields.push('next_verification_date = ?');
        params.push(updateData.next_verification_date);
      }

      if (updateData.verification_notes !== undefined) {
        fields.push('verification_notes = ?');
        params.push(updateData.verification_notes);
      }

      if (updateData.api_response !== undefined) {
        fields.push('api_response = ?');
        params.push(updateData.api_response);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE voter_verifications SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update voter verification', error);
    }
  }

  // Get member's latest voter verification
  static async getMemberLatestVerification(memberId: number): Promise<VoterVerificationDetails | null> {
    try {
      const query = `
        SELECT 
          vv.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          verifier.name as verifier_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN users verifier ON vv.verified_by = verifier.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE vv.member_id = ?
        ORDER BY vv.verification_date DESC
        LIMIT 1
      `;

      return await executeQuerySingle<VoterVerificationDetails>(query, [memberId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch member voter verification', error);
    }
  }

  // Get members due for verification
  static async getMembersDueForVerification(limit: number = 50): Promise<VoterVerificationDetails[]> {
    try {
      const query = `
        SELECT 
          vv.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          verifier.name as verifier_name,
          w.ward_name,
          mu.municipality_name,
          d.district_name,
          p.province_name
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN users verifier ON vv.verified_by = verifier.id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON w.district_code = d.district_code
        LEFT JOIN provinces p ON w.province_code = p.province_code
        WHERE vv.next_verification_date <= CURDATE()
        AND vv.status != 'Pending'
        ORDER BY vv.next_verification_date ASC
        LIMIT ?
      `;

      return await executeQuery<VoterVerificationDetails>(query, [limit]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch members due for verification', error);
    }
  }

  // Get verification statistics
  static async getVerificationStatistics(filters: { ward_code?: string; municipal_code?: string; district_code?: string; province_code?: string } = {}): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.ward_code) {
        whereClause += ' AND m.ward_code = ?';
        params.push(filters.ward_code);
      }

      if (filters.municipal_code) {
        whereClause += ' AND w.municipality_code = ?';
        params.push(filters.municipal_code);
      }

      if (filters.district_code) {
        whereClause += ' AND w.district_code = ?';
        params.push(filters.district_code);
      }

      if (filters.province_code) {
        whereClause += ' AND w.province_code = ?';
        params.push(filters.province_code);
      }

      const query = `
        SELECT 
          COUNT(*) as total_verifications,
          COUNT(CASE WHEN vv.status = 'Registered' THEN 1 END) as registered_count,
          COUNT(CASE WHEN vv.status = 'Not Registered' THEN 1 END) as not_registered_count,
          COUNT(CASE WHEN vv.status = 'Pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN vv.status = 'Error' THEN 1 END) as error_count,
          COUNT(CASE WHEN vv.verification_method = 'API' THEN 1 END) as api_verifications,
          COUNT(CASE WHEN vv.verification_method = 'Manual' THEN 1 END) as manual_verifications,
          COUNT(CASE WHEN vv.verification_method = 'Document' THEN 1 END) as document_verifications,
          COUNT(CASE WHEN vv.next_verification_date <= CURDATE() THEN 1 END) as due_for_verification
        FROM voter_verifications vv
        LEFT JOIN members_consolidated m ON vv.member_id = m.member_id
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get verification statistics', error);
    }
  }

  // Delete voter verification
  static async deleteVerification(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM voter_verifications WHERE id = ?';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete voter verification', error);
    }
  }
}
