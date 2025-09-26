import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authenticate, requirePermission, requireAdminLevel, requireUserManagementPermission, requireUserManagementAccess } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserManagementService } from '../services/userManagementService';

import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import { sendSuccess, sendError } from '../utils/responseHelpers';
import { executeQuery, executeQuerySingle } from '../config/database';

const router = express.Router();

// Validation schemas
const createAdminUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  admin_level: Joi.string().valid('national', 'province', 'district', 'municipality', 'ward').required(),
  role_name: Joi.string().required(),
  province_code: Joi.string().max(10).allow('').optional(),
  district_code: Joi.string().max(10).allow('').optional(),
  municipal_code: Joi.string().max(10).allow('').optional(),
  ward_code: Joi.string().max(10).allow('').optional(),
  member_id: Joi.number().integer().positive().optional(),
  promote_existing_member: Joi.boolean().optional(),
  justification: Joi.string().max(500).optional(),
  requires_approval: Joi.boolean().optional()
});

const reviewWorkflowSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  review_notes: Joi.string().max(1000).optional()
});

const bulkUserUpdateSchema = Joi.object({
  user_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  status: Joi.string().valid('activate', 'deactivate').required(),
  reason: Joi.string().max(500).optional()
});



// Create admin user
router.post('/create-admin',
  // authenticate, // TEMPORARILY DISABLED FOR DEMO
  // requirePermission('users.manage'), // TEMPORARILY DISABLED FOR DEMO
  validate({ body: createAdminUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // DEMO MODE: Use mock creator ID since authentication is disabled
      const creatorId = req.user?.id || 1; // Default to admin user ID 1
      const result = await UserManagementService.createAdminUser(req.body, creatorId);

      // Log the action
      await logAudit(
        creatorId,
        AuditAction.CREATE,
        EntityType.USER,
        result.user_id || result.workflow_id,
        undefined,
        {
          action: 'create_admin_user',
          admin_level: req.body.admin_level,
          requires_approval: result.requires_approval,
          email: req.body.email
        },
        req
      );

      sendSuccess(res, result, result.message, result.requires_approval ? 202 : 201);
    } catch (error) {
      next(error);
    }
  }
);

