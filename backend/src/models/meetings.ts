import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Enhanced Meeting interfaces for hierarchical system
export interface MeetingType {
  type_id: number;
  type_name: string;
  type_code: string;
  description?: string;
  hierarchy_level: 'National' | 'Provincial' | 'Regional' | 'Municipal' | 'Ward';
  meeting_category: 'Regular' | 'Assembly' | 'Conference' | 'Special' | 'Emergency';
  default_duration_minutes: number;
  requires_quorum: boolean;
  min_notice_days: number;
  max_notice_days: number;
  frequency_type: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'Ad-hoc';
  auto_invite_rules?: any; // JSON structure for automatic invitation rules
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationalRole {
  role_id: number;
  role_name: string;
  role_code: string;
  hierarchy_level: 'National' | 'Provincial' | 'Regional' | 'Municipal' | 'Ward' | 'Branch';
  role_category: 'Executive' | 'Leadership' | 'Administrative' | 'Representative' | 'Member';
  role_description?: string;
  has_voting_rights: boolean;
  can_chair_meetings: boolean;
  meeting_invitation_priority: number;
  is_active: boolean;
}

export interface MemberRole {
  member_role_id: number;
  member_id: number;
  role_id: number;
  entity_id?: number;
  entity_type?: 'Province' | 'Region' | 'Municipality' | 'Ward' | 'Branch';
  appointment_date: string;
  termination_date?: string;
  is_active: boolean;
  appointed_by?: number;
  appointment_notes?: string;
}

export interface Meeting {
  meeting_id: number;
  meeting_title: string;
  meeting_type_id: number;
  hierarchy_level: 'National' | 'Provincial' | 'Regional' | 'Municipal' | 'Ward';
  entity_id?: number;
  entity_type?: 'Province' | 'Region' | 'Municipality' | 'Ward';
  meeting_date: string;
  meeting_time: string;
  end_time?: string;
  duration_minutes: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_platform: 'In-Person' | 'Virtual' | 'Hybrid';
  meeting_status: 'Draft' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Postponed';
  description?: string;
  objectives?: string;
  agenda_summary?: string;
  quorum_required: number;
  quorum_achieved: number;
  total_attendees: number;
  total_invited: number;
  meeting_chair_id?: number;
  meeting_secretary_id?: number;
  created_by: number;
  scheduled_at?: string;
  invitations_sent_at?: string;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingDetails extends Meeting {
  type_name: string;
  type_code: string;
  meeting_category: string;
  chair_name?: string;
  secretary_name?: string;
  created_by_name: string;
  entity_name?: string;
  attendance_summary?: {
    total_invited: number;
    total_attended: number;
    total_absent: number;
    total_excused: number;
    attendance_percentage: number;
  };
}

export interface CreateMeetingData {
  title: string; // Changed from meeting_title to title
  meeting_type_id: number;
  hierarchy_level: 'National' | 'Provincial' | 'Regional' | 'Municipal' | 'Ward';
  entity_id?: number;
  entity_type?: 'Province' | 'Region' | 'Municipality' | 'Ward';
  meeting_date: string;
  meeting_time: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_platform?: 'In-Person' | 'Virtual' | 'Hybrid';
  description?: string;
  objectives?: string;
  agenda_summary?: string;
  quorum_required?: number;
  meeting_chair_id?: number;
  meeting_secretary_id?: number;
  created_by?: number; // Made optional with default
  auto_send_invitations?: boolean;
}

export interface UpdateMeetingData {
  meeting_title?: string;
  meeting_date?: string;
  meeting_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  virtual_meeting_link?: string;
  meeting_platform?: 'In-Person' | 'Virtual' | 'Hybrid';
  meeting_status?: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Postponed';
  description?: string;
  objectives?: string;
  quorum_required?: number;
  quorum_achieved?: number;
  total_attendees?: number;
  meeting_chair_id?: number;
  meeting_secretary_id?: number;
}

export interface MeetingFilters {
  meeting_type_id?: number;
  hierarchy_level?: string;
  entity_id?: number;
  meeting_status?: string;
  meeting_platform?: string;
  meeting_date_from?: string;
  meeting_date_to?: string;
  created_by?: number;
  meeting_chair_id?: number;
  search?: string;
}

export interface MeetingAttendance {
  attendance_id: number;
  meeting_id: number;
  member_id: number;
  invitation_status: 'Not Sent' | 'Sent' | 'Delivered' | 'Opened' | 'Failed';
  attendance_status: 'Invited' | 'Confirmed' | 'Declined' | 'Attended' | 'Absent' | 'Excused' | 'Late';
  attendance_type: 'Required' | 'Optional' | 'Observer' | 'Guest' | 'Delegate';
  invitation_method: 'Email' | 'SMS' | 'System' | 'Manual';
  role_in_meeting?: string;
  check_in_time?: string;
  check_out_time?: string;
  attendance_notes?: string;
  voting_rights: boolean;
  proxy_for_member_id?: number;
  invitation_sent_at?: string;
  response_received_at?: string;
  recorded_by?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingInvitationRule {
  rule_id: number;
  meeting_type_id: number;
  rule_name: string;
  rule_description?: string;
  rule_priority: number;
  rule_conditions: any; // JSON structure
  invitation_targets: any; // JSON structure
  is_active: boolean;
}

export interface AutoInvitationRequest {
  meeting_id: number;
  meeting_type_id: number;
  hierarchy_level: string;
  entity_id?: number;
  entity_type?: string;
  // Optional geographic codes to support ward/province/municipality targeting
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  override_rules?: any[];
}

export interface InvitationTarget {
  member_id: number;
  attendance_type: 'Required' | 'Optional' | 'Observer' | 'Guest' | 'Delegate';
  role_in_meeting?: string;
  voting_rights: boolean;
  invitation_priority: number;
}

export interface LegacyMeetingAttendance {
  meeting_id: number;
  member_id: number;
  attendance_status: 'Present' | 'Absent' | 'Excused' | 'Late';
  check_in_time?: string;
  check_out_time?: string;
  attendance_notes?: string;
  recorded_by?: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDetails extends MeetingAttendance {
  member_name: string;
  member_id_number: string;
  recorder_name?: string;
}

export interface CreateAttendanceData {
  meeting_id: number;
  member_id: number;
  attendance_status: 'Present' | 'Absent' | 'Excused' | 'Late';
  check_in_time?: string;
  check_out_time?: string;
  attendance_notes?: string;
  recorded_by?: number;
}

export interface UpdateAttendanceData {
  attendance_status?: 'Present' | 'Absent' | 'Excused' | 'Late';
  check_in_time?: string;
  check_out_time?: string;
  attendance_notes?: string;
  recorded_by?: number;
}

// Meeting model class
export class MeetingModel {
  // Get meeting types
  static async getMeetingTypes(): Promise<MeetingType[]> {
    try {
      const query = `
        SELECT * FROM meeting_types
        WHERE is_active = TRUE
        ORDER BY type_name
      `;
      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get meeting types', error);
    }
  }

