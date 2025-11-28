/**
 * User Profile Routes
 * 
 * Handles profile management for ALL users (admins, members, etc.)
 * This is different from memberProfile.ts which is specifically for members with member_id
 */

import { Router, Request, Response, NextFunction } from 'express';
import { UserModel, ChangePasswordData } from '../models/users';
import { MemberModel } from '../models/members';
import { NotificationModel } from '../models/notifications';
import { authenticate } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logPasswordChange, logAudit } from '../middleware/auditLogger';
import { AuditAction, EntityType } from '../models/auditLogs';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateUserProfileSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  email: Joi.string().email().optional()
  // Note: phone field is not in users table, it's in members table
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

/**
 * GET /api/v1/user/me
 * Get current user's profile (works for all users: admins, members, etc.)
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserModel.getUserById(req.user!.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If user has a member_id, get member details
    let memberDetails: any = null;
    if (user.member_id) {
      memberDetails = await MemberModel.getMemberById(user.member_id);
    }

    // Get recent notifications
    const notifications = await NotificationModel.getNotifications(5, 0, {
      user_id: req.user!.id,
      unread_only: false
    });

    const unreadCount = await NotificationModel.getUnreadCount(req.user!.id);

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          admin_level: user.admin_level,
          province_name: user.province_name,
          municipality_name: user.municipality_name,
          is_active: user.is_active,
          member_id: user.member_id,
          created_at: user.created_at,
          last_login: user.last_login
        },
        member: memberDetails,
        notifications: {
          recent: notifications,
          unread_count: unreadCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/user/me
 * Update current user's profile
 */
router.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateUserProfileSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Get current user data for audit logging
    const currentUser = await UserModel.getUserById(req.user!.id);
    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    // Update user profile
    const updateData: any = {};
    if (value.name !== undefined) updateData.name = value.name;
    if (value.email !== undefined) updateData.email = value.email;
    // Note: phone is not updated here as it's not in users table

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const success = await UserModel.updateUser(req.user!.id, updateData);

    if (!success) {
      throw new Error('Failed to update user profile');
    }

    // Get updated user data
    const updatedUser = await UserModel.getUserById(req.user!.id);

    // Log the profile update
    await logAudit(
      req.user!.id,
      AuditAction.UPDATE,
      EntityType.USER,
      req.user!.id,
      {
        name: currentUser.name,
        email: currentUser.email
      },
      updateData,
      req
    );

    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: {
        user: {
          id: updatedUser!.id,
          name: updatedUser!.name,
          email: updatedUser!.email,
          role: updatedUser!.role
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;

