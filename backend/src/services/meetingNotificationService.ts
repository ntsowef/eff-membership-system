import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

/**
 * Meeting Notification Service
 * Handles sending notifications for meeting invitations, reminders, and updates
 */
export class MeetingNotificationService {
  
  /**
   * Send meeting invitations to attendees
   */
  static async sendMeetingInvitations(meetingId: number): Promise<{
    sent: number;
    failed: number;
    details: any[];
  }> {
    try {
      // Get meeting details
      const meeting = await executeQuerySingle(`
        SELECT 
          m.*,
          mt.type_name,
          mt.type_code
        FROM meetings m
        JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        WHERE m.meeting_id = ? `, [meetingId]);

      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Get all attendees who haven't been sent invitations yet
      const attendees = await executeQuery(`
        SELECT 
          ma.*,
          mem.first_name,
          mem.last_name,
          mem.email,
          mem.phone_number,
          mem.membership_number
        FROM meeting_attendance ma
        JOIN members mem ON ma.member_id = mem.member_id
        WHERE ma.meeting_id = $1 
          AND ma.invitation_status = 'Not Sent'
          AND mem.membership_status = 'Active'
      `, [meetingId]);

      const results = {
        sent : 0,
        failed: 0,
        details: [] as any[]
      };

      // Send invitations to each attendee
      for (const attendee of attendees) {
        try {
          const invitationResult = await this.sendIndividualInvitation(meeting, attendee);
          
          if (invitationResult.success) {
            // Update invitation status
            await executeQuery(`
              UPDATE meeting_attendance 
              SET invitation_status = 'Sent', invitation_sent_at = CURRENT_TIMESTAMP
              WHERE attendance_id = ? `, [attendee.attendance_id]);

            // Log the invitation
            await this.logInvitation(meetingId, attendee.member_id, 'Initial', 'System', 'Sent');

            results.sent++;
            results.details.push({
              member_id : attendee.member_id,
              member_name: '${attendee.first_name} ' + attendee.last_name + '',
              status: 'sent',
              method: invitationResult.method
            });
          } else {
            // Update invitation status to failed
            await executeQuery(`
              UPDATE meeting_attendance 
              SET invitation_status = 'Failed'
        WHERE attendance_id = ? `, [attendee.attendance_id]);

            // Log the failed invitation
            await this.logInvitation(meetingId, attendee.member_id, 'Initial', 'System', 'Failed', invitationResult.error);

            results.failed++;
            results.details.push({
              member_id : attendee.member_id,
              member_name: '${attendee.first_name} ' + attendee.last_name + '',
              status: 'failed',
              error: invitationResult.error
            });
          }
        } catch (error) {
          console.error('Failed to send invitation to member ' + attendee.member_id + ':', error);
          results.failed++;
          results.details.push({
            member_id: attendee.member_id,
            member_name: '${attendee.first_name} ' + attendee.last_name + '',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      throw createDatabaseError('Failed to send meeting invitations', error);
    }
  }

  /**
   * Send individual invitation to a member
   */
  private static async sendIndividualInvitation(meeting: any, attendee: any): Promise<{
    success: boolean;
    method?: string;
    error?: string;
  }> {
    try {
      // Prepare invitation content
      const invitationContent = this.generateInvitationContent(meeting, attendee);

      // Try email first if available
      if (attendee.email) {
        const emailResult = await this.sendEmailInvitation(attendee.email, invitationContent);
        if (emailResult.success) {
          return { success: true, method: 'email' };
        }
      }

      // Try SMS if email failed and phone is available
      if (attendee.phone_number) {
        const smsResult = await this.sendSMSInvitation(attendee.phone_number, invitationContent);
        if (smsResult.success) {
          return { success: true, method: 'sms' };
        }
      }

      return { 
        success: false, 
        error: 'No valid contact method available or all methods failed' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate invitation content
   */
  private static generateInvitationContent(meeting: any, attendee: any): {
    subject: string;
    body: string;
    smsText: string;
  } {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    const meetingTime = meeting.meeting_time;
    
    const subject = 'Meeting Invitation: ' + meeting.meeting_title + '';
    
    const body = `
Dear ${attendee.first_name} ${attendee.last_name},

You are invited to attend the following meeting:

Meeting: ${meeting.meeting_title}
Type: ${meeting.type_name}
Date: ${meetingDate}
Time: ${meetingTime}
Duration: ${meeting.duration_minutes} minutes
${meeting.location ? `Location: ${meeting.location}` : ''}
${meeting.virtual_meeting_link ? `Virtual Link: ${meeting.virtual_meeting_link}` : ''}
Platform: ${meeting.meeting_platform}

${meeting.description ? `Description: ${meeting.description}` : ''}
${meeting.objectives ? `Objectives: ${meeting.objectives}` : ''}

Your role in this meeting: ${attendee.role_in_meeting || 'Participant'}
Attendance type: ${attendee.attendance_type}
${attendee.voting_rights ? 'You have voting rights in this meeting.' : ''}

${meeting.quorum_required > 0 ? `This meeting requires a quorum of ${meeting.quorum_required} members.` : ''}

Please confirm your attendance by responding to this invitation.

Best regards,
Meeting Management System
    `.trim();

    const smsText = `Meeting Invitation: ${meeting.meeting_title} on ${meetingDate} at ${meetingTime}. ${meeting.location ? `Location: ${meeting.location}` : 'Virtual meeting'}. Please confirm attendance.`;

    return { subject, body, smsText };
  }

  /**
   * Send email invitation (placeholder - integrate with actual email service)
   */
  private static async sendEmailInvitation(email: string, content: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log('Sending email invitation to: ' + email + '');
      console.log('Subject: ' + content.subject + '');
      console.log('Body: ' + content.body + '');
      
      // Simulate email sending
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email sending failed' 
      };
    }
  }

  /**
   * Send SMS invitation (placeholder - integrate with actual SMS service)
   */
  private static async sendSMSInvitation(phoneNumber: string, content: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      console.log('Sending SMS invitation to: ' + phoneNumber + '');
      console.log('Message: ' + content.smsText + '');
      
      // Simulate SMS sending
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS sending failed' 
      };
    }
  }

  /**
   * Log invitation attempt
   */
  private static async logInvitation(
    meetingId: number,
    memberId: number,
    invitationType: string,
    invitationMethod: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO meeting_invitation_log (
          meeting_id, member_id, invitation_type, invitation_method, 
          invitation_status, sent_at, error_message
        ) EXCLUDED.?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?
      `, [meetingId, memberId, invitationType, invitationMethod, status, errorMessage || null]);
    } catch (error) {
      console.error('Failed to log invitation:', error);
    }
  }

  /**
   * Send meeting reminders
   */
  static async sendMeetingReminders(meetingId: number): Promise<{
    sent: number;
    failed: number;
  }> {
    try {
      // Get meeting details
      const meeting = await executeQuerySingle(`
        SELECT 
          m.*,
          mt.type_name
        FROM meetings m
        JOIN meeting_types mt ON m.meeting_type_id = mt.type_id
        WHERE m.meeting_id = ? AND m.meeting_status = 'Scheduled'
      `, [meetingId]);

      if (!meeting) {
        throw new Error('Meeting not found or not scheduled');
      }

      // Get attendees who were invited but haven't responded or confirmed
      const attendees = await executeQuery(`
        SELECT 
          ma.*,
          mem.first_name,
          mem.last_name,
          mem.email,
          mem.phone_number
        FROM meeting_attendance ma
        JOIN members mem ON ma.member_id = mem.member_id
        WHERE ma.meeting_id = $1 
          AND ma.invitation_status = 'Sent'
          AND ma.attendance_status IN ('Invited', 'Confirmed')
          AND mem.membership_status = 'Active'
      `, [meetingId]);

      let sent = 0;
      let failed = 0;

      for (const attendee of attendees) {
        try {
          const reminderContent = this.generateReminderContent(meeting, attendee);
          const result = await this.sendIndividualInvitation(meeting, {
            ...attendee,
            email : attendee.email,
            phone_number: attendee.phone_number
          });

          if (result.success) {
            await this.logInvitation(meetingId, attendee.member_id, 'Reminder', 'System', 'Sent');
            sent++;
          } else {
            await this.logInvitation(meetingId, attendee.member_id, 'Reminder', 'System', 'Failed', result.error);
            failed++;
          }
        } catch (error) {
          console.error('Failed to send reminder to member ' + attendee.member_id + ':', error);
          failed++;
        }
      }

      // Update meeting reminder sent timestamp
      await executeQuery(`
        UPDATE meetings 
        SET reminder_sent_at = CURRENT_TIMESTAMP 
        WHERE meeting_id = ? `, [meetingId]);

      return { sent, failed };
    } catch (error) {
      throw createDatabaseError('Failed to send meeting reminders', error);
    }
  }

  /**
   * Generate reminder content
   */
  private static generateReminderContent(meeting : any, attendee: any): {
    subject: string;
    body: string;
    smsText: string;
  } {
    const meetingDate = new Date(meeting.meeting_date).toLocaleDateString();
    const meetingTime = meeting.meeting_time;
    
    const subject = 'Meeting Reminder: ' + meeting.meeting_title + '';
    
    const body = `
Dear ${attendee.first_name} ${attendee.last_name},

This is a reminder about the upcoming meeting:

Meeting: ${meeting.meeting_title}
Date: ${meetingDate}
Time: ${meetingTime}
${meeting.location ? `Location: ${meeting.location}` : ''}
${meeting.virtual_meeting_link ? `Virtual Link: ${meeting.virtual_meeting_link}` : ''}

Please confirm your attendance if you haven't already done so.

Best regards,
Meeting Management System
    `.trim();

    const smsText = `Reminder: ${meeting.meeting_title} meeting on ${meetingDate} at ${meetingTime}. Please confirm attendance.`;

    return { subject, body, smsText };
  }

  /**
   * Get invitation statistics for a meeting
   */
  static async getInvitationStatistics(meetingId: number): Promise<any> {
    try {
      const stats = await executeQuerySingle(`
        SELECT 
          COUNT(*) as total_invitations,
          COUNT(CASE WHEN invitation_status = 'Sent' THEN 1 END) as sent,
          COUNT(CASE WHEN invitation_status = 'Delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN invitation_status = 'Failed' THEN 1 END) as failed,
          COUNT(CASE WHEN attendance_status = 'Confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN attendance_status = 'Declined' THEN 1 END) as declined
        FROM meeting_attendance
        WHERE meeting_id = $1
      `, [meetingId]);

      return stats;
    } catch (error) {
      throw createDatabaseError('Failed to get invitation statistics', error);
    }
  }
}