  // Get meeting type by ID
  static async getMeetingTypeById(typeId: number): Promise<MeetingType | null> {
    try {
      const query = `
        SELECT * FROM meeting_types
        WHERE type_id = ?
      `;
      return await executeQuerySingle(query, [typeId]);
    } catch (error) {
      throw createDatabaseError('Failed to get meeting type', error);
    }
  }

  // Create new hierarchical meeting (adapted to work with existing database schema)
  static async createMeeting(meetingData: CreateMeetingData): Promise<number> {
    try {
      // Convert meeting_date and meeting_time to start_datetime and end_datetime
      const meetingDate = meetingData.meeting_date;
      const meetingTime = meetingData.meeting_time;
      const endTime = meetingData.end_time;
      const durationMinutes = meetingData.duration_minutes || 120;

      // Ensure we have string values for date/time - simplified approach
      let dateStr: string;
      let timeStr: string;

      // Handle date conversion more safely
      if (typeof meetingDate === 'string') {
        dateStr = meetingDate;
      } else {
        // Convert any non-string to string, handling Date objects
        const dateObj = meetingDate as any;
        if (dateObj && typeof dateObj.toISOString === 'function') {
          dateStr = dateObj.toISOString().split('T')[0];
        } else {
          dateStr = String(meetingDate);
        }
      }

      // Handle time conversion
      timeStr = String(meetingTime);

      // Create start_datetime with better error handling
      const startDateTime = new Date(`${dateStr}T${timeStr}:00`);

      if (isNaN(startDateTime.getTime())) {
        throw new Error(`Invalid meeting date/time: ${dateStr}T${timeStr}:00`);
      }

      // Create end_datetime (either from end_time or calculated from duration)
      let endDateTime: Date;
      if (endTime && endTime.trim() !== '') {
        endDateTime = new Date(`${dateStr}T${endTime}:00`);
        if (isNaN(endDateTime.getTime())) {
          throw new Error(`Invalid end time: ${endTime}`);
        }
      } else {
        endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60000));
      }

