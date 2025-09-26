import { executeQuery, executeQuerySingle, executeTransaction } from '../config/database';
import { createDatabaseError, ValidationError, AuthorizationError } from '../middleware/errorHandler';
import { UserModel, CreateUserData, User } from '../models/users';

import { SecurityService } from './securityService';
import { logAudit, AuditAction, EntityType } from '../middleware/auditLogger';
import bcrypt from 'bcrypt';
import { config } from '../config/config';

// User creation workflow interfaces
export interface UserCreationRequest {
  name: string;
  email: string;
  password: string;
  admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward';
  role_name: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
  member_id?: number;
  promote_existing_member?: boolean;
  justification?: string;
  requires_approval?: boolean;
}

export interface UserCreationWorkflow {
  id: number;
  request_id: string;
  requested_by: number;
  user_data: any;
  admin_level: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  created_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminCreationResult {
  success: boolean;
  user_id?: number;
  workflow_id?: number;
  requires_approval: boolean;
  message: string;
}



export class UserManagementService {
  // Create admin user with hierarchical validation
  static async createAdminUser(
    requestData: UserCreationRequest,
    createdBy: number
  ): Promise<AdminCreationResult> {
    try {
      // Validate admin level
      const validAdminLevels = ['national', 'province', 'district', 'municipality', 'ward'];
      if (!validAdminLevels.includes(requestData.admin_level)) {
        throw new ValidationError(`Invalid admin level: ${requestData.admin_level}`);
      }

      // Check if approval is required
      const requiresApproval = await this.checkIfApprovalRequired(requestData.admin_level, createdBy);

      if (requiresApproval) {
        // Create workflow entry
        const workflowId = await this.createUserCreationWorkflow(requestData, createdBy);

        return {
          success: true,
          workflow_id: workflowId,
          requires_approval: true,
          message: 'Admin creation request submitted for approval'
        };
      } else {
        // Create user directly
        const userId = await this.createUserDirectly(requestData, createdBy);

        return {
          success: true,
          user_id: userId,
          requires_approval: false,
          message: 'Admin user created successfully'
        };
      }
    } catch (error) {
      console.error('Error in createAdminUser:', error);
      console.error('Request data:', requestData);
      throw createDatabaseError('Failed to create admin user', error);
    }
  }







