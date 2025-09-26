import { Router, Request, Response, NextFunction } from 'express';
import { MemberModel, UpdateMemberData, UpdateMemberProfileData } from '../models/members';
import { UserModel, ChangePasswordData } from '../models/users';
import { DocumentModel } from '../models/documents';
import { NotificationModel } from '../models/notifications';
import { authenticate } from '../middleware/auth';
import { ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler';
import { logPasswordChange, logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  cell_number: Joi.string().min(10).max(20).optional(),
  alternative_contact: Joi.string().min(10).max(20).optional(),
  residential_address: Joi.string().min(10).max(500).optional(),
  postal_address: Joi.string().max(500).optional(),
  occupation: Joi.string().max(100).optional(),
  employer: Joi.string().max(100).optional()
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(6).required(),
  new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
    .messages({
      'any.only': 'Password confirmation does not match new password'
    })
});

const branchTransferRequestSchema = Joi.object({
  new_ward_code: Joi.string().min(3).max(20).required(),
  reason: Joi.string().min(10).max(500).required()
});

// Get current user's member profile
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.member_id) {
      throw new NotFoundError('No member profile associated with this user account');
    }

    const member = await MemberModel.getMemberById(req.user.member_id);
    if (!member) {
      throw new NotFoundError('Member profile not found');
    }

    // Get member's documents
    const documents = await DocumentModel.getDocuments(10, 0, { member_id: member.member_id });

    // Get recent notifications
    const notifications = await NotificationModel.getNotifications(10, 0, {
      user_id: req.user.id,
      unread_only: false
    });

    res.json({
      success: true,
      message: 'Member profile retrieved successfully',
      data: {
        member,
        documents,
        recent_notifications: notifications
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update member profile
router.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.member_id) {
      throw new NotFoundError('No member profile associated with this user account');
    }

    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Get current member data for audit logging
    const currentMember = await MemberModel.getMemberById(req.user.member_id);
    if (!currentMember) {
      throw new NotFoundError('Member profile not found');
    }

    // Map API fields to database fields
    const updateData: UpdateMemberData = {
      firstname: value.first_name,
      surname: value.last_name,
      email: value.email,
      cell_number: value.cell_number,
      landline_number: value.alternative_contact,
      residential_address: value.residential_address
      // Note: postal_address, occupation, employer are not stored in members table
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateMemberData] === undefined) {
        delete updateData[key as keyof UpdateMemberData];
      }
    });

    const success = await MemberModel.updateMember(req.user.member_id, updateData);

    if (!success) {
      throw new Error('Failed to update member profile');
    }

    // Get updated member data
    const updatedMember = await MemberModel.getMemberById(req.user.member_id);

    // Log the profile update
    await logAudit(
      req.user.id,
      AuditAction.UPDATE,
      EntityType.MEMBER,
      req.user.member_id,
      { 
        first_name: currentMember.first_name,
        last_name: currentMember.last_name,
        email: currentMember.email,
        cell_number: currentMember.cell_number
      },
      updateData,
      req
    );

    res.json({
      success: true,
      message: 'Member profile updated successfully',
      data: {
        member: updatedMember
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/me/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { current_password, new_password } = value;

    const passwordData: ChangePasswordData = {
      currentPassword: current_password,
      newPassword: new_password
    };

    const success = await UserModel.changePassword(req.user!.id, passwordData);
    if (!success) {
      throw new ValidationError('Current password is incorrect');
    }

    // Log password change
    await logPasswordChange(req.user!.id, req);

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get membership status and history
router.get('/me/membership-status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.member_id) {
      throw new NotFoundError('No member profile associated with this user account');
    }

    const member = await MemberModel.getMemberById(req.user.member_id);
    if (!member) {
      throw new NotFoundError('Member profile not found');
    }

    // Calculate membership details
    const joinDate = new Date(member.date_joined || member.member_created_at);
    const expiryDate = new Date(member.expiry_date || member.membership_expiry || new Date());
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const membershipDuration = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

    const membershipStatus = {
      membership_number: member.membership_number,
      status: member.membership_status,
      join_date: member.date_joined || member.member_created_at,
      expiry_date: member.expiry_date || member.membership_expiry,
      days_until_expiry: daysUntilExpiry,
      membership_duration_days: membershipDuration,
      is_expired: daysUntilExpiry < 0,
      needs_renewal: daysUntilExpiry <= 30 && daysUntilExpiry >= 0,
      voter_status: member.voter_status,
      voter_registration_number: member.voter_registration_number,
      voter_registration_date: member.voter_registration_date,
      branch_info: {
        ward: member.ward_name,
        municipality: member.municipality_name,
        region: member.region_name,
        province: member.province_name
      }
    };

    res.json({
      success: true,
      message: 'Membership status retrieved successfully',
      data: {
        membership_status: membershipStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Request branch transfer
router.post('/me/request-transfer', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.member_id) {
      throw new NotFoundError('No member profile associated with this user account');
    }

    const { error, value } = branchTransferRequestSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { new_ward_code, reason } = value;

    // Get current member data
    const member = await MemberModel.getMemberById(req.user.member_id);
    if (!member) {
      throw new NotFoundError('Member profile not found');
    }

    // Check if already in the requested ward
    if (member.ward_code === new_ward_code) {
      throw new ValidationError('You are already a member of this ward');
    }

    // Create a notification for administrators to review the transfer request
    await NotificationModel.createNotification({
      recipient_type: 'Admin',
      notification_type: 'Admin',
      delivery_channel: 'In-App',
      title: 'Branch Transfer Request',
      message: `Member ${member.first_name} ${member.last_name} (${member.membership_number}) has requested a transfer to ward code ${new_ward_code}. Reason: ${reason}`,
      template_data: {
        member_id: member.id,
        current_ward_code: member.ward_code,
        new_ward_code,
        reason,
        member_name: `${member.first_name} ${member.last_name}`,
        membership_number: member.membership_number
      },
      send_immediately: false
    });

    // Log the transfer request
    await logAudit(
      req.user.id,
      'transfer_requested',
      EntityType.MEMBER,
      req.user.member_id,
      { ward_code: member.ward_code },
      { new_ward_code, reason },
      req
    );

    res.json({
      success: true,
      message: 'Branch transfer request submitted successfully. An administrator will review your request.',
      data: {
        current_ward: member.ward_name,
        requested_ward_code: new_ward_code,
        reason,
        submitted_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's documents
router.get('/me/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.member_id) {
      throw new NotFoundError('No member profile associated with this user account');
    }

    const documents = await DocumentModel.getDocuments(10, 0, { member_id: req.user.member_id });

    res.json({
      success: true,
      message: 'Member documents retrieved successfully',
      data: {
        documents
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's notifications
router.get('/me/notifications', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread_only === 'true';

    const [notifications, totalCount, unreadCount] = await Promise.all([
      NotificationModel.getNotifications(limit, offset, {
        user_id: req.user!.id,
        unread_only: unreadOnly
      }),
      NotificationModel.getNotificationCount({
        user_id: req.user!.id,
        unread_only: unreadOnly
      }),
      NotificationModel.getUnreadCount(req.user!.id)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: 'Member notifications retrieved successfully',
      data: {
        notifications,
        unread_count: unreadCount,
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

// Mark notification as read
router.post('/me/notifications/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification ID');
    }

    // Check if notification belongs to the user
    const notification = await NotificationModel.getNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.user_id !== req.user!.id) {
      throw new AuthorizationError('Cannot mark other users\' notifications as read');
    }

    const success = await NotificationModel.markAsRead(notificationId);
    if (!success) {
      throw new Error('Failed to mark notification as read');
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get member's activity history
router.get('/me/activity', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    // Import AuditLogModel here to avoid circular dependency
    const { AuditLogModel } = await import('../models/auditLogs');
    const activityLogs = await AuditLogModel.getUserActivityLogs(req.user!.id, limit);

    res.json({
      success: true,
      message: 'Member activity history retrieved successfully',
      data: {
        activity_logs: activityLogs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
