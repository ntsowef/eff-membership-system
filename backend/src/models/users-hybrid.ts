import { getPrismaClient, executeQuery, executeQuerySingle, PrismaClient } from '../config/database-hybrid';
import { SQLMigrationService } from '../services/sqlMigrationService';
import { createDatabaseError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// =====================================================================================
// HYBRID USER MODEL - Combines Prisma ORM with Raw SQL for complex queries
// =====================================================================================

// User interfaces (keeping existing structure for compatibility)
export interface User {
  user_id: number;
  name: string;
  email: string;
  password: string;
  role_id?: number;
  email_verified_at?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  failed_login_attempts: number;
  locked_until?: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  role?: string;
  admin_level?: string;
  member_id?: number;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDetails extends User {
  role_name?: string;
  role_description?: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  ward_code?: string;
}

export class UserModel {
  
  // =====================================================================================
  // PRISMA ORM METHODS - For simple CRUD operations
  // =====================================================================================
  
  // Create user using Prisma ORM
  static async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role_id?: number;
    admin_level?: string;
    province_code?: string;
    district_code?: string;
    municipal_code?: string;
    ward_code?: string;
    member_id?: number;
  }): Promise<User> {
    try {
      const prisma = getPrismaClient();
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await prisma.users.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role_id: userData.role_id ?? null,
          admin_level: userData.admin_level ?? null,
          province_code: userData.province_code ?? null,
          district_code: userData.district_code ?? null,
          municipal_code: userData.municipal_code ?? null,
          ward_code: userData.ward_code ?? null,
          member_id: userData.member_id ?? null,
          email_verified_at: new Date(),
          id: 0, // Workaround for duplicate id field in schema
        }
      });

      return {
        ...user,
        email_verified_at: user.email_verified_at?.toISOString(),
        password_reset_expires: user.password_reset_expires?.toISOString(),
        locked_until: user.locked_until?.toISOString(),
        last_login_at: user.last_login_at?.toISOString(),
        created_at: user.created_at?.toISOString() ?? new Date().toISOString(),
        updated_at: user.updated_at?.toISOString() ?? new Date().toISOString()
      } as User;
    } catch (error) {
      throw createDatabaseError('Failed to create user', error);
    }
  }
  
  // Get user by ID using Prisma ORM
  static async getUserByIdPrisma(id: number): Promise<UserDetails | null> {
    try {
      const prisma = getPrismaClient();
      
      const user = await prisma.users.findUnique({
        where: { user_id: id }
      });
      
      if (!user) return null;
      
      const result: UserDetails = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        password: user.password,
        role_id: user.role_id ?? undefined,
        admin_level: user.admin_level ?? undefined,
        member_id: user.member_id ?? undefined,
        is_active: user.is_active ?? false,
        failed_login_attempts: user.failed_login_attempts ?? 0,
        mfa_enabled: user.mfa_enabled ?? false,
        email_verified_at: user.email_verified_at?.toISOString(),
        password_reset_expires: user.password_reset_expires?.toISOString(),
        locked_until: user.locked_until?.toISOString(),
        last_login_at: user.last_login_at?.toISOString(),
        created_at: user.created_at?.toISOString() ?? new Date().toISOString(),
        updated_at: user.updated_at?.toISOString() ?? new Date().toISOString(),
        role_name: undefined,
        role_description: undefined,
        province_code: user.province_code ?? undefined,
        district_code: user.district_code ?? undefined,
        municipal_code: user.municipal_code ?? undefined,
        ward_code: user.ward_code ?? undefined
      };
      return result;
    } catch (error) {
      throw createDatabaseError('Failed to get user by ID', error);
    }
  }
  
  // Update user using Prisma ORM
  static async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      const prisma = getPrismaClient();

      // Remove user_id from updates as it's not updatable
      const { user_id, ...updateData } = updates;

      const user = await prisma.users.update({
        where: { user_id: id },
        data: {
          ...updateData,
          updated_at: new Date()
        } as any
      });

      return {
        ...user,
        email_verified_at: user.email_verified_at?.toISOString(),
        password_reset_expires: user.password_reset_expires?.toISOString(),
        locked_until: user.locked_until?.toISOString(),
        last_login_at: user.last_login_at?.toISOString(),
        created_at: user.created_at?.toISOString() ?? new Date().toISOString(),
        updated_at: user.updated_at?.toISOString() ?? new Date().toISOString()
      } as User;
    } catch (error) {
      throw createDatabaseError('Failed to update user', error);
    }
  }
  
  // =====================================================================================
  // RAW SQL METHODS - For complex queries (converted from existing MySQL queries)
  // =====================================================================================
  
  // Get user by ID with role information (using converted raw SQL)
  static async getUserById(id: number): Promise<UserDetails | null> {
    try {
      const query = `
        SELECT
          u.user_id,
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
          r.role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?
      `;
      
      // Use the migration service to convert and execute the query
      return await SQLMigrationService.executeConvertedQuerySingle<UserDetails>(query, [id]);
    } catch (error) {
      throw createDatabaseError('Failed to get user by ID', error);
    }
  }
  
  // Get user by email (using converted raw SQL)
  static async getUserByEmail(email: string): Promise<UserDetails | null> {
    try {
      const query = `
        SELECT
          u.user_id,
          u.name,
          u.email,
          u.password,
          u.password_changed_at,
          u.role_id,
          u.admin_level,
          u.province_code,
          u.district_code,
          u.municipal_code,
          u.ward_code,
          u.is_active,
          u.failed_login_attempts,
          u.locked_until,
          u.mfa_enabled,
          u.created_at,
          u.updated_at,
          r.role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = ?
      `;
      
      return await SQLMigrationService.executeConvertedQuerySingle<UserDetails>(query, [email]);
    } catch (error) {
      throw createDatabaseError('Failed to get user by email', error);
    }
  }
  
  // Get users by admin level (using converted raw SQL)
  static async getUsersByAdminLevel(adminLevel: string): Promise<UserDetails[]> {
    try {
      const query = `
        SELECT
          u.user_id,
          u.name,
          u.email,
          u.admin_level,
          u.province_code,
          u.district_code,
          u.municipal_code,
          u.ward_code,
          u.is_active,
          u.created_at,
          p.province_name,
          d.district_name,
          m.municipality_name,
          w.ward_name
        FROM users u
        LEFT JOIN provinces p ON u.province_code = p.province_code
        LEFT JOIN districts d ON u.district_code = d.district_code
        LEFT JOIN municipalities m ON u.municipal_code = m.municipality_code
        LEFT JOIN wards w ON u.ward_code = w.ward_code
        WHERE u.admin_level = ?
        ORDER BY u.name
      `;
      
      return await SQLMigrationService.executeConvertedQuery<UserDetails>(query, [adminLevel]);
    } catch (error) {
      throw createDatabaseError('Failed to get users by admin level', error);
    }
  }
  
  // =====================================================================================
  // AUTHENTICATION METHODS
  // =====================================================================================
  
  // Verify user password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Update login tracking
  static async updateLoginTracking(userId: number, ipAddress: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      await prisma.users.update({
        where: { user_id: userId },
        data: {
          last_login_at: new Date(),
          last_login_ip: ipAddress,
          failed_login_attempts: 0, // Reset failed attempts on successful login
          locked_until: null // Clear any locks
        }
      });
    } catch (error) {
      throw createDatabaseError('Failed to update login tracking', error);
    }
  }
  
  // Increment failed login attempts
  static async incrementFailedLoginAttempts(userId: number): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      await prisma.users.update({
        where: { user_id: userId },
        data: {
          failed_login_attempts: {
            increment: 1
          }
        }
      });
    } catch (error) {
      throw createDatabaseError('Failed to increment failed login attempts', error);
    }
  }
  
  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================
  
  // Test both Prisma and Raw SQL approaches
  static async testHybridApproach(userId: number): Promise<{
    prismaResult: UserDetails | null;
    rawSqlResult: UserDetails | null;
    match: boolean;
  }> {
    try {
      const [prismaResult, rawSqlResult] = await Promise.all([
        this.getUserByIdPrisma(userId),
        this.getUserById(userId)
      ]);
      
      const match = JSON.stringify(prismaResult?.user_id) === JSON.stringify(rawSqlResult?.user_id);
      
      return {
        prismaResult,
        rawSqlResult,
        match
      };
    } catch (error) {
      throw createDatabaseError('Failed to test hybrid approach', error);
    }
  }
}