      const query = `
        INSERT INTO meetings (
          title, description, hierarchy_level, entity_id, meeting_type,
          start_datetime, end_datetime, location, virtual_meeting_link,
          meeting_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        meetingData.title, // Use 'title' not 'meeting_title'
        meetingData.description || null,
        meetingData.hierarchy_level,
        meetingData.entity_id || 1, // Default to 1 for National meetings
        'Regular', // Map to existing enum values - we'll need to enhance this later
        startDateTime,
        endDateTime,
        meetingData.location || null,
        meetingData.virtual_meeting_link || null,
        'Scheduled', // Default status for new meetings
        meetingData.created_by || 1 // Default user ID
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      console.error('Database error creating meeting:', error);
      throw createDatabaseError('Failed to create meeting', error);
    }
  }

  // Create invitation record
  static async createInvitation(invitationData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_invitations (
          meeting_id, member_id, invitation_status, attendance_type,
          role_in_meeting, voting_rights, invitation_method, invitation_sent_at,
          invitation_priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        invitationData.meeting_id,
        invitationData.member_id,
        invitationData.invitation_status || 'Pending',
        invitationData.attendance_type || 'Required',
        invitationData.role_in_meeting || null,
        invitationData.voting_rights || true,
        invitationData.invitation_method || 'System',
        invitationData.invitation_sent_at || null,
        invitationData.invitation_priority || 1
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create invitation record', error);
    }
  }

  // Create attendance record (for actual attendance tracking)
  static async createAttendance(attendanceData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_attendance (
          meeting_id, member_id, attendance_status, attendance_notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const params = [
        attendanceData.meeting_id,
        attendanceData.member_id,
        attendanceData.attendance_status || 'Absent', // Default to Absent until they actually attend
        attendanceData.attendance_notes || null,
        attendanceData.recorded_by || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create attendance record', error);
    }
  }

  // Get invitation by meeting and member
  static async getInvitationByMeetingAndMember(meetingId: number, memberId: number): Promise<any> {
    try {
      const query = `
        SELECT * FROM meeting_invitations
        WHERE meeting_id = ? AND member_id = ?
      `;
      const result = await executeQuerySingle(query, [meetingId, memberId]);
      return result;
    } catch (error) {
      throw createDatabaseError('Failed to get invitation record', error);
    }
  }

  // Update invitation record
  static async updateInvitation(invitationId: number, updateData: any): Promise<void> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.invitation_status !== undefined) {
        fields.push('invitation_status = ?');
        params.push(updateData.invitation_status);
      }
      if (updateData.attendance_type !== undefined) {
        fields.push('attendance_type = ?');
        params.push(updateData.attendance_type);
      }
      if (updateData.role_in_meeting !== undefined) {
        fields.push('role_in_meeting = ?');
        params.push(updateData.role_in_meeting);
      }
      if (updateData.voting_rights !== undefined) {
        fields.push('voting_rights = ?');
        params.push(updateData.voting_rights);
      }
      if (updateData.invitation_priority !== undefined) {
        fields.push('invitation_priority = ?');
        params.push(updateData.invitation_priority);
      }

      if (fields.length === 0) return;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(invitationId);

      const query = `UPDATE meeting_invitations SET ${fields.join(', ')} WHERE id = ?`;
      await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to update invitation record', error);
    }
  }



  // Get attendance by meeting and member
  static async getAttendanceByMeetingAndMember(meetingId: number, memberId: number): Promise<any> {
    try {
      const query = `
        SELECT * FROM meeting_attendance
        WHERE meeting_id = ? AND member_id = ?
      `;
      return await executeQuerySingle(query, [meetingId, memberId]);
    } catch (error) {
      throw createDatabaseError('Failed to get attendance record', error);
    }
  }



  // Execute query helper (for compatibility)
  static async executeQuery(query: string, params?: any[]): Promise<any> {
    return await executeQuery(query, params);
  }

  // Get meeting by ID with details
  static async getMeetingById(id: number): Promise<MeetingDetails | null> {
    try {
      const query = `
        SELECT 
          m.*,
          u.name as creator_name,
          CASE 
            WHEN m.hierarchy_level = 'Province' THEN p.province_name
            WHEN m.hierarchy_level = 'Region' THEN d.district_name
            WHEN m.hierarchy_level = 'Municipality' THEN mu.municipality_name
            WHEN m.hierarchy_level = 'Ward' THEN w.ward_name
            ELSE 'National'
          END as entity_name,
          COALESCE(attendance_stats.attendee_count, 0) as attendee_count,
          COALESCE(attendance_stats.present_count, 0) as present_count,
          COALESCE(attendance_stats.absent_count, 0) as absent_count,
          COALESCE(attendance_stats.excused_count, 0) as excused_count,
          COALESCE(attendance_stats.late_count, 0) as late_count
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN provinces p ON m.hierarchy_level = 'Province' AND m.entity_id = p.id
        LEFT JOIN districts d ON m.hierarchy_level = 'Region' AND m.entity_id = d.id
        LEFT JOIN municipalities mu ON m.hierarchy_level = 'Municipality' AND m.entity_id = mu.id
        LEFT JOIN wards w ON m.hierarchy_level = 'Ward' AND m.entity_id = w.id
        LEFT JOIN (
          SELECT 
            meeting_id,
            COUNT(*) as attendee_count,
            COUNT(CASE WHEN attendance_status = 'Present' THEN 1 END) as present_count,
            COUNT(CASE WHEN attendance_status = 'Absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN attendance_status = 'Excused' THEN 1 END) as excused_count,
            COUNT(CASE WHEN attendance_status = 'Late' THEN 1 END) as late_count
          FROM meeting_attendance
          GROUP BY meeting_id
        ) attendance_stats ON m.id = attendance_stats.meeting_id
        WHERE m.id = ?
      `;

      return await executeQuerySingle<MeetingDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch meeting', error);
    }
  }

  // Get meetings with filtering and pagination
  static async getMeetings(
    limit: number = 20,
    offset: number = 0,
    filters: MeetingFilters = {}
  ): Promise<MeetingDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND m.hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        whereClause += ' AND m.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.meeting_type_id) {
        whereClause += ' AND m.meeting_type_id = ?';
        params.push(filters.meeting_type_id);
      }

      if (filters.meeting_status) {
        whereClause += ' AND m.meeting_status = ?';
        params.push(filters.meeting_status);
      }

      if (filters.meeting_platform) {
        whereClause += ' AND m.meeting_platform = ?';
        params.push(filters.meeting_platform);
      }

      if (filters.created_by) {
        whereClause += ' AND m.created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.meeting_chair_id) {
        whereClause += ' AND m.meeting_chair_id = ?';
        params.push(filters.meeting_chair_id);
      }

      if (filters.meeting_date_from) {
        whereClause += ' AND m.meeting_date >= ?';
        params.push(filters.meeting_date_from);
      }

      if (filters.meeting_date_to) {
        whereClause += ' AND m.meeting_date <= ?';
        params.push(filters.meeting_date_to);
      }

      if (filters.search) {
        whereClause += ' AND (m.meeting_title LIKE ? OR m.description LIKE ? OR m.objectives LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT 
          m.*,
          u.name as creator_name,
          CASE 
            WHEN m.hierarchy_level = 'Province' THEN p.province_name
            WHEN m.hierarchy_level = 'Region' THEN d.district_name
            WHEN m.hierarchy_level = 'Municipality' THEN mu.municipality_name
            WHEN m.hierarchy_level = 'Ward' THEN w.ward_name
            ELSE 'National'
          END as entity_name,
          COALESCE(attendance_stats.attendee_count, 0) as attendee_count,
          COALESCE(attendance_stats.present_count, 0) as present_count,
          COALESCE(attendance_stats.absent_count, 0) as absent_count,
          COALESCE(attendance_stats.excused_count, 0) as excused_count,
          COALESCE(attendance_stats.late_count, 0) as late_count
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN provinces p ON m.hierarchy_level = 'Province' AND m.entity_id = p.id
        LEFT JOIN districts d ON m.hierarchy_level = 'Region' AND m.entity_id = d.id
        LEFT JOIN municipalities mu ON m.hierarchy_level = 'Municipality' AND m.entity_id = mu.id
        LEFT JOIN wards w ON m.hierarchy_level = 'Ward' AND m.entity_id = w.id
        LEFT JOIN (
          SELECT 
            meeting_id,
            COUNT(*) as attendee_count,
            COUNT(CASE WHEN attendance_status = 'Present' THEN 1 END) as present_count,
            COUNT(CASE WHEN attendance_status = 'Absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN attendance_status = 'Excused' THEN 1 END) as excused_count,
            COUNT(CASE WHEN attendance_status = 'Late' THEN 1 END) as late_count
          FROM meeting_attendance
          GROUP BY meeting_id
        ) attendance_stats ON m.id = attendance_stats.meeting_id
        ${whereClause}
        ORDER BY m.start_datetime DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<MeetingDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch meetings', error);
    }
  }

  // Get meeting count with filters
  static async getMeetingCount(filters: MeetingFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        whereClause += ' AND entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.meeting_type_id) {
        whereClause += ' AND meeting_type_id = ?';
        params.push(filters.meeting_type_id);
      }

      if (filters.meeting_status) {
        whereClause += ' AND meeting_status = ?';
        params.push(filters.meeting_status);
      }

      if (filters.created_by) {
        whereClause += ' AND created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.meeting_date_from) {
        whereClause += ' AND meeting_date >= ?';
        params.push(filters.meeting_date_from);
      }

      if (filters.meeting_date_to) {
        whereClause += ' AND meeting_date <= ?';
        params.push(filters.meeting_date_to);
      }

      if (filters.search) {
        whereClause += ' AND (meeting_title LIKE ? OR description LIKE ? OR objectives LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const query = `SELECT COUNT(*) as count FROM meetings ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get meeting count', error);
    }
  }

