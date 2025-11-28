import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface MeetingInvitationData {
  meeting_id: number;
  member_id: number;
  invitation_status: 'Present' | 'Absent' | 'Excused' | 'Late'; // Match actual database enum values
  invited_by: number;
  invitation_notes?: string;
}

export interface ProvincialLeader {
  member_id: number;
  position_name: string;
  position_code: string;
  member_name: string;
  email?: string;
  phone?: string;
}

export class MeetingInvitationService {
  
  /**
   * Automatically invite provincial leadership for PCT meetings in Gauteng
   */
  static async inviteProvincialLeadership(
    meetingId: number, 
    provinceId: number, 
    invitedBy: number = 1
  ): Promise<{ success: boolean; invitedCount: number; leaders: ProvincialLeader[] }> {
    try {
      console.log(`🎯 Auto-inviting provincial leadership for meeting ${meetingId} in province ${provinceId}`);
      
      // Get active provincial leadership for the specified province
      const leaders = await this.getProvincialLeadership(provinceId);
      
      if (leaders.length === 0) {
        console.log('⚠️ No active provincial leadership found for province', provinceId);
        return { success: true, invitedCount: 0, leaders: [] };
      }
      
      console.log(`📋 Found ${leaders.length} provincial leaders to invite:`, 
        leaders.map(l => `${l.member_name} (${l.position_name})`));
      
      // Create invitations for each leader
      let invitedCount = 0;
      for (const leader of leaders) {
        try {
          await this.createMeetingInvitation({
            meeting_id: meetingId,
            member_id: leader.member_id,
            invitation_status: 'Present', // Using 'Present' as default since table doesn't have 'Pending'
            invited_by: invitedBy,
            invitation_notes: `Auto-invited as ${leader.position_name} for PCT meeting`
          });
          invitedCount++;
          console.log(`✅ Invited ${leader.member_name} (${leader.position_name})`);
        } catch (error) {
          console.error(`❌ Failed to invite ${leader.member_name}:`, error);
        }
      }
      
      console.log(`🎉 Successfully invited ${invitedCount}/${leaders.length} provincial leaders`);
      
      return { success: true, invitedCount, leaders };
      
    } catch (error) {
      console.error('❌ Error in inviteProvincialLeadership:', error);
      throw createDatabaseError('Failed to invite provincial leadership', error);
    }
  }
  
  /**
   * Get active provincial leadership for a specific province
   */
  static async getProvincialLeadership(provinceId: number): Promise<ProvincialLeader[]> {
    try {
      const query = `
        SELECT 
          la.member_id,
          lp.position_name,
          lp.position_code,
          lp.order_index,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          m.email,
          m.cell_number as phone
        FROM leadership_appointments la
        JOIN leadership_positions lp ON la.position_id = lp.id
        JOIN members m ON la.member_id = m.member_id
        WHERE la.hierarchy_level = 'Province'
          AND la.entity_id = ?
          AND la.appointment_status = 'Active'
          AND lp.is_active = 1
        ORDER BY lp.order_index ASC, lp.position_name ASC
      `;
      
      const results = await executeQuery(query, [provinceId]);
      return results as ProvincialLeader[];
      
    } catch (error) {
      throw createDatabaseError('Failed to get provincial leadership', error);
    }
  }
  
  /**
   * Create a meeting invitation/attendance record
   */
  static async createMeetingInvitation(invitationData: MeetingInvitationData): Promise<number> {
    try {
      // Check if invitation already exists
      const existingQuery = `
        SELECT id FROM meeting_attendance 
        WHERE meeting_id = ? AND member_id = ?
      `;
      const existing = await executeQuery(existingQuery, [
        invitationData.meeting_id, 
        invitationData.member_id
      ]);
      
      if (existing.length > 0) {
        console.log(`⚠️ Invitation already exists for member ${invitationData.member_id} in meeting ${invitationData.meeting_id}`);
        return existing[0].id;
      }
      
      // Create new invitation (using existing table structure)
      const insertQuery = `
        INSERT INTO meeting_attendance (
          meeting_id,
          member_id,
          attendance_status,
          attendance_notes,
          recorded_by
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(insertQuery, [
        invitationData.meeting_id,
        invitationData.member_id,
        invitationData.invitation_status,
        invitationData.invitation_notes,
        invitationData.invited_by
      ]);
      
      return result.insertId;
      
    } catch (error) {
      throw createDatabaseError('Failed to create meeting invitation', error);
    }
  }
  
  /**
   * Check if a meeting qualifies for automatic provincial invitations
   */
  static shouldAutoInviteProvincialLeadership(
    meetingTitle: string, 
    hierarchyLevel: string, 
    entityId: number
  ): boolean {
    // Check if it's a PCT meeting for Gauteng province
    const isPCTMeeting = meetingTitle.toLowerCase().includes('pct') || 
                        meetingTitle.toLowerCase().includes('provincial coordinating team') ||
                        meetingTitle.toLowerCase().includes('provincial coordination');
    
    const isProvincialLevel = hierarchyLevel === 'Province';
    const isGauteng = entityId === 7; // Gauteng province ID
    
    const shouldInvite = isPCTMeeting && isProvincialLevel && isGauteng;
    
    console.log(`🤔 Auto-invite check: PCT=${isPCTMeeting}, Provincial=${isProvincialLevel}, Gauteng=${isGauteng} => ${shouldInvite}`);
    
    return shouldInvite;
  }
  
  /**
   * Get meeting invitations/attendance for a specific meeting
   */
  static async getMeetingAttendance(meetingId: number) {
    try {
      const query = `
        SELECT
          ma.*,
          CONCAT(m.firstname, ' ', m.surname) as member_name,
          CONCAT('MEM', LPAD(m.member_id, 6, '0')) as member_number,
          m.email,
          m.cell_number as phone,
          CONCAT(recorder.firstname, ' ', recorder.surname) as recorded_by_name
        FROM meeting_attendance ma
        JOIN members m ON ma.member_id = m.member_id
        LEFT JOIN members recorder ON ma.recorded_by = recorder.member_id
        WHERE ma.meeting_id = ?
        ORDER BY ma.created_at ASC
      `;
      
      const attendance = await executeQuery(query, [meetingId]);
      
      // Calculate summary
      const summary = {
        total_attendees: attendance.length,
        present: attendance.filter((a: any) => a.attendance_status === 'Present').length,
        absent: attendance.filter((a: any) => a.attendance_status === 'Absent').length,
        excused: attendance.filter((a: any) => a.attendance_status === 'Excused').length,
        late: attendance.filter((a: any) => a.attendance_status === 'Late').length,
        pending: 0 // No pending status in current table schema
      };
      
      return { attendance, summary };
      
    } catch (error) {
      throw createDatabaseError('Failed to get meeting attendance', error);
    }
  }
}