  // Check if approval is required
  static async checkIfApprovalRequired(adminLevel: string, createdBy: number): Promise<boolean> {
    try {
      // Get system configuration
      const config = await executeQuerySingle(`
        SELECT config_value 
        FROM system_configuration 
        WHERE config_key = 'admin_creation_requires_approval'
      `);

      const requiresApproval = config ? JSON.parse(config.config_value) : true;

      // Super admins and national admins might bypass approval for lower levels
      const creator = await executeQuerySingle(`
        SELECT admin_level, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [createdBy]);

      if (creator?.role_name === 'super_admin') {
        return false; // Super admin doesn't need approval
      }

      if (creator?.admin_level === 'national' && 
          ['district', 'municipality', 'ward'].includes(adminLevel)) {
        return false; // National admin can create lower levels without approval
      }

      return requiresApproval;
    } catch (error) {
      return true; // Default to requiring approval on error
    }
  }

  // Create user creation workflow
  static async createUserCreationWorkflow(
    requestData: UserCreationRequest,
    requestedBy: number
  ): Promise<number> {
    try {
      const requestId = `UCW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        INSERT INTO user_creation_workflow (
          request_id, requested_by, user_data, admin_level,
          justification, status
        ) VALUES (?, ?, ?, ?, ?, 'pending')
      `;

      const result = await executeQuery(query, [
        requestId,
        requestedBy,
        JSON.stringify(requestData),
        requestData.admin_level,
        requestData.justification || 'Admin user creation request'
      ]);

      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create user creation workflow', error);
    }
  }

  // Create user directly
  static async createUserDirectly(
    requestData: UserCreationRequest,
    createdBy: number
  ): Promise<number> {
    try {
      // Get role ID
      const role = await executeQuerySingle(`
        SELECT id FROM roles WHERE name = ?
      `, [requestData.role_name]);

      if (!role) {
        throw new ValidationError(`Role ${requestData.role_name} not found`);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(requestData.password, config.security.bcryptRounds);

      // Create user
      const userQuery = `
        INSERT INTO users (
          name, email, password, role_id, admin_level,
          province_code, district_code, municipal_code, ward_code, member_id,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      `;

      const userResult = await executeQuery(userQuery, [
        requestData.name,
        requestData.email,
        hashedPassword,
        role.id,
        requestData.admin_level,
        requestData.province_code && requestData.province_code.trim() !== '' ? requestData.province_code : null,
        requestData.district_code && requestData.district_code.trim() !== '' ? requestData.district_code : null,
        requestData.municipal_code && requestData.municipal_code.trim() !== '' ? requestData.municipal_code : null,
        requestData.ward_code && requestData.ward_code.trim() !== '' ? requestData.ward_code : null,
        requestData.member_id || null
      ]);

      const userId = userResult.insertId;

      // Log admin creation
      await executeQuery(`
        INSERT INTO admin_user_creation_log (
          created_user_id, created_by_user_id, admin_level,
          creation_reason, approval_status
        ) VALUES (?, ?, ?, ?, 'approved')
      `, [
        userId,
        createdBy,
        requestData.admin_level,
        requestData.justification || 'Direct admin creation'
      ]);



      return userId;
    } catch (error) {
      throw createDatabaseError('Failed to create user directly', error);
    }
  }



  // Get pending user creation workflows
  static async getPendingUserCreationWorkflows(reviewerId: number): Promise<UserCreationWorkflow[]> {
    try {
      // Simplified permission check - only national admin can review workflows
      const reviewer = await executeQuerySingle(`
        SELECT admin_level FROM users WHERE id = ? AND is_active = TRUE
      `, [reviewerId]);

      if (!reviewer || reviewer.admin_level !== 'national') {
        throw new AuthorizationError('Only national admin can review workflows');
      }

      const query = `
        SELECT 
          ucw.*,
          u1.name as requested_by_name,
          u1.email as requested_by_email,
          u2.name as reviewed_by_name
        FROM user_creation_workflow ucw
        LEFT JOIN users u1 ON ucw.requested_by = u1.id
        LEFT JOIN users u2 ON ucw.reviewed_by = u2.id
        WHERE ucw.status = 'pending'
        ORDER BY ucw.created_at ASC
      `;

      return await executeQuery<UserCreationWorkflow>(query);
    } catch (error) {
      throw createDatabaseError('Failed to get pending workflows', error);
    }
  }

  // Approve/reject user creation workflow
  static async reviewUserCreationWorkflow(
    workflowId: number,
    reviewerId: number,
    action: 'approve' | 'reject',
    reviewNotes?: string
  ): Promise<{ success: boolean; user_id?: number; message: string }> {
    try {
      // Get workflow details
      const workflow = await executeQuerySingle(`
        SELECT * FROM user_creation_workflow WHERE id = ? AND status = 'pending'
      `, [workflowId]);

      if (!workflow) {
        throw new ValidationError('Workflow not found or already processed');
      }

      // Update workflow status
      await executeQuery(`
        UPDATE user_creation_workflow
        SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
        WHERE id = ?
      `, [action === 'approve' ? 'approved' : 'rejected', reviewerId, reviewNotes, workflowId]);

      if (action === 'approve') {
        // Create the user
        const userData = JSON.parse(workflow.user_data);
        const userId = await this.createUserDirectly(userData, workflow.requested_by);

        // Update workflow with created user ID
        await executeQuery(`
          UPDATE user_creation_workflow
          SET created_user_id = ?, status = 'completed'
          WHERE id = ?
        `, [userId, workflowId]);

        return {
          success: true,
          user_id: userId,
          message: 'User creation approved and completed'
        };
      } else {
        return {
          success: true,
          message: 'User creation request rejected'
        };
      }
    } catch (error) {
      throw createDatabaseError('Failed to review user creation workflow', error);
    }
  }

  // Get user management statistics
  static async getUserManagementStatistics(requesterId: number): Promise<any> {
    try {
      // Simplified permission check - only national admin can view statistics
      const requester = await executeQuerySingle(`
        SELECT admin_level FROM users WHERE id = ? AND is_active = TRUE
      `, [requesterId]);

      if (!requester || requester.admin_level !== 'national') {
        throw new AuthorizationError('Only national admin can view statistics');
      }

      const stats = await executeQuery(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN admin_level != 'none' THEN 1 END) as admin_users,
          COUNT(CASE WHEN admin_level = 'national' THEN 1 END) as national_admins,
          COUNT(CASE WHEN admin_level = 'province' THEN 1 END) as province_admins,
          COUNT(CASE WHEN admin_level = 'district' THEN 1 END) as district_admins,
          COUNT(CASE WHEN admin_level = 'municipality' THEN 1 END) as municipal_admins,
          COUNT(CASE WHEN admin_level = 'ward' THEN 1 END) as ward_admins,
          COUNT(CASE WHEN mfa_enabled = TRUE THEN 1 END) as mfa_enabled_users,
          COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_30_days
        FROM users
      `);

      const workflowStats = await executeQuery(`
        SELECT
          COUNT(*) as total_workflows,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_workflows,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_workflows,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_workflows
        FROM user_creation_workflow
      `);

      return {
        user_statistics: stats[0],
        workflow_statistics: workflowStats[0]
      };
    } catch (error) {
      throw createDatabaseError('Failed to get user management statistics', error);
    }
  }

  // Bulk user operations
  static async bulkUpdateUserStatus(
    userIds: number[],
    status: 'activate' | 'deactivate',
    updatedBy: number,
    reason?: string
  ): Promise<{ success: boolean; updated_count: number; message: string }> {
    try {
      if (userIds.length === 0) {
        throw new ValidationError('No user IDs provided');
      }

      // Simplified permission check - only national admin can manage users
      const manager = await executeQuerySingle(`
        SELECT admin_level FROM users WHERE id = ? AND is_active = TRUE
      `, [updatedBy]);

      if (!manager || manager.admin_level !== 'national') {
        throw new AuthorizationError('Only national admin can manage users');
      }

      const isActive = status === 'activate';
      const placeholders = userIds.map(() => '?').join(',');

      const result = await executeQuery(`
        UPDATE users
        SET is_active = ?, updated_at = NOW()
        WHERE id IN (${placeholders})
      `, [isActive, ...userIds]);

      // Log the bulk operation
      for (const userId of userIds) {
        await executeQuery(`
          INSERT INTO user_role_history (
            user_id, old_admin_level, new_admin_level,
            changed_by, change_reason, effective_date
          ) SELECT
            id, admin_level, admin_level, ?, ?, NOW()
          FROM users WHERE id = ?
        `, [updatedBy, `Bulk ${status}: ${reason || 'No reason provided'}`, userId]);
      }

      return {
        success: true,
        updated_count: result.affectedRows,
        message: `Successfully ${status}d ${result.affectedRows} users`
      };
    } catch (error) {
      throw createDatabaseError('Failed to bulk update user status', error);
    }
  }
}