  // Update meeting
  static async updateMeeting(id: number, updateData: UpdateMeetingData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update meeting', error);
    }
  }

  // Delete meeting
  static async deleteMeeting(id: number): Promise<boolean> {
    try {
      // First delete all attendance records
      await executeQuery('DELETE FROM meeting_attendance WHERE meeting_id = ?', [id]);

      // Then delete the meeting
      const query = 'DELETE FROM meetings WHERE id = ?';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete meeting', error);
    }
  }

  // Get upcoming meetings
  static async getUpcomingMeetings(limit: number = 10, filters: MeetingFilters = {}): Promise<MeetingDetails[]> {
    try {
      const upcomingFilters = {
        ...filters,
        meeting_status: 'Scheduled',
        start_date_from: new Date().toISOString()
      };

      return await this.getMeetings(limit, 0, upcomingFilters);
    } catch (error) {
      throw createDatabaseError('Failed to fetch upcoming meetings', error);
    }
  }

  // Get meeting statistics
  static async getMeetingStatistics(filters: MeetingFilters = {}): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.hierarchy_level) {
        whereClause += ' AND hierarchy_level = ?';
        params.push(filters.hierarchy_level);
      }

      if (filters.entity_id) {
        whereClause += ' AND entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.meeting_date_from) {
        whereClause += ' AND meeting_date >= ?';
        params.push(filters.meeting_date_from);
      }

