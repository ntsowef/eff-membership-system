import { Router, Request, Response, NextFunction } from 'express';
import { HierarchicalMeetingService } from '../services/hierarchicalMeetingService';
import { MeetingModel, CreateMeetingData } from '../models/meetings';
import { MeetingNotificationService } from '../services/meetingNotificationService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();
import { executeQuerySingle } from '../config/database';

// Helper: map UI hierarchy to entity_type used in appointments
const mapHierarchyToEntityType = (level: string): 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward' => {
  switch (level) {
    case 'Provincial': return 'Province';
    case 'Municipal': return 'Municipality';
    case 'Regional': return 'Region';
    case 'Ward': return 'Ward';
    case 'National':
    default:
      return 'National';
  }
};

// Helper: resolve numeric entity_id from provided codes
async function resolveEntityIdFromCodes(hierarchyLevel: string, province_code?: string, municipality_code?: string, ward_code?: string): Promise<{entity_id?: number, entity_type?: string}> {
  const entity_type = mapHierarchyToEntityType(hierarchyLevel);
  try {
    if (entity_type === 'Province' && province_code) {
      const row = await executeQuerySingle<any>("SELECT province_id FROM provinces WHERE province_code = ?", [province_code]);
      return { entity_id: row?.province_id, entity_type };
    }
    if (entity_type === 'Municipality' && municipality_code) {
      const row = await executeQuerySingle<any>("SELECT municipality_id FROM municipalities WHERE municipality_code = ?", [municipality_code]);
      return { entity_id: row?.municipality_id, entity_type };
    }
    if (entity_type === 'Ward' && ward_code) {
      const row = await executeQuerySingle<any>("SELECT id FROM wards WHERE ward_code = ?", [ward_code]);
      return { entity_id: row?.id, entity_type };
    }
  } catch (_err) {
    // fallthrough; return empty so upstream can handle no invitations gracefully
  }
  return { entity_id: undefined, entity_type };
}


// Validation schemas
const createHierarchicalMeetingSchema = Joi.object({
  title: Joi.string().max(255).required(),
  meeting_type_id: Joi.number().integer().positive().required(),
  hierarchy_level: Joi.string().valid('National', 'Provincial', 'Regional', 'Municipal', 'Ward').required(),
  entity_id: Joi.number().integer().positive().optional(),
  entity_type: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').optional(),
  // Allow geographic codes for invitation logic (not persisted on meeting)
  province_code: Joi.string().allow('').optional(),
  municipality_code: Joi.string().allow('').optional(),
  ward_code: Joi.string().allow('').optional(),
  meeting_date: Joi.date().iso().required(),
  meeting_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).required(),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).allow('').optional(),
  duration_minutes: Joi.number().integer().positive().optional(),
  location: Joi.string().max(255).allow('').optional(),
  virtual_meeting_link: Joi.string().uri().max(500).allow('').optional(),
  meeting_platform: Joi.string().valid('In-Person', 'Virtual', 'Hybrid').allow('').optional(),
  description: Joi.string().max(2000).allow('').optional(),
  objectives: Joi.string().max(2000).allow('').optional(),
  agenda_summary: Joi.string().max(2000).allow('').optional(),
  quorum_required: Joi.number().integer().min(0).optional(),
  meeting_chair_id: Joi.number().integer().positive().optional(),
  meeting_secretary_id: Joi.number().integer().positive().optional(),
  auto_send_invitations: Joi.boolean().optional()
});

const invitationPreviewSchema = Joi.object({
  meeting_type_id: Joi.number().integer().positive().required(),
  hierarchy_level: Joi.string().valid('National', 'Provincial', 'Regional', 'Municipal', 'Ward').required(),
  entity_id: Joi.number().integer().positive().optional(),
  entity_type: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').optional(),
  province_code: Joi.string().allow('').optional(),
  municipality_code: Joi.string().allow('').optional(),
  ward_code: Joi.string().allow('').optional()
});

/**
 * Get hierarchical meeting types - Updated
 */
