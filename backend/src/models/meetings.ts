import { executeQuery, executeQuerySingle, executeTransaction } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Enhanced Meeting interfaces for hierarchical system
export interface MeetingType {
  type_id: number;
  type_name: string;
  type_code: string;
  description?: string;
  hierarchy_level: 'National' | 'Provincial' | 'Province' | 'Regional' | 'Region' | 'Municipal' | 'Municipality' | 'Ward' | 'Branch';
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
  hierarchy_level: 'National' | 'Provincial' | 'Province' | 'Regional' | 'Region' | 'Municipal' | 'Municipality' | 'Ward' | 'Branch';
  entity_id?: number;
  entity_type?: 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward' | 'Branch';
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
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
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
  hierarchy_level: 'National' | 'Provincial' | 'Province' | 'Regional' | 'Region' | 'Municipal' | 'Municipality' | 'Ward' | 'Branch' | string;
  entity_id?: number;
  entity_type?: 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward' | 'Branch' | string;
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
  meeting_type_id?: number;
  hierarchy_level?: string;
  entity_id?: number;
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
  member_name?: string;
  member_email?: string;
  member_phone?: string;
  membership_number?: string;
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
      // Format date properly - handle Date instances (from Joi.date()) and ISO strings
      let dateStr: string;
      const rawDate: any = meetingData.meeting_date;
      if (rawDate instanceof Date) {
        dateStr = rawDate.toISOString().split('T')[0];
      } else {
        dateStr = String(rawDate);
        if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
          dateStr = dateStr.split('T')[0];
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            dateStr = parsed.toISOString().split('T')[0];
          }
        }
      }
      const timeStr = String(meetingData.meeting_time);
      const endTimeStr = meetingData.end_time ? String(meetingData.end_time) : null;

      const query = `
        INSERT INTO meetings (
          meeting_title, meeting_type_id, hierarchy_level, entity_id,
          meeting_date, meeting_time, end_time, duration_minutes,
          location, virtual_meeting_link, meeting_platform, meeting_status,
          description, objectives, quorum_required, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING meeting_id
      `;

      const params = [
        meetingData.title,
        meetingData.meeting_type_id,
        meetingData.hierarchy_level,
        meetingData.entity_id || 1,
        dateStr,
        timeStr,
        endTimeStr,
        meetingData.duration_minutes || 120,
        meetingData.location || null,
        meetingData.virtual_meeting_link || null,
        meetingData.meeting_platform || 'In-Person',
        'Scheduled',
        meetingData.description || null,
        meetingData.objectives || null,
        meetingData.quorum_required || 0,
        meetingData.created_by || 8571
      ];

      const result = await executeQuery(query, params);
      return result[0].meeting_id;
    } catch (error) {
      throw createDatabaseError('Failed to create meeting', error);
    }
  }

  // Create invitation record
  static async createInvitation(invitationData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO meeting_invitations (
          meeting_id, invitee_type, invitee_id, invitee_email,
          invitee_name, invitation_status, response_message, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING invitation_id
      `;

      const params = [
        invitationData.meeting_id,
        invitationData.invitee_type || 'Member',
        invitationData.member_id || invitationData.invitee_id || null,
        invitationData.invitee_email || invitationData.member_email || null,
        invitationData.invitee_name || invitationData.member_name || invitationData.role_in_meeting || null,
        invitationData.invitation_status || 'Sent',
        invitationData.response_message || null,
        invitationData.created_by || 8571
      ];

      const result = await executeQuery(query, params);
      return result[0]?.invitation_id;
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
        WHERE meeting_id = ? AND invitee_id = ?
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
      const resolvedName = updateData.invitee_name ?? updateData.member_name;
      if (resolvedName !== undefined) {
        fields.push('invitee_name = ?');
        params.push(resolvedName);
      } else if (updateData.role_in_meeting !== undefined) {
        fields.push('invitee_name = ?');
        params.push(updateData.role_in_meeting);
      }
      const resolvedEmail = updateData.invitee_email ?? updateData.member_email;
      if (resolvedEmail !== undefined) {
        fields.push('invitee_email = ?');
        params.push(resolvedEmail);
      }
      if (updateData.response_message !== undefined) {
        fields.push('response_message = ?');
        params.push(updateData.response_message);
      }

      if (fields.length === 0) return;

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(invitationId);

      const query = `UPDATE meeting_invitations SET ${fields.join(', ')} WHERE invitation_id = ?`;
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

  // Normalize meeting row to include both DB fields and UI compatibility fields
  private static normalizeMeetingRow(row: any): MeetingDetails {
    if (!row) return row;

    let dateStr = '';
    if (typeof row.meeting_date_str === 'string' && row.meeting_date_str) {
      dateStr = row.meeting_date_str.split('T')[0];
    } else if (row.meeting_date instanceof Date) {
      const y = row.meeting_date.getFullYear();
      const m = String(row.meeting_date.getMonth() + 1).padStart(2, '0');
      const d = String(row.meeting_date.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    } else if (row.meeting_date) {
      dateStr = String(row.meeting_date).split('T')[0];
    }

    const rawStartTime = row.meeting_time ? String(row.meeting_time) : '00:00:00';
    const startTimeFull = rawStartTime.length === 5 ? `${rawStartTime}:00` : rawStartTime;

    let endTimeFull = '';
    if (row.end_time) {
      const rawEnd = String(row.end_time);
      endTimeFull = rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd;
    } else if (dateStr && rawStartTime) {
      const durationMins = Number(row.duration_minutes) || 60;
      const [h, m, s = 0] = startTimeFull.split(':').map(Number);
      const startObj = new Date(2000, 0, 1, h || 0, m || 0, s || 0);
      const endObj = new Date(startObj.getTime() + durationMins * 60000);
      const eh = String(endObj.getHours()).padStart(2, '0');
      const em = String(endObj.getMinutes()).padStart(2, '0');
      const es = String(endObj.getSeconds()).padStart(2, '0');
      endTimeFull = `${eh}:${em}:${es}`;
    }

    const startDatetime = row.start_datetime || (dateStr ? `${dateStr}T${startTimeFull}` : null);
    const endDatetime = row.end_datetime || (dateStr && endTimeFull ? `${dateStr}T${endTimeFull}` : startDatetime);

    return {
      ...row,
      id: row.id ?? row.meeting_id,
      meeting_id: row.meeting_id ?? row.id,
      title: row.title || row.meeting_title,
      meeting_title: row.meeting_title || row.title,
      meeting_date: dateStr || row.meeting_date,
      meeting_time: row.meeting_time,
      end_time: row.end_time || (endTimeFull ? endTimeFull.slice(0, 5) : null),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      meeting_type: row.meeting_type || row.type_name || row.meeting_category || 'Regular',
      type_name: row.type_name || row.meeting_type || 'Regular',
      max_attendees: Number(row.max_attendees ?? row.total_invited ?? row.quorum_required ?? 0),
      present_count: Number(row.present_count ?? row.total_attendees ?? 0)
    };
  }

  // Get meeting by ID with details
  static async getMeetingById(id: number): Promise<MeetingDetails | null> {
    try {
      const query = `
        SELECT
          m.*,
          m.meeting_id as id,
          m.meeting_title as title,
          m.meeting_date::text as meeting_date_str,
          mt.type_name,
          mt.type_code,
          mt.meeting_category,
          mt.type_name as meeting_type,
          u.name as creator_name,
          CASE
            WHEN m.hierarchy_level = 'National' THEN 'National'
            WHEN m.hierarchy_level = 'Provincial' OR m.hierarchy_level = 'Province' THEN p.province_name
            WHEN m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional' THEN d.district_name
            WHEN m.hierarchy_level = 'Municipal' OR m.hierarchy_level = 'Municipality' THEN mu.municipality_name
            WHEN m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch' THEN w.ward_name
            ELSE 'Unknown'
          END as entity_name,
          COALESCE(p.province_code, mu.province_code, wm.province_code) as province_code,
          COALESCE(mu.municipality_code, w.municipality_code) as municipality_code,
          w.ward_code as ward_code,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id) as total_invited,
          COALESCE(attendance_stats.attendee_count, 0) as attendee_count,
          COALESCE(attendance_stats.present_count, 0) as present_count,
          COALESCE(attendance_stats.absent_count, 0) as absent_count,
          COALESCE(attendance_stats.excused_count, 0) as excused_count,
          COALESCE(attendance_stats.late_count, 0) as late_count
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN provinces p ON (m.hierarchy_level = 'Province' OR m.hierarchy_level = 'Provincial') AND m.entity_id = p.province_id
        LEFT JOIN districts d ON (m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional') AND m.entity_id = d.district_id
        LEFT JOIN municipalities mu ON (m.hierarchy_level = 'Municipality' OR m.hierarchy_level = 'Municipal') AND m.entity_id = mu.municipality_id
        LEFT JOIN wards w ON (m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch') AND m.entity_id = w.ward_id
        LEFT JOIN municipalities wm ON w.municipality_code = wm.municipality_code
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
        ) attendance_stats ON m.meeting_id = attendance_stats.meeting_id
        WHERE m.meeting_id = $1
      `;

      const row = await executeQuerySingle<MeetingDetails>(query, [id]);
      return row ? this.normalizeMeetingRow(row) : null;
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
          m.meeting_id as id,
          m.meeting_title as title,
          m.meeting_date::text as meeting_date_str,
          mt.type_name,
          mt.type_code,
          mt.meeting_category,
          mt.type_name as meeting_type,
          u.name as creator_name,
          CASE 
            WHEN m.hierarchy_level = 'Province' OR m.hierarchy_level = 'Provincial' THEN p.province_name
            WHEN m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional' THEN d.district_name
            WHEN m.hierarchy_level = 'Municipality' OR m.hierarchy_level = 'Municipal' THEN mu.municipality_name
            WHEN m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch' THEN w.ward_name
            ELSE 'National'
          END as entity_name,
          (SELECT COUNT(*) FROM meeting_invitations mi WHERE mi.meeting_id = m.meeting_id) as total_invited,
          COALESCE(attendance_stats.attendee_count, 0) as attendee_count,
          COALESCE(attendance_stats.present_count, 0) as present_count,
          COALESCE(attendance_stats.absent_count, 0) as absent_count,
          COALESCE(attendance_stats.excused_count, 0) as excused_count,
          COALESCE(attendance_stats.late_count, 0) as late_count
        FROM meetings m
        LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN provinces p ON (m.hierarchy_level = 'Province' OR m.hierarchy_level = 'Provincial') AND m.entity_id = p.province_id
        LEFT JOIN districts d ON (m.hierarchy_level = 'Region' OR m.hierarchy_level = 'Regional') AND m.entity_id = d.district_id
        LEFT JOIN municipalities mu ON (m.hierarchy_level = 'Municipality' OR m.hierarchy_level = 'Municipal') AND m.entity_id = mu.municipality_id
        LEFT JOIN wards w ON (m.hierarchy_level = 'Ward' OR m.hierarchy_level = 'Branch') AND m.entity_id = w.ward_id
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
        ) attendance_stats ON m.meeting_id = attendance_stats.meeting_id
        ${whereClause}
        ORDER BY m.meeting_date DESC, m.meeting_time DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const rows = await executeQuery<MeetingDetails>(query, params);
      return rows.map(row => this.normalizeMeetingRow(row));
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
      const validColumns = new Set([
        'meeting_title',
        'meeting_type_id',
        'hierarchy_level',
        'entity_id',
        'meeting_date',
        'meeting_time',
        'end_time',
        'duration_minutes',
        'location',
        'virtual_meeting_link',
        'meeting_platform',
        'meeting_status',
        'description',
        'objectives',
        'quorum_required',
        'quorum_achieved',
        'total_attendees',
        'meeting_chair_id',
        'meeting_secretary_id',
      ]);
      const fields: string[] = [];
      const params: any[] = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && validColumns.has(key)) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE meetings SET ${fields.join(', ')} WHERE meeting_id = ? RETURNING meeting_id`;
      const result = await executeQuery(query, params);

      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update meeting', error);
    }
  }

  // Delete meeting and all dependent records atomically
  static async deleteMeeting(id: number): Promise<boolean> {
    try {
      const results = await executeTransaction([
        { query: 'UPDATE ward_compliance_audit_log SET last_meeting_id = NULL WHERE last_meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_action_items WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_decisions WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_documents WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_minutes WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_agenda_items WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_invitations WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_attendance WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meeting_status_history WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM ward_meeting_records WHERE meeting_id = $1', params: [id] },
        { query: 'DELETE FROM meetings WHERE meeting_id = $1 RETURNING meeting_id', params: [id] },
      ]);

      const deletedRows = results[results.length - 1];
      return Array.isArray(deletedRows) && deletedRows.length > 0;
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
        LEFT JOIN members_consolidated m ON ma.member_id = m.member_id
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
          m.meeting_title,
          m.meeting_date,
          m.meeting_time,
          m.end_time,
          m.meeting_type_id,
          m.hierarchy_level,
          recorder.name as recorder_name
        FROM meeting_attendance ma
        LEFT JOIN meetings m ON ma.meeting_id = m.meeting_id
        LEFT JOIN users recorder ON ma.recorded_by = recorder.id
        WHERE ma.member_id = ?
        ORDER BY m.meeting_date DESC, m.meeting_time DESC
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
        whereClause += ' AND m.meeting_date >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND m.meeting_date <= ?';
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
        LEFT JOIN meetings m ON ma.meeting_id = m.meeting_id
        ${whereClause}
      `;

      return await executeQuerySingle(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get member attendance statistics', error);
    }
  }
}