      if (filters.meeting_date_to) {
        whereClause += ' AND meeting_date <= ?';
        params.push(filters.meeting_date_to);
      }

      const query = `
        SELECT
          COUNT(*) as total_meetings,
          COUNT(CASE WHEN meeting_status = 'Scheduled' THEN 1 END) as scheduled_meetings,
          COUNT(CASE WHEN meeting_status = 'In Progress' THEN 1 END) as in_progress_meetings,
          COUNT(CASE WHEN meeting_status = 'Completed' THEN 1 END) as completed_meetings,
          COUNT(CASE WHEN meeting_status = 'Cancelled' THEN 1 END) as cancelled_meetings,
          COUNT(CASE WHEN meeting_status = 'Postponed' THEN 1 END) as postponed_meetings,
          COUNT(CASE WHEN meeting_type = 'Regular' THEN 1 END) as regular_meetings,
          COUNT(CASE WHEN meeting_type = 'Special' THEN 1 END) as special_meetings,
          COUNT(CASE WHEN meeting_type = 'Emergency' THEN 1 END) as emergency_meetings,
          COUNT(CASE WHEN meeting_type = 'Annual' THEN 1 END) as annual_meetings
        FROM meetings ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get meeting statistics', error);
    }
  }

  // ATTENDANCE METHODS

  // Record attendance for a member
  static async recordAttendance(attendanceData: CreateAttendanceData): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_attendance (
          meeting_id, member_id, attendance_status, check_in_time,
          check_out_time, attendance_notes, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          attendance_status = VALUES(attendance_status),
          check_in_time = VALUES(check_in_time),
          check_out_time = VALUES(check_out_time),
          attendance_notes = VALUES(attendance_notes),
          recorded_by = VALUES(recorded_by),
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        attendanceData.meeting_id,
        attendanceData.member_id,
        attendanceData.attendance_status,
        attendanceData.check_in_time || null,
        attendanceData.check_out_time || null,
        attendanceData.attendance_notes || null,
        attendanceData.recorded_by || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId || result.affectedRows;
    } catch (error) {
      throw createDatabaseError('Failed to record attendance', error);
    }
  }

  // Get meeting attendance
  static async getMeetingAttendance(meetingId: number): Promise<AttendanceDetails[]> {
    try {
      const query = `
        SELECT
          ma.*,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.id_number as member_id_number,
          recorder.name as recorder_name
        FROM meeting_attendance ma
        LEFT JOIN members m ON ma.member_id = m.member_id
        LEFT JOIN users recorder ON ma.recorded_by = recorder.id
        WHERE ma.meeting_id = ?
        ORDER BY m.firstname, m.surname
      `;

      return await executeQuery<AttendanceDetails>(query, [meetingId]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch meeting attendance', error);
    }
  }

  // Update attendance record
  static async updateAttendance(id: number, updateData: UpdateAttendanceData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (updateData.attendance_status !== undefined) {
        fields.push('attendance_status = ?');
        params.push(updateData.attendance_status);
      }

      if (updateData.check_in_time !== undefined) {
        fields.push('check_in_time = ?');
        params.push(updateData.check_in_time);
      }

      if (updateData.check_out_time !== undefined) {
        fields.push('check_out_time = ?');
        params.push(updateData.check_out_time);
      }

      if (updateData.attendance_notes !== undefined) {
        fields.push('attendance_notes = ?');
        params.push(updateData.attendance_notes);
      }

      if (updateData.recorded_by !== undefined) {
        fields.push('recorded_by = ?');
        params.push(updateData.recorded_by);
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE meeting_attendance SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update attendance', error);
    }
  }

  // Bulk record attendance
  static async bulkRecordAttendance(attendanceRecords: CreateAttendanceData[]): Promise<{ successful: number; failed: number }> {
    try {
      let successful = 0;
      let failed = 0;

      for (const record of attendanceRecords) {
        try {
          await this.recordAttendance(record);
          successful++;
        } catch (error) {
          console.error('Failed to record attendance for member:', record.member_id, error);
          failed++;
        }
      }

      return { successful, failed };
    } catch (error) {
      throw createDatabaseError('Failed to bulk record attendance', error);
    }
  }

  // Get member's attendance history
  static async getMemberAttendanceHistory(memberId: number, limit: number = 20): Promise<any[]> {
    try {
      const query = `
        SELECT
          ma.*,
          m.title as meeting_title,
          m.start_datetime,
          m.end_datetime,
          m.meeting_type,
          m.hierarchy_level,
          recorder.name as recorder_name
        FROM meeting_attendance ma
        LEFT JOIN meetings m ON ma.meeting_id = m.id
        LEFT JOIN users recorder ON ma.recorded_by = recorder.id
        WHERE ma.member_id = ?
        ORDER BY m.start_datetime DESC
        LIMIT ?
      `;

      return await executeQuery(query, [memberId, limit]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch member attendance history', error);
    }
  }

  // Get attendance statistics for a member
  static async getMemberAttendanceStats(memberId: number, dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      let whereClause = 'WHERE ma.member_id = ?';
      const params: any[] = [memberId];

      if (dateFrom) {
        whereClause += ' AND m.start_datetime >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND m.start_datetime <= ?';
        params.push(dateTo);
      }

      const query = `
        SELECT
          COUNT(*) as total_meetings,
          COUNT(CASE WHEN ma.attendance_status = 'Present' THEN 1 END) as present_count,
          COUNT(CASE WHEN ma.attendance_status = 'Absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN ma.attendance_status = 'Excused' THEN 1 END) as excused_count,
          COUNT(CASE WHEN ma.attendance_status = 'Late' THEN 1 END) as late_count,
          ROUND((COUNT(CASE WHEN ma.attendance_status = 'Present' THEN 1 END) / COUNT(*)) * 100, 2) as attendance_rate
        FROM meeting_attendance ma
        LEFT JOIN meetings m ON ma.meeting_id = m.id
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get member attendance statistics', error);
    }
  }
}
