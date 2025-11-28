import { Router, Request, Response, NextFunction } from 'express';
import { MeetingModel, CreateMeetingData, UpdateMeetingData, MeetingFilters, CreateAttendanceData, UpdateAttendanceData } from '../models/meetings';
import { NotificationModel } from '../models/notifications';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
// import { logAudit } from '../middleware/auditLogger';
// import { AuditAction, EntityType } from '../models/auditLogs';
import { MeetingInvitationService } from '../services/meetingInvitationService';
import { MeetingStatusService } from '../services/meetingStatusService';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createMeetingSchema = Joi.object({
  title: Joi.string().max(255).required(),
  description: Joi.string().max(2000).optional(),
  hierarchy_level: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').required(),
  entity_id: Joi.number().integer().positive().required(),
  meeting_type: Joi.string().valid('Regular', 'Special', 'Emergency', 'Annual').required(),
  start_datetime: Joi.date().iso().required(),
  end_datetime: Joi.date().iso().greater(Joi.ref('start_datetime')).required(),
  location: Joi.string().max(255).optional(),
  virtual_meeting_link: Joi.string().uri().max(500).optional(),
  max_attendees: Joi.number().integer().positive().optional()
});

const updateMeetingSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).optional(),
  start_datetime: Joi.date().iso().optional(),
  end_datetime: Joi.date().iso().optional(),
  location: Joi.string().max(255).optional(),
  virtual_meeting_link: Joi.string().uri().max(500).optional(),
  meeting_status: Joi.string().valid('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed').optional(),
  max_attendees: Joi.number().integer().positive().optional()
});

const recordAttendanceSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
  attendance_status: Joi.string().valid('Present', 'Absent', 'Excused', 'Late').required(),
  check_in_time: Joi.date().iso().optional(),
  check_out_time: Joi.date().iso().optional(),
  attendance_notes: Joi.string().max(1000).optional()
});

const bulkAttendanceSchema = Joi.object({
  attendance_records: Joi.array().items(recordAttendanceSchema).min(1).max(200).required()
});

