import { executeQuery, executeQuerySingle } from '../config/database';
import { MeetingModel } from '../models/meetings';
import { DatabaseError } from '../middleware/errorHandler';

export class MeetingStatusService {
  /**
   * Update meeting status based on current date/time
   */
  static async updateMeetingStatus(meetingId: number): Promise<boolean> {
    try {
      const meeting = await MeetingModel.getMeetingById(meetingId);
      if (!meeting) {
        return false;
      }
      
      // Don't update if already completed or cancelled
      if (['Completed', 'Cancelled'].includes(meeting.meeting_status)) {
        return false;
      }
      
      const now = new Date();
      const meetingDateTime = new Date(`${meeting.meeting_date} ${meeting.meeting_time}`);
      
      // Calculate end time
      let endDateTime: Date;
      if (meeting.end_time) {
        endDateTime = new Date(`${meeting.meeting_date} ${meeting.end_time}`);
      } else {
        // Use duration_minutes if end_time not specified
        const durationMs = (meeting.duration_minutes || 120) * 60 * 1000;
        endDateTime = new Date(meetingDateTime.getTime() + durationMs);
      }
      
      let newStatus = meeting.meeting_status;
      
      // Determine new status
      if (now >= endDateTime) {
        newStatus = 'Completed';
      } else if (now >= meetingDateTime && now < endDateTime) {
        newStatus = 'In Progress';
      }
      
      // Update if status changed
      if (newStatus !== meeting.meeting_status) {
        await MeetingModel.updateMeeting(meetingId, {
          meeting_status: newStatus as any
        });
        
        // Log status change
        await this.logStatusChange(
          meetingId,
          meeting.meeting_status,
          newStatus,
          'Automatic status update based on meeting time',
          1, // System user
          null
        );
        
        console.log(`✅ Meeting ${meetingId} status updated: ${meeting.meeting_status} → ${newStatus}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to update status for meeting ${meetingId}:`, error);
      return false;
    }
  }
  
  /**
   * Batch update all meeting statuses
   */
  static async batchUpdateMeetingStatuses(): Promise<{ updated: number; errors: number }> {
    try {
      // Get meetings that might need status updates
      const query = `
        SELECT meeting_id 
        FROM meetings 
        WHERE meeting_status IN ('Scheduled', 'In Progress')
        AND deleted_at IS NULL
        AND meeting_date <= CURRENT_DATE + INTERVAL '1 day'
      `;
      
      const meetings = await executeQuery<{ meeting_id: number }>(query);
      
      let updated = 0;
      let errors = 0;
      
      for (const meeting of meetings) {
        try {
          const wasUpdated = await this.updateMeetingStatus(meeting.meeting_id);
          if (wasUpdated) updated++;
        } catch (error) {
          errors++;
          console.error(`Error updating meeting ${meeting.meeting_id}:`, error);
        }
      }
      
      if (updated > 0 || errors > 0) {
        console.log(`📊 Meeting status batch update: ${updated} updated, ${errors} errors`);
      }
      
      return { updated, errors };
    } catch (error) {
      console.error('❌ Failed to batch update meeting statuses:', error);
      return { updated: 0, errors: 0 };
    }
  }
  
  /**
   * Log status change to history table
   */
  static async logStatusChange(
    meetingId: number,
    oldStatus: string,
    newStatus: string,
    reason: string,
    userId: number,
    metadata?: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO meeting_status_history 
          (meeting_id, old_status, new_status, reason, changed_by, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await executeQuery(query, [
        meetingId,
        oldStatus,
        newStatus,
        reason,
        userId,
        metadata ? JSON.stringify(metadata) : null
      ]);
    } catch (error) {
      console.error('Failed to log status change:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }
  
  /**
   * Get status history for a meeting
   */
  static async getStatusHistory(meetingId: number): Promise<any[]> {
    try {
      const query = `
        SELECT 
          msh.*,
          u.name as changed_by_name
        FROM meeting_status_history msh
        LEFT JOIN users u ON msh.changed_by = u.id
        WHERE msh.meeting_id = $1
        ORDER BY msh.changed_at DESC
      `;
      
      return await executeQuery(query, [meetingId]);
    } catch (error) {
      throw new DatabaseError('Failed to get status history');
    }
  }
  
  /**
   * Postpone a meeting
   */
  static async postponeMeeting(
    meetingId: number,
    newDate: string,
    newTime: string,
    reason: string,
    userId: number
  ): Promise<boolean> {
    try {
      // Get current meeting details
      const meeting = await MeetingModel.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      // Don't allow postponing completed or cancelled meetings
      if (['Completed', 'Cancelled'].includes(meeting.meeting_status)) {
        throw new Error(`Cannot postpone a ${meeting.meeting_status.toLowerCase()} meeting`);
      }
      
      // Store original date/time if not already postponed
      const originalDate = (meeting as any).original_meeting_date || meeting.meeting_date;
      const originalTime = (meeting as any).original_meeting_time || meeting.meeting_time;
      
      // Update meeting
      const query = `
        UPDATE meetings 
        SET 
          meeting_status = 'Postponed',
          meeting_date = $1,
          meeting_time = $2,
          original_meeting_date = $3,
          original_meeting_time = $4,
          postponement_reason = $5,
          postponed_by = $6,
          postponed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE meeting_id = $7
      `;
      
      const result = await executeQuery(query, [
        newDate,
        newTime,
        originalDate,
        originalTime,
        reason,
        userId,
        meetingId
      ]);
      
      // Log status change
      await this.logStatusChange(
        meetingId,
        meeting.meeting_status,
        'Postponed',
        reason,
        userId,
        {
          original_date: originalDate,
          original_time: originalTime,
          new_date: newDate,
          new_time: newTime
        }
      );
      
      console.log(`✅ Meeting ${meetingId} postponed from ${originalDate} ${originalTime} to ${newDate} ${newTime}`);
      
      return (result as any).rowCount > 0;
    } catch (error) {
      throw new DatabaseError('Failed to postpone meeting');
    }
  }
  
  /**
   * Cancel a meeting
   */
  static async cancelMeeting(
    meetingId: number,
    reason: string,
    userId: number
  ): Promise<boolean> {
    try {
      const meeting = await MeetingModel.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      // Don't allow cancelling already completed meetings
      if (meeting.meeting_status === 'Completed') {
        throw new Error('Cannot cancel a completed meeting');
      }
      
      const query = `
        UPDATE meetings 
        SET 
          meeting_status = 'Cancelled',
          cancellation_reason = $1,
          cancelled_by = $2,
          cancelled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE meeting_id = $3
      `;
      
      const result = await executeQuery(query, [reason, userId, meetingId]);
      
      // Log status change
      await this.logStatusChange(
        meetingId,
        meeting.meeting_status,
        'Cancelled',
        reason,
        userId,
        null
      );
      
      console.log(`✅ Meeting ${meetingId} cancelled: ${reason}`);
      
      return (result as any).rowCount > 0;
    } catch (error) {
      throw new DatabaseError('Failed to cancel meeting');
    }
  }
  
  /**
   * Reschedule a postponed meeting back to scheduled
   */
  static async rescheduleMeeting(
    meetingId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const meeting = await MeetingModel.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      if (meeting.meeting_status !== 'Postponed') {
        throw new Error('Only postponed meetings can be rescheduled');
      }
      
      const query = `
        UPDATE meetings 
        SET 
          meeting_status = 'Scheduled',
          updated_at = CURRENT_TIMESTAMP
        WHERE meeting_id = $1
      `;
      
      const result = await executeQuery(query, [meetingId]);
      
      // Log status change
      await this.logStatusChange(
        meetingId,
        'Postponed',
        'Scheduled',
        'Meeting rescheduled',
        userId,
        null
      );
      
      console.log(`✅ Meeting ${meetingId} rescheduled to Scheduled status`);
      
      return (result as any).rowCount > 0;
    } catch (error) {
      throw new DatabaseError('Failed to reschedule meeting');
    }
  }
}