// Get all admin users with hierarchical filtering
router.get('/admins',
  authenticate,
  requireUserManagementAccess(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        admin_level,
        province_code,
        district_code,
        municipal_code,
        ward_code,
        is_active,
        page = 1,
        limit = 50,
        search
      } = req.query;

      // Build WHERE clause for filtering
      const conditions: string[] = [];
      const params: any[] = [];

      // Filter by admin level
      if (admin_level && admin_level !== 'all') {
        conditions.push('u.admin_level = ?');
        params.push(admin_level);
      }

      // Filter by geographic scope
      if (province_code) {
        conditions.push('u.province_code = ?');
        params.push(province_code);
      }
      if (district_code) {
        conditions.push('u.district_code = ?');
        params.push(district_code);
      }
      if (municipal_code) {
        conditions.push('u.municipal_code = ?');
        params.push(municipal_code);
      }
      if (ward_code) {
        conditions.push('u.ward_code = ?');
        params.push(ward_code);
      }

      // Filter by active status
      if (is_active !== undefined) {
        conditions.push('u.is_active = ?');
        params.push(is_active === 'true');
      }

      // Search functionality
      if (search) {
        conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ${whereClause}
      `;
      const countResult = await executeQuerySingle<{ total: number }>(countQuery, params);
      const total = countResult?.total || 0;

      // Calculate pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum);

      // Get users with pagination
      const usersQuery = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.admin_level,
          u.province_code,
          u.district_code,
          u.municipal_code,
          u.ward_code,
          u.is_active,
          u.mfa_enabled,
          u.last_login_at as last_login,
          u.created_at,
          u.updated_at,
          u.member_id,
          r.name as role_name,
          r.description as role_description,
          m.firstname as member_firstname,
          m.surname as member_surname,
          m.id_number as member_id_number
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN members m ON u.member_id = m.member_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const users = await executeQuery(usersQuery, [...params, limitNum, offset]);

      // Format response with pagination
      const response = {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      };

      sendSuccess(res, response, 'Admin users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Get pending user creation workflows
router.get('/workflows/pending',
  // authenticate, // TEMPORARILY DISABLED FOR DEMO
  // requirePermission('users.manage'), // TEMPORARILY DISABLED FOR DEMO
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // MOCK DATA FOR DEMO - Replace with real query when authentication is enabled
      const mockWorkflows = [
        {
          id: 1,
          request_id: 'UCW-1735567890-abc123def',
          requested_by: 2,
          user_data: {
            name: 'John Doe',
            email: 'john.doe@eff.org.za',
            admin_level: 'municipality',
            role_name: 'Municipal Admin'
          },
          admin_level: 'national',
          justification: 'Need municipal admin for Johannesburg operations',
          status: 'pending',
          created_at: '2025-08-25T10:30:00.000Z'
        },
        {
          id: 2,
          request_id: 'UCW-1735567891-def456ghi',
          requested_by: 3,
          user_data: {
            name: 'Jane Smith',
            email: 'jane.smith@eff.org.za',
            admin_level: 'ward',
            role_name: 'Ward Admin'
          },
          admin_level: 'ward',
          geographic_scope: {
            province_code: 'WC',
            municipality_code: 'CPT',
            ward_code: '19100001'
          },
          justification: 'Ward admin needed for Cape Town Ward 1',
          status: 'pending',
          created_at: '2025-08-24T14:15:00.000Z'
        }
      ];

      sendSuccess(res, mockWorkflows, 'Pending workflows retrieved successfully (DEMO DATA)');
    } catch (error) {
      next(error);
    }
  }
);

// Review user creation workflow
router.patch('/workflows/:workflowId/review',
  // authenticate, // TEMPORARILY DISABLED FOR DEMO
  // requirePermission('users.manage'), // TEMPORARILY DISABLED FOR DEMO
  validate({ body: reviewWorkflowSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = parseInt(req.params.workflowId);
      const { action, review_notes } = req.body;

      // DEMO MODE: Use mock reviewer ID since authentication is disabled
      const reviewerId = req.user?.id || 1; // Default to admin user ID 1

      const result = await UserManagementService.reviewUserCreationWorkflow(
        workflowId,
        reviewerId,
        action,
        review_notes
      );

      // Log the action
      await logAudit(
        reviewerId,
        action === 'approve' ? AuditAction.UPDATE : AuditAction.DELETE,
        EntityType.USER,
        workflowId,
        undefined,
        {
          action: 'review_user_creation_workflow',
          workflow_action: action,
          review_notes,
          created_user_id: result.user_id
        },
        req
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);



// Update individual user
router.put('/users/:id',
  authenticate,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedBy = req.user!.id;

      // Validate user exists
      const existingUser = await executeQuerySingle(`
        SELECT id, name, email, admin_level, province_code, district_code, municipal_code, ward_code
        FROM users WHERE id = ?
      `, [userId]);

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updateData.name);
      }
      if (updateData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(updateData.email);
      }
      // Note: phone column doesn't exist in users table yet
      // if (updateData.phone !== undefined) {
      //   updateFields.push('phone = ?');
      //   updateValues.push(updateData.phone);
      // }
      if (updateData.admin_level !== undefined) {
        updateFields.push('admin_level = ?');
        updateValues.push(updateData.admin_level);
      }
      if (updateData.province_code !== undefined) {
        updateFields.push('province_code = ?');
        updateValues.push(updateData.province_code || null);
      }
      if (updateData.district_code !== undefined) {
        updateFields.push('district_code = ?');
        updateValues.push(updateData.district_code || null);
      }
      if (updateData.municipal_code !== undefined) {
        updateFields.push('municipal_code = ?');
        updateValues.push(updateData.municipal_code || null);
      }
      if (updateData.ward_code !== undefined) {
        updateFields.push('ward_code = ?');
        updateValues.push(updateData.ward_code || null);
      }
      if (updateData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updateData.is_active);
      }

      if (updateFields.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATES',
            message: 'No valid fields to update',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Add updated timestamp
      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      // Execute update
      await executeQuery(`
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      // Update role if provided
      if (updateData.role_name) {
        const role = await executeQuerySingle(`
          SELECT id FROM roles WHERE name = ?
        `, [updateData.role_name]);

        if (role) {
          await executeQuery(`
            UPDATE users SET role_id = ? WHERE id = ?
          `, [role.id, userId]);
        }
      }

      // Get updated user data
      const updatedUser = await executeQuerySingle(`
        SELECT u.id, u.name, u.email, u.admin_level, u.province_code,
               u.district_code, u.municipal_code, u.ward_code, u.is_active,
               u.mfa_enabled, u.last_login_at as last_login, u.created_at, u.updated_at,
               r.name as role_name, r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [userId]);

      // Log the action
      await logAudit(
        updatedBy,
        AuditAction.UPDATE,
        EntityType.USER,
        userId,
        existingUser,
        {
          action: 'update_user',
          updated_fields: Object.keys(updateData),
          old_values: existingUser,
          new_values: updatedUser
        },
        req
      );

      sendSuccess(res, updatedUser, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Reset user password
router.put('/users/:id/reset-password',
  authenticate,
  requirePermission('users.manage'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const { new_password } = req.body;
      const updatedBy = req.user!.id;

      // Validate user exists
      const existingUser = await executeQuerySingle(`
        SELECT id, name, email FROM users WHERE id = ?
      `, [userId]);

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate password
      if (!new_password || new_password.length < 8) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Password must be at least 8 characters long',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(new_password, 12);

      // Update password
      await executeQuery(`
        UPDATE users
        SET password = ?, password_changed_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [hashedPassword, userId]);

      // Log the action
      await logAudit(
        updatedBy,
        AuditAction.UPDATE,
        EntityType.USER,
        userId,
        existingUser,
        {
          action: 'reset_user_password',
          target_user: existingUser.name,
          target_email: existingUser.email
        },
        req
      );

      sendSuccess(res, { id: userId, message: 'Password reset successfully' }, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }
);

// Bulk update user status
router.patch('/bulk-update',
  // authenticate, // TEMPORARILY DISABLED FOR DEMO
  // requirePermission('users.manage'), // TEMPORARILY DISABLED FOR DEMO
  validate({ body: bulkUserUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_ids, status, reason } = req.body;

      const result = await UserManagementService.bulkUpdateUserStatus(
        user_ids,
        status,
        req.user!.id,
        reason
      );

      // Log the action
      await logAudit(
        req.user!.id,
        AuditAction.UPDATE,
        EntityType.USER,
        user_ids[0], // Use first user ID as representative
        undefined,
        {
          action: 'bulk_update_user_status',
          user_ids,
          status,
          reason,
          updated_count: result.updated_count
        },
        req
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);



// Get available roles for admin creation
router.get('/roles',
  // authenticate, // TEMPORARILY DISABLED FOR DEMO
  // requirePermission('users.manage'), // TEMPORARILY DISABLED FOR DEMO
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // MOCK DATA FOR DEMO - Replace with real query when authentication is enabled
      const mockRoles = [
        {
          id: 1,
          name: 'Super Admin',
          description: 'Full system access with all permissions',
          permissions: ['users.create', 'users.read', 'users.update', 'users.delete', 'analytics.view', 'system.manage'],
          admin_level: 'national',
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z'
        },

        {
          id: 4,
          name: 'Ward Admin',
          description: 'Ward-level member management and local operations',
          permissions: ['members.read', 'members.update', 'meetings.create', 'meetings.manage'],
          admin_level: 'ward',
          is_active: true,
          created_at: '2025-01-01T00:00:00.000Z'
        }
      ];

      sendSuccess(res, { roles: mockRoles }, 'Available roles retrieved successfully (DEMO DATA)');
    } catch (error) {
      next(error);
    }
  }
);

// Get user statistics
router.get('/statistics',
  authenticate,
  requirePermission('users.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get total user counts by admin level
      const adminLevelStats = await executeQuery(`
        SELECT
          admin_level,
          COUNT(*) as count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count
        FROM users
        WHERE admin_level IS NOT NULL AND admin_level != 'none'
        GROUP BY admin_level
        ORDER BY
          CASE admin_level
            WHEN 'national' THEN 1
            WHEN 'province' THEN 2
            WHEN 'district' THEN 3
            WHEN 'municipality' THEN 4
            WHEN 'ward' THEN 5
            ELSE 6
          END
      `);

      // Get recent user activity
      const recentActivity = await executeQuery(`
        SELECT
          COUNT(*) as total_logins_last_30_days
        FROM users
        WHERE last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      // Get user creation trends (last 12 months)
      const creationTrends = await executeQuery(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as users_created
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month DESC
      `);

      // Get geographic distribution
      const geographicDistribution = await executeQuery(`
        SELECT
          province_code,
          COUNT(*) as user_count
        FROM users
        WHERE province_code IS NOT NULL
        GROUP BY province_code
        ORDER BY user_count DESC
      `);

      // Get MFA adoption
      const mfaStats = await executeQuerySingle(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN mfa_enabled = 1 THEN 1 ELSE 0 END) as mfa_enabled_count,
          ROUND((SUM(CASE WHEN mfa_enabled = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as mfa_adoption_percentage
        FROM users
        WHERE admin_level IS NOT NULL AND admin_level != 'none'
      `);

      // Calculate summary statistics for frontend
      const totalUsers = adminLevelStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
      const activeUsers = adminLevelStats.reduce((sum: number, stat: any) => sum + stat.active_count, 0);
      const nationalAdmins = adminLevelStats.find((stat: any) => stat.admin_level === 'national')?.count || 0;
      const provinceAdmins = adminLevelStats.find((stat: any) => stat.admin_level === 'province')?.count || 0;
      const districtAdmins = adminLevelStats.find((stat: any) => stat.admin_level === 'district')?.count || 0;
      const municipalAdmins = adminLevelStats.find((stat: any) => stat.admin_level === 'municipality')?.count || 0;
      const wardAdmins = adminLevelStats.find((stat: any) => stat.admin_level === 'ward')?.count || 0;

      const statistics = {
        // Summary statistics for cards
        total_users: totalUsers,
        admin_users: totalUsers, // All users in this endpoint are admin users
        active_users: activeUsers,

        // Admin level breakdown
        national_admins: nationalAdmins,
        province_admins: provinceAdmins,
        district_admins: districtAdmins,
        municipal_admins: municipalAdmins,
        ward_admins: wardAdmins,

        // Security statistics
        mfa_enabled_users: mfaStats?.mfa_enabled_count || 0,
        active_last_30_days: recentActivity[0]?.total_logins_last_30_days || 0,

        // Raw data for charts and detailed views
        adminLevelStats,
        recentActivity: recentActivity[0] || { total_logins_last_30_days: 0 },
        creationTrends,
        geographicDistribution,
        mfaStats
      };

      sendSuccess(res, statistics, 'User statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