router.get('/meeting-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.query.hierarchy_level as string;
    const meetingTypes = await HierarchicalMeetingService.getMeetingTypes(hierarchyLevel);

    res.json({
      success: true,
      message: 'Meeting types retrieved successfully',
      data: {
        meeting_types: meetingTypes,
        total: meetingTypes.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get organizational roles
 */
router.get('/organizational-roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.query.hierarchy_level as string;
    const roles = await HierarchicalMeetingService.getOrganizationalRoles(hierarchyLevel);

    res.json({
      success: true,
      message: 'Organizational roles retrieved successfully',
      data: {
        roles: roles,
        total: roles.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Preview automatic invitations for a meeting type
 */
router.post('/invitation-preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = invitationPreviewSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Resolve entity_id from codes if not provided
    let effectiveEntityId = value.entity_id as number | undefined;
    let effectiveEntityType = value.entity_type as string | undefined;
    if (!effectiveEntityId) {
      const resolved = await resolveEntityIdFromCodes(value.hierarchy_level, value.province_code, value.municipality_code, value.ward_code);
      effectiveEntityId = resolved.entity_id;
      effectiveEntityType = resolved.entity_type;
    }

    const invitationTargets = await HierarchicalMeetingService.generateAutoInvitations({
      meeting_id: 0, // Preview mode
      meeting_type_id: value.meeting_type_id,
      hierarchy_level: value.hierarchy_level,
      entity_id: effectiveEntityId,
      entity_type: effectiveEntityType,
      province_code: value.province_code,
      municipality_code: value.municipality_code,
      ward_code: value.ward_code
    });

    // Get member details for the preview
    const memberIds = invitationTargets.map(target => target.member_id);
    let memberDetails = [];

    if (memberIds.length > 0) {
      const placeholders = memberIds.map(() => '?').join(',');
      const query = `
        SELECT
          m.member_id,
          m.firstname as first_name,
          COALESCE(m.surname, '') as last_name,
          COALESCE(m.email, '') as email,
          COALESCE(m.cell_number, '') as phone_number,
          CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number
        FROM members m
        WHERE m.member_id IN (${placeholders})
        ORDER BY m.surname, m.firstname
      `;

      memberDetails = await MeetingModel.executeQuery(query, memberIds);
    }

    // Combine invitation targets with member details
    const invitationPreview = invitationTargets.map((target: any) => {
      const member: any = memberDetails.find((m: any) => m.member_id === target.member_id);
      return {
        ...target,
        member_name: member ? `${member.first_name} ${member.last_name}`.trim() : 'Unknown',
        member_email: member?.email || '',
        member_phone: member?.phone_number || '',
        membership_number: member?.membership_number || ''
      };
    });

    // Group by attendance type for better organization
    const groupedInvitations = {
      required: invitationPreview.filter(inv => inv.attendance_type === 'Required'),
      optional: invitationPreview.filter(inv => inv.attendance_type === 'Optional'),
      observer: invitationPreview.filter(inv => inv.attendance_type === 'Observer'),
      guest: invitationPreview.filter(inv => inv.attendance_type === 'Guest'),
      delegate: invitationPreview.filter(inv => inv.attendance_type === 'Delegate')
    };

    res.json({
      success: true,
      message: 'Invitation preview generated successfully',
      data: {
        total_invitations: invitationTargets.length,
        grouped_invitations: groupedInvitations,
        summary: {
          required: groupedInvitations.required.length,
          optional: groupedInvitations.optional.length,
          observer: groupedInvitations.observer.length,
          guest: groupedInvitations.guest.length,
          delegate: groupedInvitations.delegate.length,
          total_with_voting_rights: invitationTargets.filter(inv => inv.voting_rights).length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create hierarchical meeting with automatic invitations
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createHierarchicalMeetingSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Validate meeting type exists and is active
    const meetingType = await MeetingModel.getMeetingTypeById(value.meeting_type_id);
    if (!meetingType) {
      throw new ValidationError('Meeting type not found');
    }
    if (!meetingType.is_active) {
      throw new ValidationError('Meeting type is not active and is compulsory');
    }
    if (meetingType.hierarchy_level !== value.hierarchy_level) {
      throw new ValidationError(`Meeting type "${meetingType.type_name}" is not valid for ${value.hierarchy_level} level meetings`);
    }

    // Map hierarchy_level to database values
    // Frontend uses: 'Provincial', 'Municipal', 'Regional'
    // Database expects: 'Province', 'Municipality', 'Region'
    const hierarchyLevelMap: Record<string, string> = {
      'National': 'National',
      'Provincial': 'Province',
      'Regional': 'Region',
      'Municipal': 'Municipality',
      'Ward': 'Ward',
      'Branch': 'Branch'
    };

    const dbHierarchyLevel = hierarchyLevelMap[value.hierarchy_level] || value.hierarchy_level;

    // Create meeting data
    const meetingData: CreateMeetingData = {
      title: value.title, // Fixed: use 'title' instead of 'meeting_title'
      meeting_type_id: value.meeting_type_id,
      hierarchy_level: dbHierarchyLevel,
      entity_id: value.entity_id,
      entity_type: value.entity_type,
      meeting_date: value.meeting_date,
      meeting_time: value.meeting_time,
      end_time: value.end_time,
      duration_minutes: value.duration_minutes || 120,
      location: value.location,
      virtual_meeting_link: value.virtual_meeting_link,
      meeting_platform: value.meeting_platform || 'In-Person',
      description: value.description,
      objectives: value.objectives,
      agenda_summary: value.agenda_summary,
      quorum_required: value.quorum_required || 0,
      meeting_chair_id: value.meeting_chair_id,
      meeting_secretary_id: value.meeting_secretary_id,
      created_by: 1, // TODO: Get from authenticated user
      auto_send_invitations: value.auto_send_invitations || false
    };

    // Create the meeting
    const meetingId = await MeetingModel.createMeeting(meetingData);

    // Generate and send automatic invitations if requested
    let invitationResults: any = null;
    if (value.auto_send_invitations) {
      // Resolve entity_id from codes if not provided
      let effectiveEntityId = value.entity_id as number | undefined;
      let effectiveEntityType = value.entity_type as string | undefined;
      if (!effectiveEntityId) {
        const resolved = await resolveEntityIdFromCodes(value.hierarchy_level, value.province_code, value.municipality_code, value.ward_code);
        effectiveEntityId = resolved.entity_id;
        effectiveEntityType = resolved.entity_type;
      }

      const invitationTargets = await HierarchicalMeetingService.generateAutoInvitations({
        meeting_id: meetingId,
        meeting_type_id: value.meeting_type_id,
        hierarchy_level: value.hierarchy_level,
        entity_id: effectiveEntityId,
        entity_type: effectiveEntityType,
        province_code: value.province_code,
        municipality_code: value.municipality_code,
        ward_code: value.ward_code
      });

      // Create invitation records for all invited members
      for (const target of invitationTargets) {
        await MeetingModel.createInvitation({
          meeting_id: meetingId,
          member_id: target.member_id,
          attendance_type: target.attendance_type,
          role_in_meeting: target.role_in_meeting,
          voting_rights: target.voting_rights,
          invitation_priority: target.invitation_priority,
          invitation_method: 'System',
          invitation_status: 'Sent'
        });
      }

      invitationResults = {
        total_invitations_sent: invitationTargets.length,
        invitation_breakdown: {
          required: invitationTargets.filter(inv => inv.attendance_type === 'Required').length,
          optional: invitationTargets.filter(inv => inv.attendance_type === 'Optional').length,
          observer: invitationTargets.filter(inv => inv.attendance_type === 'Observer').length,
          guest: invitationTargets.filter(inv => inv.attendance_type === 'Guest').length,
          delegate: invitationTargets.filter(inv => inv.attendance_type === 'Delegate').length
        }
      };

      // Update meeting with invitation count (using valid fields)
      await MeetingModel.updateMeeting(meetingId, {
        meeting_status: 'Scheduled'
      });
    }

    // Get the created meeting details
    const meeting = await MeetingModel.getMeetingById(meetingId);

    res.status(201).json({
      success: true,
      message: 'Hierarchical meeting created successfully',
      data: {
        meeting: meeting,
        invitation_results: invitationResults
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get members with roles for a specific hierarchy level and entity
 */
router.get('/members-with-roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchyLevel = req.query.hierarchy_level as string;
    const entityId = req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined;
    const entityType = req.query.entity_type as string;

    if (!hierarchyLevel) {
      throw new ValidationError('hierarchy_level is required');
    }

    const members = await HierarchicalMeetingService.getMembersWithRoles(
      hierarchyLevel,
      entityId,
      entityType
    );

    res.json({
      success: true,
      message: 'Members with roles retrieved successfully',
      data: {
        members: members,
        total: members.length,
        filters: {
          hierarchy_level: hierarchyLevel,
          entity_id: entityId,
          entity_type: entityType
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Send invitations for an existing meeting
 */
router.post('/:meetingId/send-invitations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    // Get meeting details
    const meeting = await MeetingModel.getMeetingById(meetingId);
    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Generate invitations
    const invitationTargets = await HierarchicalMeetingService.generateAutoInvitations({
      meeting_id: meetingId,
      meeting_type_id: meeting.meeting_type_id,
      hierarchy_level: meeting.hierarchy_level,
      entity_id: meeting.entity_id,
      entity_type: meeting.entity_type
    });

    // Create or update invitation records
    for (const target of invitationTargets) {
      // Check if invitation record already exists
      const existingInvitation = await MeetingModel.getInvitationByMeetingAndMember(meetingId, target.member_id);

      if (existingInvitation) {
        // Update existing invitation record
        await MeetingModel.updateInvitation(existingInvitation.id, {
          attendance_type: target.attendance_type,
          role_in_meeting: target.role_in_meeting,
          voting_rights: target.voting_rights,
          invitation_priority: target.invitation_priority
        });
      } else {
        // Create new invitation record
        await MeetingModel.createInvitation({
          meeting_id: meetingId,
          member_id: target.member_id,
          attendance_type: target.attendance_type,
          role_in_meeting: target.role_in_meeting,
          voting_rights: target.voting_rights,
          invitation_priority: target.invitation_priority,
          invitation_method: 'System',
          invitation_status: 'Sent'
        });
      }
    }

    // Update meeting with invitation details
    await MeetingModel.updateMeeting(meetingId, {
      meeting_status: 'Scheduled'
    });

    res.json({
      success: true,
      message: 'Invitations sent successfully',
      data: {
        meeting_id: meetingId,
        total_invitations_sent: invitationTargets.length,
        invitation_breakdown: {
          required: invitationTargets.filter(inv => inv.attendance_type === 'Required').length,
          optional: invitationTargets.filter(inv => inv.attendance_type === 'Optional').length,
          observer: invitationTargets.filter(inv => inv.attendance_type === 'Observer').length,
          guest: invitationTargets.filter(inv => inv.attendance_type === 'Guest').length,
          delegate: invitationTargets.filter(inv => inv.attendance_type === 'Delegate').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Send meeting reminders
 */
router.post('/:meetingId/send-reminders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const result = await MeetingNotificationService.sendMeetingReminders(meetingId);

    res.json({
      success: true,
      message: 'Reminders sent successfully',
      data: {
        meeting_id: meetingId,
        reminders_sent: result.sent,
        reminders_failed: result.failed
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get meeting statistics
 * NOTE: This route MUST be before /:meetingId to avoid matching "statistics" as a meetingId
 */
router.get('/statistics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const statistics = await HierarchicalMeetingService.getMeetingStatistics();

    res.json({
      success: true,
      message: 'Meeting statistics retrieved successfully',
      data: {
        statistics
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a single hierarchical meeting by ID
 */
router.get('/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    // Get meeting details
    const meeting = await MeetingModel.getMeetingById(meetingId);

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    res.json({
      success: true,
      message: 'Meeting retrieved successfully',
      data: { meeting },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get invitation statistics for a meeting
 */
router.get('/:meetingId/invitation-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const stats = await MeetingNotificationService.getInvitationStatistics(meetingId);

    res.json({
      success: true,
      message: 'Invitation statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Send actual notifications (email/SMS) for meeting invitations
 */
router.post('/:meetingId/send-notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);

    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const result = await MeetingNotificationService.sendMeetingInvitations(meetingId);

    res.json({
      success: true,
      message: 'Notifications processed successfully',
      data: {
        meeting_id: meetingId,
        notifications_sent: result.sent,
        notifications_failed: result.failed,
        details: result.details
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get hierarchical meetings with filtering and pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      hierarchy_level,
      meeting_status,
      meeting_category,
      limit = '50',
      offset = '0',
      sort = 'meeting_date',
      order = 'desc'
    } = req.query;

    const meetings = await HierarchicalMeetingService.getMeetings({
      hierarchy_level: hierarchy_level as string,
      meeting_status: meeting_status as string,
      meeting_category: meeting_category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sort: sort as string,
      order: order as 'asc' | 'desc'
    });

    res.json({
      success: true,
      message: 'Meetings retrieved successfully',
      data: {
        meetings: meetings.meetings,
        total: meetings.total,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: meetings.total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a hierarchical meeting
 */
router.put('/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    // Validate request body (allow partial updates)
    const { error, value } = createHierarchicalMeetingSchema.fork(
      Object.keys(createHierarchicalMeetingSchema.describe().keys),
      (schema) => schema.optional()
    ).validate(req.body);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Check if meeting exists
    const existingMeeting = await MeetingModel.getMeetingById(meetingId);
    if (!existingMeeting) {
      throw new NotFoundError('Meeting not found');
    }

    // Map hierarchy_level to database values
    const hierarchyLevelMap: Record<string, string> = {
      'National': 'National',
      'Provincial': 'Province',
      'Regional': 'Region',
      'Municipal': 'Municipality',
      'Ward': 'Ward',
      'Branch': 'Branch'
    };

    // Prepare update data
    const updateData: any = {};
    if (value.title) updateData.meeting_title = value.title;
    if (value.meeting_type_id) updateData.meeting_type_id = value.meeting_type_id;
    if (value.hierarchy_level) {
      updateData.hierarchy_level = hierarchyLevelMap[value.hierarchy_level] || value.hierarchy_level;
    }
    if (value.entity_id !== undefined) updateData.entity_id = value.entity_id;
    if (value.entity_type) updateData.entity_type = value.entity_type;
    if (value.location) updateData.location = value.location;
    if (value.virtual_meeting_link) updateData.virtual_meeting_link = value.virtual_meeting_link;
    if (value.meeting_platform) updateData.meeting_platform = value.meeting_platform;
    if (value.description) updateData.description = value.description;
    if (value.objectives) updateData.objectives = value.objectives;
    if (value.agenda_summary) updateData.agenda_summary = value.agenda_summary;
    if (value.quorum_required !== undefined) updateData.quorum_required = value.quorum_required;
    if (value.duration_minutes) updateData.duration_minutes = value.duration_minutes;
    if (value.meeting_chair_id !== undefined) updateData.meeting_chair_id = value.meeting_chair_id;
    if (value.meeting_secretary_id !== undefined) updateData.meeting_secretary_id = value.meeting_secretary_id;

    // Handle date and time
    if (value.meeting_date && value.meeting_time) {
      const dateStr = value.meeting_date.split('T')[0];
      const timeStr = value.meeting_time.includes(':') ? value.meeting_time : `${value.meeting_time}:00`;
      updateData.meeting_date = `${dateStr}T${timeStr}:00.000Z`;
    }

    if (value.end_time) {
      updateData.end_time = value.end_time;
    }

    // Update the meeting
    await MeetingModel.updateMeeting(meetingId, updateData);

    // Fetch updated meeting
    const updatedMeeting = await MeetingModel.getMeetingById(meetingId);

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

/**
 * Delete a hierarchical meeting
 */
router.delete('/:meetingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meetingId = parseInt(req.params.meetingId);
    if (isNaN(meetingId)) {
      throw new ValidationError('Invalid meeting ID');
    }

    const result = await HierarchicalMeetingService.deleteMeeting(meetingId);

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
