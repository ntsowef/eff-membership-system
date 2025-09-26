import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// User interfaces
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role_id: number;
  email_verified_at?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  failed_login_attempts: number;
  locked_until?: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  role?: string;
  admin_level?: 'national';
  member_id?: number;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDetails extends User {
  role_name: string;
  role_description?: string;
  member_first_name?: string;
  member_last_name?: string;
  member_id_number?: string;
  province_name?: string;
  region_name?: string;
  municipality_name?: string;
  ward_name?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role_id: number;
  admin_level?: string;
  province_id?: number;
  region_id?: number;
  municipality_id?: number;
  ward_id?: number;
  member_id?: number;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role_id?: number;
  admin_level?: string;
  province_id?: number;
  region_id?: number;
  municipality_id?: number;
  ward_id?: number;
  member_id?: number;
  is_active?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordUpdateData {
  token: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// User model class
export class UserModel {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate password reset token
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Get user by ID with role information
  static async getUserById(id: number): Promise<UserDetails | null> {
    try {
      const query = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.password,
          u.password_changed_at,
          u.role_id,
          u.email_verified_at,
          u.remember_token,
          u.password_reset_token,
          u.password_reset_expires,
          u.failed_login_attempts,
          u.locked_until,
          u.locked_at,
          u.mfa_enabled,
          u.mfa_secret,
          u.member_id,
          u.admin_level,
          u.province_code,
          u.district_code,
          u.municipal_code,
          u.ward_code,
          u.is_active,
          u.account_locked,
          u.last_login_at,
          u.last_login_ip,
          u.created_at,
          u.updated_at,
          r.name as role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;

      return await executeQuerySingle<UserDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch user', error);
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<UserDetails | null> {
    try {
      const query = `
        SELECT
          u.*,
          r.name as role_name,
          r.description as role_description,
          m.firstname as member_first_name,
          m.surname as member_last_name,
          m.id_number as member_id_number
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN members m ON u.member_id = m.member_id
        WHERE u.email = ?
      `;

      return await executeQuerySingle<UserDetails>(query, [email]);
    } catch (error) {
      throw createDatabaseError('Failed to fetch user by email', error);
    }
  }

  // Create new user
  static async createUser(userData: CreateUserData): Promise<number> {
    try {
      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);
      
      const query = `
        INSERT INTO users (
          name, email, password, role_id, admin_level,
          province_id, region_id, municipality_id, ward_id, member_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userData.name,
        userData.email,
        hashedPassword,
        userData.role_id,
        userData.admin_level || 'none',
        userData.province_id || null,
        userData.region_id || null,
        userData.municipality_id || null,
        userData.ward_id || null,
        userData.member_id || null
      ];
      
      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create user', error);
    }
  }

  // Update user
  static async updateUser(id: number, userData: UpdateUserData): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      
      if (userData.name !== undefined) {
        fields.push('name = ?');
        params.push(userData.name);
      }
      
      if (userData.email !== undefined) {
        fields.push('email = ?');
        params.push(userData.email);
      }
      
      if (userData.role_id !== undefined) {
        fields.push('role_id = ?');
        params.push(userData.role_id);
      }
      
      if (userData.admin_level !== undefined) {
        fields.push('admin_level = ?');
        params.push(userData.admin_level);
      }
      
      if (userData.province_id !== undefined) {
        fields.push('province_id = ?');
        params.push(userData.province_id);
      }
      
      if (userData.region_id !== undefined) {
        fields.push('region_id = ?');
        params.push(userData.region_id);
      }
      
      if (userData.municipality_id !== undefined) {
        fields.push('municipality_id = ?');
        params.push(userData.municipality_id);
      }
      
      if (userData.ward_id !== undefined) {
        fields.push('ward_id = ?');
        params.push(userData.ward_id);
      }
      
      if (userData.member_id !== undefined) {
        fields.push('member_id = ?');
        params.push(userData.member_id);
      }
      
      if (userData.is_active !== undefined) {
        fields.push('is_active = ?');
        params.push(userData.is_active);
      }
      
      if (fields.length === 0) {
        return false;
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      const result = await executeQuery(query, params);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update user', error);
    }
  }

  // Authenticate user
  static async authenticateUser(credentials: LoginCredentials): Promise<UserDetails | null> {
    try {
      const user = await this.getUserByEmail(credentials.email);
      
      if (!user || !user.is_active) {
        return null;
      }
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return null;
      }
      
      // Verify password
      const isValidPassword = await this.verifyPassword(credentials.password, user.password);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(user.id);
        return null;
      }
      
      // Reset failed login attempts and update last login
      await this.resetFailedLoginAttempts(user.id);
      await this.updateLastLogin(user.id);
      
      return user;
    } catch (error) {
      throw createDatabaseError('Failed to authenticate user', error);
    }
  }

  // Increment failed login attempts
  static async incrementFailedLoginAttempts(userId: number): Promise<void> {
    try {
      const maxAttempts = 5;
      const lockoutDuration = 30; // minutes
      
      const query = `
        UPDATE users 
        SET 
          failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= ? 
            THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
            ELSE locked_until
          END
        WHERE id = ?
      `;
      
      await executeQuery(query, [maxAttempts, lockoutDuration, userId]);
    } catch (error) {
      throw createDatabaseError('Failed to increment failed login attempts', error);
    }
  }

  // Reset failed login attempts
  static async resetFailedLoginAttempts(userId: number): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = ?
      `;
      
      await executeQuery(query, [userId]);
    } catch (error) {
      throw createDatabaseError('Failed to reset failed login attempts', error);
    }
  }

  // Update last login
  static async updateLastLogin(userId: number): Promise<void> {
    try {
      const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      await executeQuery(query, [userId]);
    } catch (error) {
      throw createDatabaseError('Failed to update last login', error);
    }
  }

  // Generate password reset token
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user || !user.is_active) {
        return null;
      }

      const resetToken = this.generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      const query = `
        UPDATE users
        SET password_reset_token = ?, password_reset_expires = ?
        WHERE id = ?
      `;

      await executeQuery(query, [resetToken, expiresAt, user.id]);
      return resetToken;
    } catch (error) {
      throw createDatabaseError('Failed to generate password reset token', error);
    }
  }

  // Verify password reset token
  static async verifyPasswordResetToken(token: string): Promise<UserDetails | null> {
    try {
      const query = `
        SELECT u.*, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.password_reset_token = ?
        AND u.password_reset_expires > NOW()
        AND u.is_active = TRUE
      `;

      return await executeQuerySingle<UserDetails>(query, [token]);
    } catch (error) {
      throw createDatabaseError('Failed to verify password reset token', error);
    }
  }

  // Reset password with token
  static async resetPasswordWithToken(tokenData: PasswordUpdateData): Promise<boolean> {
    try {
      const user = await this.verifyPasswordResetToken(tokenData.token);
      if (!user) {
        return false;
      }

      const hashedPassword = await this.hashPassword(tokenData.newPassword);

      const query = `
        UPDATE users
        SET
          password = ?,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          failed_login_attempts = 0,
          locked_until = NULL
        WHERE id = ?
      `;

      const result = await executeQuery(query, [hashedPassword, user.id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to reset password', error);
    }
  }

  // Change password (authenticated user)
  static async changePassword(userId: number, passwordData: ChangePasswordData): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return false;
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(passwordData.currentPassword, user.password);
      if (!isValidPassword) {
        return false;
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(passwordData.newPassword);

      const query = 'UPDATE users SET password = ? WHERE id = ?';
      const result = await executeQuery(query, [hashedPassword, userId]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to change password', error);
    }
  }

  // Get all users with pagination and filtering
  static async getAllUsers(
    limit: number = 20,
    offset: number = 0,
    filters: { role_id?: number; admin_level?: string; is_active?: boolean } = {}
  ): Promise<UserDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.role_id) {
        whereClause += ' AND u.role_id = ?';
        params.push(filters.role_id);
      }

      if (filters.admin_level) {
        whereClause += ' AND u.admin_level = ?';
        params.push(filters.admin_level);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND u.is_active = ?';
        params.push(filters.is_active);
      }

      const query = `
        SELECT
          u.*,
          r.name as role_name,
          r.description as role_description,
          m.first_name as member_first_name,
          m.last_name as member_last_name,
          m.id_number as member_id_number
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN members m ON u.member_id = m.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery<UserDetails>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to fetch users', error);
    }
  }

  // Get user count
  static async getUserCount(filters: { role_id?: number; admin_level?: string; is_active?: boolean } = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.role_id) {
        whereClause += ' AND role_id = ?';
        params.push(filters.role_id);
      }

      if (filters.admin_level) {
        whereClause += ' AND admin_level = ?';
        params.push(filters.admin_level);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      const query = `SELECT COUNT(*) as count FROM users ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);

      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get user count', error);
    }
  }

  // Delete user (soft delete by deactivating)
  static async deleteUser(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE users SET is_active = FALSE WHERE id = ?';
      const result = await executeQuery(query, [id]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to delete user', error);
    }
  }

  // Verify email
  static async verifyEmail(userId: number): Promise<boolean> {
    try {
      const query = 'UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?';
      const result = await executeQuery(query, [userId]);

      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to verify email', error);
    }
  }
}