// Create new meeting
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createMeetingSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Create meeting data matching the database schema
    const startDateTimeStr = typeof value.start_datetime === 'string'
      ? value.start_datetime
      : new Date(value.start_datetime).toISOString();

    const endDateTimeStr = value.end_datetime
      ? (typeof value.end_datetime === 'string'
        ? value.end_datetime
        : new Date(value.end_datetime).toISOString())
      : undefined;

    const meetingData: CreateMeetingData = {
      title: value.title, // Updated to use 'title' instead of 'meeting_title'
      description: value.description,
      hierarchy_level: value.hierarchy_level,
      entity_id: value.entity_id,
      meeting_type_id: value.meeting_type,
      meeting_date: startDateTimeStr.split('T')[0],
      meeting_time: startDateTimeStr.split('T')[1]?.substring(0, 5) || '09:00', // Only HH:MM format
      end_time: endDateTimeStr ? endDateTimeStr.split('T')[1]?.substring(0, 5) : undefined, // Only HH:MM format
      location: value.location,
      virtual_meeting_link: value.virtual_meeting_link,
      created_by: 1 // Default admin user for development
    };

    const meetingId = await MeetingModel.createMeeting(meetingData);
    const meeting = await MeetingModel.getMeetingById(meetingId);

    // Auto-invite provincial leadership for PCT meetings in Gauteng
    try {
      if (MeetingInvitationService.shouldAutoInviteProvincialLeadership(
        value.title,
        value.hierarchy_level,
        value.entity_id
      )) {
        console.log(`🎯 Auto-inviting provincial leadership for PCT meeting: ${value.title}`);
        const invitationResult = await MeetingInvitationService.inviteProvincialLeadership(
          meetingId,
          value.entity_id,
          1 // Default admin user
        );
        console.log(`✅ Auto-invited ${invitationResult.invitedCount} provincial leaders`);
      }
    } catch (invitationError) {
      console.error('⚠️ Failed to auto-invite provincial leadership:', invitationError);
      // Don't fail the meeting creation if invitations fail
    }

    // Log the meeting creation (skip for development without auth)
    // await logAudit(
    //   1,
    //   AuditAction.CREATE,
    //   EntityType.SYSTEM,
    //   meetingId,
    //   undefined,
    //   { title: value.title, start_datetime: value.start_datetime },
    //   req
    // );

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: {
        meeting
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all meetings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const filters: MeetingFilters = {};
    
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.meeting_type_id) filters.meeting_type_id = parseInt(req.query.meeting_type_id as string);
    if (req.query.meeting_status) filters.meeting_status = req.query.meeting_status as string;
    if (req.query.created_by) filters.created_by = parseInt(req.query.created_by as string);
    if (req.query.meeting_date_from) filters.meeting_date_from = req.query.meeting_date_from as string;
    if (req.query.meeting_date_to) filters.meeting_date_to = req.query.meeting_date_to as string;
    if (req.query.search) filters.search = req.query.search as string;

    // Apply hierarchical filtering based on user's access level (skip for development)
    // if (req.user?.admin_level !== 'national' && req.user?.role_name !== 'super_admin') {
    //   if (req.user?.admin_level === 'province' && req.user?.province_code) {
    //     filters.hierarchy_level = 'Province';
    //     // Would need to map province_code to entity_id
    //   }
    //   // Similar logic for other levels
    // }

    const [meetings, totalCount] = await Promise.all([
      MeetingModel.getMeetings(limit, offset, filters),
      MeetingModel.getMeetingCount(filters)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Meetings retrieved successfully',
      data: {
        meetings,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get meeting by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enhanced validation with debugging
    const idParam = req.params.id;
    console.log(`🔍 Meeting ID request: ${idParam} (type: ${typeof idParam})`);

    if (!idParam || idParam === 'undefined' || idParam === 'null') {
      console.log(`❌ Invalid meeting ID parameter: ${idParam}`);
      throw new ValidationError(`Invalid meeting ID parameter: ${idParam}. Please provide a valid numeric meeting ID.`);
    }

    const meetingId = parseInt(idParam);
    if (isNaN(meetingId) || meetingId <= 0) {
      console.log(`❌ Invalid meeting ID after parsing: ${meetingId}`);
      throw new ValidationError(`Invalid meeting ID: ${idParam}. Meeting ID must be a positive integer.`);
    }

    // Update status before fetching (on-demand check)
    await MeetingStatusService.updateMeetingStatus(meetingId);

    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    res.json({
      success: true,
      message: 'Meeting retrieved successfully',
      data: {
        meeting
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update meeting
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enhanced validation with debugging
    const idParam = req.params.id;
    console.log(`🔍 Meeting update request for ID: ${idParam} (type: ${typeof idParam})`);

    if (!idParam || idParam === 'undefined' || idParam === 'null') {
      console.log(`❌ Invalid meeting ID parameter for update: ${idParam}`);
      throw new ValidationError(`Invalid meeting ID parameter: ${idParam}. Please provide a valid numeric meeting ID.`);
    }

    const meetingId = parseInt(idParam);
    if (isNaN(meetingId) || meetingId <= 0) {
      console.log(`❌ Invalid meeting ID after parsing for update: ${meetingId}`);
      throw new ValidationError(`Invalid meeting ID: ${idParam}. Meeting ID must be a positive integer.`);
    }

    const { error, value } = updateMeetingSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if meeting exists
    const existingMeeting = await MeetingModel.getMeetingById(meetingId);
    if (!existingMeeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Validate end_datetime is after start_datetime if both are provided
    if (value.start_datetime && value.end_datetime) {
      if (new Date(value.end_datetime) <= new Date(value.start_datetime)) {
        throw new ValidationError('End datetime must be after start datetime');
      }
    }

    await MeetingModel.updateMeeting(meetingId, value);

    const updatedMeeting = await MeetingModel.getMeetingById(meetingId);

    // Log the meeting update (skip for development without auth)
    // await logAudit(
    //   1,
    //   AuditAction.UPDATE,
    //   EntityType.SYSTEM,
    //   meetingId,
    //   { title: existingMeeting.meeting_title, status: existingMeeting.meeting_status },
    //   { title: value.title, status: value.meeting_status },
    //   req
    // );

    res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: {
        meeting: updatedMeeting
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete meeting
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    // Check if meeting exists
    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    const success = await MeetingModel.deleteMeeting(meetingId);
    if (!success) {
      throw new Error('Failed to delete meeting');
    }

    // Log the meeting deletion (skip for development without auth)
    // await logAudit(
    //   1,
    //   AuditAction.DELETE,
    //   EntityType.SYSTEM,
    //   meetingId,
    //   { title: meeting.meeting_title, meeting_date: meeting.meeting_date },
    //   undefined,
    //   req
    // );

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get upcoming meetings
router.get('/upcoming/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    const filters: MeetingFilters = {};
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.meeting_type_id) filters.meeting_type_id = parseInt(req.query.meeting_type_id as string);

    const upcomingMeetings = await MeetingModel.getUpcomingMeetings(limit, filters);

    res.json({
      success: true,
      message: 'Upcoming meetings retrieved successfully',
      data: {
        meetings: upcomingMeetings,
        count: upcomingMeetings.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get meeting statistics
router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: MeetingFilters = {};
    
    if (req.query.hierarchy_level) filters.hierarchy_level = req.query.hierarchy_level as string;
    if (req.query.entity_id) filters.entity_id = parseInt(req.query.entity_id as string);
    if (req.query.meeting_date_from) filters.meeting_date_from = req.query.meeting_date_from as string;
    if (req.query.meeting_date_to) filters.meeting_date_to = req.query.meeting_date_to as string;

    const statistics = await MeetingModel.getMeetingStatistics(filters);

    res.json({
      success: true,
      message: 'Meeting statistics retrieved successfully',
      data: {
        statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ATTENDANCE ROUTES

// Get meeting attendance
router.get('/:id/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enhanced validation with debugging
    const idParam = req.params.id;
    console.log(`🔍 Meeting attendance request for ID: ${idParam} (type: ${typeof idParam})`);

    if (!idParam || idParam === 'undefined' || idParam === 'null') {
      console.log(`❌ Invalid meeting ID parameter for attendance: ${idParam}`);
      throw new ValidationError(`Invalid meeting ID parameter: ${idParam}. Please provide a valid numeric meeting ID.`);
    }

    const meetingId = parseInt(idParam);
    if (isNaN(meetingId) || meetingId <= 0) {
      console.log(`❌ Invalid meeting ID after parsing for attendance: ${meetingId}`);
      throw new ValidationError(`Invalid meeting ID: ${idParam}. Meeting ID must be a positive integer.`);
    }

    // Check if meeting exists
    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Use the new invitation service for better attendance data
    const attendanceData = await MeetingInvitationService.getMeetingAttendance(meetingId);

    res.json({
      success: true,
      message: 'Meeting attendance retrieved successfully',
      data: {
        meeting: {
          id: meeting.meeting_id,
          title: meeting.meeting_title,
          meeting_date: meeting.meeting_date
        },
        ...attendanceData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Record attendance for a member
router.post('/:id/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const { error, value } = recordAttendanceSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if meeting exists
    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    const attendanceData: CreateAttendanceData = {
      meeting_id: meetingId,
      ...value,
      recorded_by: 1 // Default admin user for development
    };

    const attendanceId = await MeetingModel.recordAttendance(attendanceData);

    // Log the attendance recording (skip for development)
    // await logAudit(
    //   1,
    //   AuditAction.CREATE,
    //   EntityType.SYSTEM,
    //   attendanceId,
    //   undefined,
    //   { meeting_id: meetingId, member_id: value.member_id, status: value.attendance_status },
    //   req
    // );

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        attendance_id: attendanceId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk record attendance
router.post('/:id/attendance/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const { error, value } = bulkAttendanceSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if meeting exists
    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Add meeting_id and recorded_by to each record
    const attendanceRecords: CreateAttendanceData[] = value.attendance_records.map((record: any) => ({
      meeting_id: meetingId,
      ...record,
      recorded_by: 1 // Default admin user for development
    }));

    const result = await MeetingModel.bulkRecordAttendance(attendanceRecords);

    // Log the bulk attendance recording (skip for development)
    // await logAudit(
    //   1,
    //   AuditAction.CREATE,
    //   EntityType.SYSTEM,
    //   meetingId,
    //   undefined,
    //   { bulk_attendance: true, successful: result.successful, failed: result.failed },
    //   req
    // );

    res.json({
      success: true,
      message: `Bulk attendance recorded. ${result.successful} successful, ${result.failed} failed.`,
      data: {
        result
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update attendance record
router.put('/attendance/:attendanceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attendanceId = parseInt(req.params.attendanceId);
    if (isNaN(attendanceId)) {
      throw new ValidationError('Invalid attendance ID');
    }

    const updateData: UpdateAttendanceData = {
      ...req.body,
      recorded_by: 1 // Default admin user for development
    };

    await MeetingModel.updateAttendance(attendanceId, updateData);

    // Log the attendance update (skip for development)
    // await logAudit(
    //   1,
    //   AuditAction.UPDATE,
    //   EntityType.SYSTEM,
    //   attendanceId,
    //   undefined,
    //   updateData,
    //   req
    // );

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's attendance history
router.get('/member/:memberId/attendance-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const attendanceHistory = await MeetingModel.getMemberAttendanceHistory(memberId, limit);

    res.json({
      success: true,
      message: 'Member attendance history retrieved successfully',
      data: {
        member_id: memberId,
        attendance_history: attendanceHistory
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's attendance statistics
router.get('/member/:memberId/attendance-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      throw new ValidationError('Invalid member ID');
    }

    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const stats = await MeetingModel.getMemberAttendanceStats(memberId, dateFrom, dateTo);

    res.json({
      success: true,
      message: 'Member attendance statistics retrieved successfully',
      data: {
        member_id: memberId,
        statistics: stats,
        period: {
          from: dateFrom || 'All time',
          to: dateTo || 'Present'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Meeting Status Management Routes
// ============================================================================

// Postpone meeting
router.patch('/:id/postpone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { new_date, new_time, reason } = req.body;
    const userId = 1; // TODO: Get from auth middleware

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    if (!new_date || !new_time || !reason) {
      throw new ValidationError('New date, time, and reason are required');
    }

    const success = await MeetingStatusService.postponeMeeting(
      meetingId,
      new_date,
      new_time,
      reason,
      userId
    );

    if (!success) {
      throw new Error('Failed to postpone meeting');
    }

    res.json({
      success: true,
      message: 'Meeting postponed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Cancel meeting
router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    const { reason } = req.body;
    const userId = 1; // TODO: Get from auth middleware

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    if (!reason) {
      throw new ValidationError('Cancellation reason is required');
    }

    const success = await MeetingStatusService.cancelMeeting(meetingId, reason, userId);

    if (!success) {
      throw new Error('Failed to cancel meeting');
    }

    res.json({
      success: true,
      message: 'Meeting cancelled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Reschedule postponed meeting
router.patch('/:id/reschedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);
    const userId = 1; // TODO: Get from auth middleware

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const success = await MeetingStatusService.rescheduleMeeting(meetingId, userId);

    if (!success) {
      throw new Error('Failed to reschedule meeting');
    }

    res.json({
      success: true,
      message: 'Meeting rescheduled successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get status history
router.get('/:id/status-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.id);

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const history = await MeetingStatusService.getStatusHistory(meetingId);

    res.json({
      success: true,
      message: 'Status history retrieved successfully',
      data: { history },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Batch update meeting statuses (admin/system endpoint)
router.post('/batch-update-statuses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await MeetingStatusService.batchUpdateMeetingStatuses();

    res.json({
      success: true,
      message: 'Batch status update completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
