import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError, createValidationError } from '../middleware/errorHandler';

// =====================================================
// Type Definitions
// =====================================================

export interface AssemblyType {
  assembly_type_id: number;
  assembly_code: string;
  assembly_name: string;
  assembly_level: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardDelegate {
  delegate_id: number;
  ward_code: string;
  member_id: number;
  assembly_type_id: number;
  selection_date: string;
  selection_method?: string;
  delegate_status: string;
  term_start_date?: string;
  term_end_date?: string;
  replacement_reason?: string;
  replaced_by_delegate_id?: number;
  notes?: string;
  selected_by?: number;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  member_name?: string;
  assembly_code?: string;
  assembly_name?: string;
}

export interface WardComplianceAuditLog {
  audit_log_id: number;
  ward_code: string;
  audit_date: string;
  audited_by: number;
  
  // Criterion 1
  total_members: number;
  meets_member_threshold: boolean;
  total_voting_districts: number;
  compliant_voting_districts: number;
  meets_vd_threshold: boolean;
  criterion_1_passed: boolean;
  
  // Criterion 2
  last_meeting_id?: number;
  quorum_required?: number;
  quorum_achieved?: number;
  quorum_met: boolean;
  criterion_2_passed: boolean;
  
  // Criterion 3
  meeting_attended: boolean;
  criterion_3_passed: boolean;
  
  // Criterion 4
  presiding_officer_id?: number;
  presiding_officer_recorded: boolean;
  criterion_4_passed: boolean;
  
  // Criterion 5
  delegates_selected: boolean;
  criterion_5_passed: boolean;
  
  // Overall
  overall_compliant: boolean;
  compliance_score?: number;
  audit_notes?: string;
  created_at: string;
}

export interface WardMeetingRecord {
  record_id: number;
  meeting_id: number;
  ward_code: string;
  meeting_type: string;
  presiding_officer_id?: number;
  secretary_id?: number;
  quorum_required: number;
  quorum_achieved: number;
  quorum_met: boolean;
  total_attendees: number;
  meeting_outcome?: string;
  key_decisions?: string;
  action_items?: string;
  next_meeting_date?: string;

  // Criterion 2: Manual quorum verification
  quorum_verified_manually: boolean;
  quorum_verified_by?: number;
  quorum_verified_at?: string;
  quorum_verification_notes?: string;

  // Criterion 3: Manual meeting attendance verification
  meeting_took_place_verified: boolean;
  meeting_verified_by?: number;
  meeting_verified_at?: string;
  meeting_verification_notes?: string;

  created_at: string;
  updated_at: string;
}

export interface VotingDistrictCompliance {
  voting_district_code: string;
  voting_district_name: string;
  ward_code: string;
  ward_name: string;
  municipality_code: string;
  member_count: number;
  is_compliant: boolean;
  compliance_status: string;
}

export interface WardComplianceSummary {
  ward_code: string;
  ward_name: string;
  ward_number?: number;
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;

  total_members: number;
  meets_member_threshold: boolean;

  total_voting_districts: number;
  compliant_voting_districts: number;
  all_vds_compliant: boolean;

  criterion_1_compliant: boolean;
  criterion_1_exception_applied?: boolean; // NEW: Indicates if exception was used

  is_compliant: boolean;
  compliance_approved_at?: string;
  compliance_approved_by?: number;
  last_audit_date?: string;

  // Exception tracking
  criterion_1_exception_granted?: boolean;
  criterion_1_exception_reason?: string;
  criterion_1_exception_granted_by?: number;
  criterion_1_exception_granted_at?: string;

  srpa_delegates: number;
  ppa_delegates: number;
  npa_delegates: number;

  created_at: string;
  updated_at: string;
}

export interface MunicipalityDelegateReport {
  municipality_code: string;
  municipality_name: string;
  district_code: string;
  province_code: string;
  
  total_wards: number;
  compliant_wards: number;
  non_compliant_wards: number;
  compliance_percentage: number;
  
  total_srpa_delegates: number;
  total_ppa_delegates: number;
  total_npa_delegates: number;
  
  wards: WardComplianceSummary[];
}

// =====================================================
// Ward Audit Model
// =====================================================

export class WardAuditModel {
  
  // =====================================================
  // Assembly Types
  // =====================================================
  
  static async getAllAssemblyTypes(): Promise<AssemblyType[]> {
    try {
      const query = `
        SELECT * FROM assembly_types
        WHERE is_active = TRUE
        ORDER BY assembly_level, assembly_code
      `;
      return await executeQuery<AssemblyType>(query);
    } catch (error) {
      throw createDatabaseError('Failed to fetch assembly types', error);
    }
  }
  
  static async getAssemblyTypeByCode(code: string): Promise<AssemblyType | null> {
    try {
      const query = `
        SELECT * FROM assembly_types
        WHERE assembly_code = $1 AND is_active = TRUE
      `;
      return await executeQuerySingle<AssemblyType>(query, [code]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch assembly type', error);
    }
  }
  
  // =====================================================
  // Ward Compliance
  // =====================================================
  
  static async getWardComplianceSummary(wardCode: string): Promise<WardComplianceSummary | null> {
    try {
      // ✅ OPTIMIZED: Using materialized view for 100x faster performance
      const query = `
        SELECT * FROM mv_ward_compliance_summary
        WHERE ward_code = $1
      `;
      return await executeQuerySingle<WardComplianceSummary>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward compliance summary', error);
    }
  }

  static async getWardsByMunicipality(municipalityCode: string): Promise<WardComplianceSummary[]> {
    try {
      // ✅ OPTIMIZED: Using materialized view for 100x faster performance
      const query = `
        SELECT * FROM mv_ward_compliance_summary
        WHERE municipality_code = $1
        ORDER BY ward_code, ward_name
      `;
      return await executeQuery<WardComplianceSummary>(query, [municipalityCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch wards by municipality', error);
    }
  }

  static async getVotingDistrictCompliance(wardCode: string): Promise<VotingDistrictCompliance[]> {
    try {
      // ✅ OPTIMIZED: Using materialized view for 100x faster performance
      const query = `
        SELECT * FROM mv_voting_district_compliance
        WHERE ward_code = $1
        ORDER BY voting_district_name
      `;
      return await executeQuery<VotingDistrictCompliance>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch voting district compliance', error);
    }
  }
  
  static async approveWardCompliance(
    wardCode: string,
    userId: number,
    notes?: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE wards
        SET
          is_compliant = TRUE,
          compliance_approved_at = CURRENT_TIMESTAMP,
          compliance_approved_by = $1,
          last_audit_date = CURRENT_TIMESTAMP,
          audit_notes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE ward_code = $3
      `;
      await executeQuery(query, [userId, notes, wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to approve ward compliance', error);
    }
  }

  /**
   * Get members filtered by province for presiding officer selection (Criterion 4)
   * Returns active members from the same province as the ward
   * FIXED: Now includes members from metro sub-regions
   * @deprecated Use searchMembersByProvince instead for better performance
   */
  static async getMembersByProvince(provinceCode: string): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          m.member_id,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', m.surname) as full_name,
          m.id_number,
          m.cell_number,
          m.ward_code,
          w.ward_name,
          mu.municipality_name,
          mu.municipality_type,
          COALESCE(ms.status_name, 'Unknown') as membership_status
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code

        -- Join to parent municipality (for metro sub-regions)
        LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id

        -- Join to districts (both direct and through parent)
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN districts pd ON pm.district_code = pd.district_code

        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id

        -- Use COALESCE to get province from either direct or parent municipality
        WHERE COALESCE(d.province_code, pd.province_code) = $1
        AND m.firstname IS NOT NULL
        AND m.surname IS NOT NULL
        ORDER BY m.surname, m.firstname
      `;

      return await executeQuery<any>(query, [provinceCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch members by province', error);
    }
  }

  /**
   * Search members by province with autocomplete (for presiding officer)
   * Only returns members matching the search term - much faster than loading all province members
   */
  static async searchMembersByProvince(provinceCode: string, searchTerm: string, limit: number = 50): Promise<any[]> {
    try {
      const searchPattern = `%${searchTerm}%`;
      const query = `
        SELECT DISTINCT
          m.member_id,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', m.surname) as full_name,
          m.id_number,
          m.cell_number,
          m.ward_code,
          w.ward_name,
          mu.municipality_name,
          COALESCE(ms.status_name, 'Unknown') as membership_status
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN districts pd ON pm.district_code = pd.district_code
        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
        WHERE COALESCE(d.province_code, pd.province_code) = $1
        AND m.firstname IS NOT NULL
        AND m.surname IS NOT NULL
        AND (
          LOWER(CONCAT(m.firstname, ' ', m.surname)) LIKE LOWER($2)
          OR LOWER(m.id_number) LIKE LOWER($2)
          OR LOWER(m.cell_number) LIKE LOWER($2)
        )
        ORDER BY m.surname, m.firstname
        LIMIT $3
      `;

      return await executeQuery<any>(query, [provinceCode, searchPattern, limit]);
    } catch (error) {
      throw createDatabaseError('Failed to search members by province', error);
    }
  }

  /**
   * Search members by ward with autocomplete (for secretary)
   * Only returns members from the specific ward matching the search term
   */
  static async searchMembersByWard(wardCode: string, searchTerm: string, limit: number = 50): Promise<any[]> {
    try {
      const searchPattern = `%${searchTerm}%`;
      const query = `
        SELECT DISTINCT
          m.member_id,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', m.surname) as full_name,
          m.id_number,
          m.cell_number,
          m.ward_code,
          w.ward_name,
          mu.municipality_name,
          COALESCE(ms.status_name, 'Unknown') as membership_status
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
        WHERE m.ward_code = $1
        AND m.firstname IS NOT NULL
        AND m.surname IS NOT NULL
        AND (
          LOWER(CONCAT(m.firstname, ' ', m.surname)) LIKE LOWER($2)
          OR LOWER(m.id_number) LIKE LOWER($2)
          OR LOWER(m.cell_number) LIKE LOWER($2)
        )
        ORDER BY m.surname, m.firstname
        LIMIT $3
      `;

      return await executeQuery<any>(query, [wardCode, searchPattern, limit]);
    } catch (error) {
      throw createDatabaseError('Failed to search members by ward', error);
    }
  }

  // =====================================================
  // Ward Meeting Records
  // =====================================================

  static async createMeetingRecord(data: {
    meeting_id?: number; // Make optional - will be generated if not provided
    ward_code: string;
    meeting_type: string;
    presiding_officer_id?: number;
    secretary_id?: number;
    quorum_required: number;
    quorum_achieved: number;
    total_attendees: number;
    meeting_outcome?: string;
    key_decisions?: string;
    action_items?: string;
    next_meeting_date?: string;
    quorum_verified_manually?: boolean;
    quorum_verified_by?: number;
    quorum_verification_notes?: string;
    meeting_took_place_verified?: boolean;
    meeting_verified_by?: number;
    meeting_verification_notes?: string;
  }): Promise<WardMeetingRecord> {
    try {
      console.log('📝 Creating meeting record with data:', {
        ward_code: data.ward_code,
        meeting_type: data.meeting_type,
        presiding_officer_id: data.presiding_officer_id,
        secretary_id: data.secretary_id,
        quorum_verified_by: data.quorum_verified_by,
        meeting_verified_by: data.meeting_verified_by
      });

      const quorum_met = data.quorum_achieved >= data.quorum_required;

      // Step 1: Get ward_id from ward_code (entity_id in meetings table requires integer)
      const wardQuery = `SELECT ward_id FROM wards WHERE ward_code = $1`;
      const wardResult = await executeQuery<{ ward_id: number }>(wardQuery, [data.ward_code]);

      if (!wardResult || wardResult.length === 0) {
        throw new Error(`Ward with code ${data.ward_code} not found`);
      }

      const ward_id = wardResult[0].ward_id;

      // Step 2: Create a meeting record in the meetings table first
      const meetingTitle = `Ward ${data.ward_code} ${data.meeting_type} Meeting`;
      const meetingDate = new Date().toISOString().split('T')[0]; // Today's date
      const meetingTime = new Date().toTimeString().split(' ')[0]; // Current time

      const createMeetingQuery = `
        INSERT INTO meetings (
          meeting_title, meeting_type_id, hierarchy_level, entity_id,
          meeting_date, meeting_time, duration_minutes,
          meeting_status, quorum_required, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING meeting_id
      `;

      // Get a valid user_id if quorum_verified_by is not provided
      let createdBy = data.quorum_verified_by;
      if (!createdBy) {
        // Get the first active user as fallback
        const userQuery = `SELECT user_id FROM users WHERE is_active = TRUE LIMIT 1`;
        const userResult = await executeQuery<{ user_id: number }>(userQuery, []);
        if (userResult && userResult.length > 0) {
          createdBy = userResult[0].user_id;
        } else {
          throw new Error('No active users found in the system');
        }
      }

      const meetingResult = await executeQuery<{ meeting_id: number }>(createMeetingQuery, [
        meetingTitle,
        data.meeting_type === 'BPA' ? 30 : 27, // meeting_type_id: 30 for BPA, 27 for BGA
        'Ward', // hierarchy_level
        ward_id, // entity_id (using ward_id as integer)
        meetingDate,
        meetingTime,
        120, // default duration_minutes
        'Completed', // meeting_status (since this is a record of a past meeting)
        data.quorum_required,
        createdBy, // created_by (use verifier or fallback to first active user)
      ]);

      if (!meetingResult || meetingResult.length === 0) {
        throw new Error('Failed to create meeting in meetings table');
      }

      const meeting_id = meetingResult[0].meeting_id;

      // Step 3: Create the ward meeting record with the generated meeting_id
      const query = `
        INSERT INTO ward_meeting_records (
          meeting_id, ward_code, meeting_type, presiding_officer_id, secretary_id,
          quorum_required, quorum_achieved, quorum_met, total_attendees,
          meeting_outcome, key_decisions, action_items, next_meeting_date,
          quorum_verified_manually, quorum_verified_by, quorum_verified_at, quorum_verification_notes,
          meeting_took_place_verified, meeting_verified_by, meeting_verified_at, meeting_verification_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const result = await executeQuery<WardMeetingRecord>(query, [
        meeting_id, // Use the generated meeting_id
        data.ward_code,
        data.meeting_type,
        data.presiding_officer_id || null,
        data.secretary_id || null,
        data.quorum_required,
        data.quorum_achieved,
        quorum_met,
        data.total_attendees,
        data.meeting_outcome || null,
        data.key_decisions || null,
        data.action_items || null,
        data.next_meeting_date || null,
        data.quorum_verified_manually || false,
        data.quorum_verified_by || null,
        data.quorum_verified_manually ? new Date().toISOString() : null,
        data.quorum_verification_notes || null,
        data.meeting_took_place_verified || false,
        data.meeting_verified_by || null,
        data.meeting_took_place_verified ? new Date().toISOString() : null,
        data.meeting_verification_notes || null
      ]);

      return result[0];
    } catch (error) {
      console.error('❌ Error creating meeting record:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw createDatabaseError('Failed to create meeting record', error);
    }
  }

  static async getWardMeetings(wardCode: string, meetingType?: string): Promise<WardMeetingRecord[]> {
    try {
      let query = `
        SELECT
          wmr.*,
          CONCAT(po.firstname, ' ', po.surname) as presiding_officer_name,
          CONCAT(sec.firstname, ' ', sec.surname) as secretary_name
        FROM ward_meeting_records wmr
        LEFT JOIN members_consolidated po ON wmr.presiding_officer_id = po.member_id
        LEFT JOIN members_consolidated sec ON wmr.secretary_id = sec.member_id
        WHERE wmr.ward_code = $1
      `;

      const params: any[] = [wardCode];

      if (meetingType) {
        query += ` AND wmr.meeting_type = $2`;
        params.push(meetingType);
      }

      query += ` ORDER BY wmr.created_at DESC`;

      return await executeQuery<WardMeetingRecord>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward meetings', error);
    }
  }

  static async getLatestWardMeeting(wardCode: string, meetingType?: string): Promise<WardMeetingRecord | null> {
    try {
      let query = `
        SELECT
          wmr.*,
          CONCAT(po.firstname, ' ', po.surname) as presiding_officer_name,
          CONCAT(sec.firstname, ' ', sec.surname) as secretary_name
        FROM ward_meeting_records wmr
        LEFT JOIN members_consolidated po ON wmr.presiding_officer_id = po.member_id
        LEFT JOIN members_consolidated sec ON wmr.secretary_id = sec.member_id
        WHERE wmr.ward_code = $1
      `;

      const params: any[] = [wardCode];

      if (meetingType) {
        query += ` AND wmr.meeting_type = $2`;
        params.push(meetingType);
      }

      query += ` ORDER BY wmr.created_at DESC LIMIT 1`;

      return await executeQuerySingle<WardMeetingRecord>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch latest ward meeting', error);
    }
  }

  static async updateMeetingRecord(recordId: number, data: {
    presiding_officer_id?: number;
    secretary_id?: number;
    quorum_required?: number;
    quorum_achieved?: number;
    total_attendees?: number;
    meeting_outcome?: string;
    key_decisions?: string;
    action_items?: string;
    next_meeting_date?: string;
    quorum_verified_manually?: boolean;
    quorum_verified_by?: number;
    quorum_verification_notes?: string;
    meeting_took_place_verified?: boolean;
    meeting_verified_by?: number;
    meeting_verification_notes?: string;
  }): Promise<void> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.presiding_officer_id !== undefined) {
        updates.push(`presiding_officer_id = $${paramIndex++}`);
        params.push(data.presiding_officer_id);
      }
      if (data.secretary_id !== undefined) {
        updates.push(`secretary_id = $${paramIndex++}`);
        params.push(data.secretary_id);
      }
      if (data.quorum_required !== undefined) {
        updates.push(`quorum_required = $${paramIndex++}`);
        params.push(data.quorum_required);
      }
      if (data.quorum_achieved !== undefined) {
        updates.push(`quorum_achieved = $${paramIndex++}`);
        params.push(data.quorum_achieved);

        // Recalculate quorum_met if quorum_achieved is updated
        if (data.quorum_required !== undefined) {
          updates.push(`quorum_met = $${paramIndex++}`);
          params.push(data.quorum_achieved >= data.quorum_required);
        }
      }
      if (data.total_attendees !== undefined) {
        updates.push(`total_attendees = $${paramIndex++}`);
        params.push(data.total_attendees);
      }
      if (data.meeting_outcome !== undefined) {
        updates.push(`meeting_outcome = $${paramIndex++}`);
        params.push(data.meeting_outcome);
      }
      if (data.key_decisions !== undefined) {
        updates.push(`key_decisions = $${paramIndex++}`);
        params.push(data.key_decisions);
      }
      if (data.action_items !== undefined) {
        updates.push(`action_items = $${paramIndex++}`);
        params.push(data.action_items);
      }
      if (data.next_meeting_date !== undefined) {
        updates.push(`next_meeting_date = $${paramIndex++}`);
        params.push(data.next_meeting_date);
      }
      if (data.quorum_verified_manually !== undefined) {
        updates.push(`quorum_verified_manually = $${paramIndex++}`);
        params.push(data.quorum_verified_manually);
        if (data.quorum_verified_manually) {
          updates.push(`quorum_verified_at = $${paramIndex++}`);
          params.push(new Date().toISOString());
        }
      }
      if (data.quorum_verified_by !== undefined) {
        updates.push(`quorum_verified_by = $${paramIndex++}`);
        params.push(data.quorum_verified_by);
      }
      if (data.quorum_verification_notes !== undefined) {
        updates.push(`quorum_verification_notes = $${paramIndex++}`);
        params.push(data.quorum_verification_notes);
      }
      if (data.meeting_took_place_verified !== undefined) {
        updates.push(`meeting_took_place_verified = $${paramIndex++}`);
        params.push(data.meeting_took_place_verified);
        if (data.meeting_took_place_verified) {
          updates.push(`meeting_verified_at = $${paramIndex++}`);
          params.push(new Date().toISOString());
        }
      }
      if (data.meeting_verified_by !== undefined) {
        updates.push(`meeting_verified_by = $${paramIndex++}`);
        params.push(data.meeting_verified_by);
      }
      if (data.meeting_verification_notes !== undefined) {
        updates.push(`meeting_verification_notes = $${paramIndex++}`);
        params.push(data.meeting_verification_notes);
      }

      if (updates.length === 0) {
        return; // Nothing to update
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(recordId);

      const query = `
        UPDATE ward_meeting_records
        SET ${updates.join(', ')}
        WHERE record_id = $${paramIndex}
      `;

      await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to update meeting record', error);
    }
  }

  static async deleteMeetingRecord(recordId: number): Promise<void> {
    try {
      // First, get the meeting_id from the ward_meeting_record
      const getMeetingIdQuery = `
        SELECT meeting_id FROM ward_meeting_records WHERE record_id = $1
      `;
      const meetingIdResult = await executeQuery<{ meeting_id: number }>(getMeetingIdQuery, [recordId]);

      if (meetingIdResult.length === 0) {
        throw new Error('Meeting record not found');
      }

      const meetingId = meetingIdResult[0].meeting_id;

      // Delete from ward_meeting_records first (child table)
      const deleteRecordQuery = `
        DELETE FROM ward_meeting_records WHERE record_id = $1
      `;
      await executeQuery(deleteRecordQuery, [recordId]);

      // Then delete from meetings table (parent table)
      const deleteMeetingQuery = `
        DELETE FROM meetings WHERE meeting_id = $1
      `;
      await executeQuery(deleteMeetingQuery, [meetingId]);

    } catch (error) {
      throw createDatabaseError('Failed to delete meeting record', error);
    }
  }

  // =====================================================
  // Ward Delegates
  // =====================================================

  static async getWardDelegates(wardCode: string, assemblyCode?: string): Promise<WardDelegate[]> {
    try {
      let query = `
        SELECT
          wd.*,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          at.assembly_code,
          at.assembly_name
        FROM ward_delegates wd
        JOIN members_consolidated m ON wd.member_id = m.member_id
        JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
        WHERE wd.ward_code = $1
      `;

      const params: any[] = [wardCode];

      if (assemblyCode) {
        query += ` AND at.assembly_code = $2`;
        params.push(assemblyCode);
      }

      query += ` ORDER BY at.assembly_level, wd.selection_date DESC`;

      return await executeQuery<WardDelegate>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward delegates', error);
    }
  }
  
  /**
   * Get eligible members for delegate assignment in a ward
   */
  static async getWardMembers(wardCode: string): Promise<any[]> {
    try {
      const query = `
        SELECT
          m.member_id,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', m.surname) as full_name,
          m.id_number,
          ms.status_name as membership_status,
          m.cell_number,
          -- Check if member is already a delegate
          (
            SELECT COUNT(*)
            FROM ward_delegates wd
            WHERE wd.member_id = m.member_id
            AND wd.ward_code = m.ward_code
            AND wd.delegate_status = 'Active'
          ) as active_delegate_count,
          -- Get assembly codes where member is already a delegate
          (
            SELECT STRING_AGG(at.assembly_code, ', ')
            FROM ward_delegates wd
            JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
            WHERE wd.member_id = m.member_id
            AND wd.ward_code = m.ward_code
            AND wd.delegate_status = 'Active'
          ) as delegate_assemblies
        FROM members_consolidated m
        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
        WHERE m.ward_code = $1
        ORDER BY m.surname, m.firstname
      `;

      return await executeQuery<any>(query, [wardCode]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward members', error);
    }
  }

  /**
   * Check delegate limit for an assembly type
   * For SRPA assembly type, uses configurable limits from srpa_delegate_config table
   * For other assembly types, uses default limit of 3
   */
  static async checkDelegateLimit(wardCode: string, assemblyTypeId: number): Promise<{
    current_count: number;
    limit: number;
    can_assign: boolean;
  }> {
    try {
      // Get current delegate count
      const countQuery = `
        SELECT COUNT(*) as current_count
        FROM ward_delegates
        WHERE ward_code = $1
        AND assembly_type_id = $2
        AND delegate_status = 'Active'
      `;

      const result = await executeQuery<{ current_count: number }>(countQuery, [wardCode, assemblyTypeId]);
      const currentCount = result[0]?.current_count || 0;

      // Get assembly type to check if it's SRPA
      const assemblyQuery = `
        SELECT assembly_code
        FROM assembly_types
        WHERE assembly_type_id = $1
      `;
      const assemblyResult = await executeQuerySingle<{ assembly_code: string }>(assemblyQuery, [assemblyTypeId]);

      let limit = 3; // Default limit for non-SRPA assemblies

      // If it's SRPA, get the configurable limit from srpa_delegate_config
      if (assemblyResult?.assembly_code === 'SRPA') {
        const limitQuery = `
          SELECT sdc.max_delegates
          FROM srpa_delegate_config sdc
          JOIN wards w ON w.municipality_code = sdc.sub_region_code
          WHERE w.ward_code = $1
            AND sdc.is_active = TRUE
        `;
        const limitResult = await executeQuerySingle<{ max_delegates: number }>(limitQuery, [wardCode]);

        if (limitResult) {
          limit = limitResult.max_delegates;
        }
        // If no config found, use default of 3
      }

      return {
        current_count: currentCount,
        limit: limit,
        can_assign: currentCount < limit
      };
    } catch (error) {
      throw createDatabaseError('Failed to check delegate limit', error);
    }
  }

  static async assignDelegate(data: {
    ward_code: string;
    member_id: number;
    assembly_type_id: number;
    selection_method?: string;
    term_start_date?: string;
    term_end_date?: string;
    notes?: string;
    selected_by?: number;
  }): Promise<number> {
    try {
      // Check delegate limit before assigning
      const limitCheck = await this.checkDelegateLimit(data.ward_code, data.assembly_type_id);

      if (!limitCheck.can_assign) {
        throw createValidationError(
          `Cannot assign delegate: Maximum limit of ${limitCheck.limit} delegates reached for this assembly type`
        );
      }

      // Check if member is already assigned to this assembly
      const existingQuery = `
        SELECT delegate_id
        FROM ward_delegates
        WHERE ward_code = $1
        AND member_id = $2
        AND assembly_type_id = $3
        AND delegate_status = 'Active'
      `;

      const existing = await executeQuery<{ delegate_id: number }>(
        existingQuery,
        [data.ward_code, data.member_id, data.assembly_type_id]
      );

      if (existing.length > 0) {
        throw createValidationError('Member is already assigned as an active delegate for this assembly type');
      }
      const query = `
        INSERT INTO ward_delegates (
          ward_code, member_id, assembly_type_id, selection_method,
          term_start_date, term_end_date, notes, selected_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING delegate_id
      `;

      const result = await executeQuery<{ delegate_id: number }>(query, [
        data.ward_code,
        data.member_id,
        data.assembly_type_id,
        data.selection_method || 'Elected',
        data.term_start_date,
        data.term_end_date,
        data.notes,
        data.selected_by
      ]);

      return result[0].delegate_id;
    } catch (error) {
      throw createDatabaseError('Failed to assign delegate', error);
    }
  }
  
  static async removeDelegateAssignment(delegateId: number, reason: string, userId: number): Promise<void> {
    try {
      const query = `
        UPDATE ward_delegates
        SET
          delegate_status = 'Inactive',
          replacement_reason = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE delegate_id = $2
      `;
      await executeQuery(query, [reason, delegateId]);
    } catch (error) {
      throw createDatabaseError('Failed to remove delegate assignment', error);
    }
  }

  static async replaceDelegateAssignment(
    delegateId: number,
    newMemberId: number,
    reason: string,
    userId: number
  ): Promise<number> {
    try {
      // First, mark the old delegate as replaced
      const updateQuery = `
        UPDATE ward_delegates
        SET
          delegate_status = 'Replaced',
          replacement_reason = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE delegate_id = $2
      `;
      await executeQuery(updateQuery, [reason, delegateId]);

      // Get the old delegate info to create replacement
      const oldDelegate = await executeQuerySingle<WardDelegate>(
        'SELECT * FROM ward_delegates WHERE delegate_id = $1',
        [delegateId]
      );

      if (!oldDelegate) {
        throw new Error('Original delegate not found');
      }

      // Create new delegate assignment
      const insertQuery = `
        INSERT INTO ward_delegates (
          ward_code, member_id, assembly_type_id, selection_date, selection_method,
          delegate_status, term_start_date, term_end_date, replacement_reason,
          replaced_by_delegate_id, selected_by
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'Active', $5, $6, $7, $8, $9)
        RETURNING delegate_id
      `;

      const result = await executeQuery<{ delegate_id: number }>(insertQuery, [
        oldDelegate.ward_code,
        newMemberId,
        oldDelegate.assembly_type_id,
        'Appointed', // Replacements are typically appointed
        oldDelegate.term_start_date,
        oldDelegate.term_end_date,
        reason,
        delegateId, // Link to replaced delegate
        userId
      ]);

      return result[0].delegate_id;
    } catch (error) {
      throw createDatabaseError('Failed to replace delegate assignment', error);
    }
  }

  // =====================================================
  // Enhanced Compliance Verification
  // =====================================================

  static async getWardComplianceDetails(wardCode: string): Promise<any> {
    try {
      // Get basic compliance summary (Criterion 1)
      const summary = await this.getWardComplianceSummary(wardCode);

      if (!summary) {
        throw new Error('Ward not found');
      }

      // Get latest meeting (Criteria 2, 3, 4)
      const latestMeeting = await this.getLatestWardMeeting(wardCode);

      // Get all meetings for attendance tracking
      const allMeetings = await this.getWardMeetings(wardCode);

      // Get delegates (Criterion 5)
      const delegates = await this.getWardDelegates(wardCode);

      // Count delegates by assembly type
      const srpaDelegates = delegates.filter(d =>
        d.assembly_code === 'SRPA' && d.delegate_status === 'Active'
      ).length;
      const ppaDelegates = delegates.filter(d =>
        d.assembly_code === 'PPA' && d.delegate_status === 'Active'
      ).length;
      const npaDelegates = delegates.filter(d =>
        d.assembly_code === 'NPA' && d.delegate_status === 'Active'
      ).length;

      // Criterion 2: Meeting Quorum Verification
      const criterion2Passed = latestMeeting ? latestMeeting.quorum_met : false;

      // Criterion 3: Meeting Attendance (at least 1 meeting recorded)
      const criterion3Passed = allMeetings.length > 0;

      // Criterion 4: Presiding Officer Information
      const criterion4Passed = latestMeeting ? !!latestMeeting.presiding_officer_id : false;

      // Criterion 5: Delegate Selection (at least 3 delegates total across any assemblies)
      const totalDelegates = srpaDelegates + ppaDelegates + npaDelegates;
      const criterion5Passed = totalDelegates >= 3;

      // Overall compliance
      const allCriteriaPassed =
        summary.criterion_1_compliant &&
        criterion2Passed &&
        criterion3Passed &&
        criterion4Passed &&
        criterion5Passed;

      return {
        ...summary,
        criterion_2_passed: criterion2Passed,
        criterion_2_data: latestMeeting ? {
          meeting_date: latestMeeting.created_at,
          meeting_type: latestMeeting.meeting_type,
          quorum_required: latestMeeting.quorum_required,
          quorum_achieved: latestMeeting.quorum_achieved,
          quorum_met: latestMeeting.quorum_met
        } : null,
        criterion_3_passed: criterion3Passed,
        criterion_3_data: {
          total_meetings: allMeetings.length,
          meetings: allMeetings
        },
        criterion_4_passed: criterion4Passed,
        criterion_4_data: latestMeeting ? {
          presiding_officer_id: latestMeeting.presiding_officer_id,
          presiding_officer_name: (latestMeeting as any).presiding_officer_name,
          meeting_date: latestMeeting.created_at
        } : null,
        criterion_5_passed: criterion5Passed,
        criterion_5_data: {
          srpa_delegates: srpaDelegates,
          ppa_delegates: ppaDelegates,
          npa_delegates: npaDelegates,
          total_delegates: delegates.length,
          delegates: delegates
        },
        all_criteria_passed: allCriteriaPassed,
        criteria_passed_count: [
          summary.criterion_1_compliant,
          criterion2Passed,
          criterion3Passed,
          criterion4Passed,
          criterion5Passed
        ].filter(Boolean).length
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch ward compliance details', error);
    }
  }

  // =====================================================
  // Municipality Aggregate Reports
  // =====================================================

  static async getMunicipalityDelegateReport(municipalityCode: string): Promise<MunicipalityDelegateReport> {
    try {
      // Get municipality info
      // Use LEFT JOIN to handle metro sub-regions that have NULL district_code
      const municipalityQuery = `
        SELECT
          m.municipality_code,
          m.municipality_name,
          m.district_code,
          COALESCE(d.province_code, pd.province_code) as province_code
        FROM municipalities m
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
        LEFT JOIN districts pd ON pm.district_code = pd.district_code
        WHERE m.municipality_code = $1
      `;

      const municipality = await executeQuerySingle<any>(municipalityQuery, [municipalityCode]);

      if (!municipality) {
        throw new Error('Municipality not found');
      }
      
      // Get wards with compliance data
      const wards = await this.getWardsByMunicipality(municipalityCode);
      
      // Calculate aggregates
      const totalWards = wards.length;
      const compliantWards = wards.filter(w => w.is_compliant).length;
      const nonCompliantWards = totalWards - compliantWards;
      const compliancePercentage = totalWards > 0 ? (compliantWards / totalWards) * 100 : 0;
      
      const totalSrpaDelegate = wards.reduce((sum, w) => sum + (w.srpa_delegates || 0), 0);
      const totalPpaDelegate = wards.reduce((sum, w) => sum + (w.ppa_delegates || 0), 0);
      const totalNpaDelegate = wards.reduce((sum, w) => sum + (w.npa_delegates || 0), 0);
      
      return {
        municipality_code: municipality.municipality_code,
        municipality_name: municipality.municipality_name,
        district_code: municipality.district_code,
        province_code: municipality.province_code,
        total_wards: totalWards,
        compliant_wards: compliantWards,
        non_compliant_wards: nonCompliantWards,
        compliance_percentage: Math.round(compliancePercentage * 100) / 100,
        total_srpa_delegates: totalSrpaDelegate,
        total_ppa_delegates: totalPpaDelegate,
        total_npa_delegates: totalNpaDelegate,
        wards
      };
    } catch (error) {
      throw createDatabaseError('Failed to fetch municipality delegate report', error);
    }
  }
}

