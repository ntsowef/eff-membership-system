import { executeQuery, executeQuerySingle } from '../config/database';
import { cacheService } from './cacheService';
import { redisService } from './redisService';

export interface MaintenanceMode {
  id: number;
  is_enabled: boolean;
  maintenance_message: string;
  maintenance_level: 'full_system' | 'api_only' | 'frontend_only' | 'specific_modules';
  affected_modules: string[] | null;
  scheduled_start: Date | null;
  scheduled_end: Date | null;
  auto_enable: boolean;
  auto_disable: boolean;
  bypass_admin_users: boolean;
  bypass_roles: string[] | null;
  bypass_ip_addresses: string[] | null;
  bypass_user_ids: number[] | null;
  enabled_by: number | null;
  disabled_by: number | null;
  enabled_at: Date | null;
  disabled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceStatus {
  is_enabled: boolean;
  status: 'active' | 'scheduled' | 'should_be_active' | 'inactive';
  maintenance_message: string;
  maintenance_level: string;
  minutes_until_start: number | null;
  minutes_until_end: number | null;
  enabled_by_name: string | null;
  enabled_by_email: string | null;
}

export interface BypassCheck {
  canBypass: boolean;
  reason: string;
}

export class MaintenanceModeService {
  private static readonly CACHE_KEY = 'maintenance_mode_status';
  private static readonly CACHE_TTL = 60; // 1 minute cache

  /**
   * Get current maintenance mode status with caching
   */
  static async getCurrentStatus(): Promise<MaintenanceStatus | null> {
    try {
      // Try Redis first
      if (redisService.isRedisConnected()) {
        const cached = await redisService.get(this.CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } else {
        // Fallback to memory cache
        const cached = await cacheService.get(this.CACHE_KEY);
        if (cached) {
          return cached as MaintenanceStatus;
        }
      }

      // Get from database
      const status = await executeQuerySingle(`
        SELECT * FROM vw_current_maintenance_status
      `);

      if (status) {
        const maintenanceStatus: MaintenanceStatus = {
          is_enabled: status.is_enabled,
          status: status.status,
          maintenance_message: status.maintenance_message,
          maintenance_level: status.maintenance_level,
          minutes_until_start: status.minutes_until_start,
          minutes_until_end: status.minutes_until_end,
          enabled_by_name: status.enabled_by_name,
          enabled_by_email: status.enabled_by_email
        };

        // Cache the result
        if (redisService.isRedisConnected()) {
          await redisService.set(this.CACHE_KEY, JSON.stringify(maintenanceStatus), this.CACHE_TTL);
        } else {
          await cacheService.set(this.CACHE_KEY, maintenanceStatus, this.CACHE_TTL);
        }

        return maintenanceStatus;
      }

      return null;
    } catch (error) {
      console.error('Error getting maintenance status:', error);
      return null;
    }
  }

  /**
   * Check if a user can bypass maintenance mode
   */
  static async canUserBypass(
    userId: number | null,
    userRole: string | null,
    adminLevel: string | null,
    ipAddress: string
  ): Promise<BypassCheck> {
    try {
      const maintenanceMode = await executeQuerySingle(`
        SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1
      `);

      if (!maintenanceMode || !maintenanceMode.is_enabled) {
        return { canBypass: true, reason: 'maintenance_not_active' };
      }

      // Check admin user bypass
      if (maintenanceMode.bypass_admin_users && adminLevel) {
        const adminLevels = ['super_admin', 'national', 'province', 'district', 'municipality', 'ward'];
        if (adminLevels.includes(adminLevel)) {
          return { canBypass: true, reason: 'admin_user_bypass' };
        }
      }

      // Check role bypass
      if (maintenanceMode.bypass_roles && userRole) {
        const bypassRoles = JSON.parse(maintenanceMode.bypass_roles || '[]');
        if (bypassRoles.includes(userRole)) {
          return { canBypass: true, reason: 'role_bypass' };
        }
      }

      // Check specific user ID bypass
      if (maintenanceMode.bypass_user_ids && userId) {
        const bypassUserIds = JSON.parse(maintenanceMode.bypass_user_ids || '[]');
        if (bypassUserIds.includes(userId)) {
          return { canBypass: true, reason: 'user_id_bypass' };
        }
      }

      // Check IP address bypass
      if (maintenanceMode.bypass_ip_addresses) {
        const bypassIPs = JSON.parse(maintenanceMode.bypass_ip_addresses || '[]');
        if (bypassIPs.includes(ipAddress)) {
          return { canBypass: true, reason: 'ip_address_bypass' };
        }
      }

      return { canBypass: false, reason: 'no_bypass_permission' };
    } catch (error) {
      console.error('Error checking user bypass:', error);
      return { canBypass: false, reason: 'error_checking_bypass' };
    }
  }

  /**
   * Enable maintenance mode
   */
  static async enableMaintenanceMode(
    userId: number,
    message?: string,
    level: string = 'full_system',
    scheduledEnd?: Date,
    affectedModules?: string[]
  ): Promise<boolean> {
    try {
      await executeQuery(`
        UPDATE maintenance_mode 
        SET 
          is_enabled = TRUE,
          maintenance_message = ?,
          maintenance_level = ?,
          scheduled_end = ?,
          affected_modules = ?,
          enabled_by = ?,
          enabled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        ORDER BY id DESC 
        LIMIT 1
      `, [
        message || 'The system is currently under maintenance. Please check back shortly.',
        level,
        scheduledEnd || null,
        affectedModules ? JSON.stringify(affectedModules) : null,
        userId
      ]);

      // Log the action
      await this.logMaintenanceAction('enabled', userId, {
        maintenance_level: level,
        message,
        scheduled_end: scheduledEnd,
        affected_modules: affectedModules
      });

      // Clear cache
      await this.clearCache();

      return true;
    } catch (error) {
      console.error('Error enabling maintenance mode:', error);
      return false;
    }
  }

  /**
   * Disable maintenance mode
   */
  static async disableMaintenanceMode(userId: number): Promise<boolean> {
    try {
      await executeQuery(`
        UPDATE maintenance_mode 
        SET 
          is_enabled = FALSE,
          disabled_by = ?,
          disabled_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        ORDER BY id DESC 
        LIMIT 1
      `, [userId]);

      // Log the action
      await this.logMaintenanceAction('disabled', userId);

      // Clear cache
      await this.clearCache();

      return true;
    } catch (error) {
      console.error('Error disabling maintenance mode:', error);
      return false;
    }
  }

  /**
   * Schedule maintenance mode
   */
  static async scheduleMaintenanceMode(
    userId: number,
    scheduledStart: Date,
    scheduledEnd: Date,
    message?: string,
    level: string = 'full_system',
    affectedModules?: string[]
  ): Promise<boolean> {
    try {
      await executeQuery(`
        UPDATE maintenance_mode 
        SET 
          scheduled_start = ?,
          scheduled_end = ?,
          maintenance_message = ?,
          maintenance_level = ?,
          affected_modules = ?,
          auto_enable = TRUE,
          auto_disable = TRUE,
          enabled_by = ?,
          updated_at = CURRENT_TIMESTAMP
        ORDER BY id DESC 
        LIMIT 1
      `, [
        scheduledStart,
        scheduledEnd,
        message || 'The system is currently under maintenance. Please check back shortly.',
        level,
        affectedModules ? JSON.stringify(affectedModules) : null,
        userId
      ]);

      // Log the action
      await this.logMaintenanceAction('scheduled', userId, {
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        maintenance_level: level,
        message,
        affected_modules: affectedModules
      });

      // Clear cache
      await this.clearCache();

      return true;
    } catch (error) {
      console.error('Error scheduling maintenance mode:', error);
      return false;
    }
  }

  /**
   * Log maintenance mode actions
   */
  private static async logMaintenanceAction(
    action: string,
    userId: number,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Get user info
      const user = await executeQuerySingle(`
        SELECT email FROM users WHERE id = ? `, [userId]);

      await executeQuery(`
        INSERT INTO maintenance_mode_logs (
          action, maintenance_level, message, scheduled_start, scheduled_end,
          bypass_settings, user_id, user_email, ip_address, user_agent
        ) EXCLUDED.?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      `, [
        action,
        details?.maintenance_level || null,
        details?.message || null,
        details?.scheduled_start || null,
        details?.scheduled_end || null,
        details ? JSON.stringify(details)  : null,
        userId,
        user?.email || null,
        ipAddress || null,
        userAgent || null
      ]);
    } catch (error) {
      console.error('Error logging maintenance action:', error);
    }
  }

  /**
   * Clear maintenance mode cache
   */
  private static async clearCache(): Promise<void> {
    try {
      if (redisService.isRedisConnected()) {
        await redisService.del(this.CACHE_KEY);
      } else {
        await cacheService.del(this.CACHE_KEY);
      }
    } catch (error) {
      console.error('Error clearing maintenance cache:', error);
    }
  }

  /**
   * Check and handle scheduled maintenance
   */
  static async checkScheduledMaintenance(): Promise<void> {
    try {
      const maintenanceMode = await executeQuerySingle(`
        SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1
      `);

      if (!maintenanceMode) return;

      const now = new Date();

      // Check if scheduled maintenance should start
      if (
        !maintenanceMode.is_enabled &&
        maintenanceMode.scheduled_start &&
        maintenanceMode.auto_enable &&
        new Date(maintenanceMode.scheduled_start) <= now
      ) {
        await executeQuery(`
          UPDATE maintenance_mode 
          SET is_enabled = TRUE, enabled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? `, [maintenanceMode.id]);

        await this.logMaintenanceAction('auto_enabled', maintenanceMode.enabled_by || 0);
        await this.clearCache();
      }

      // Check if scheduled maintenance should end
      if (
        maintenanceMode.is_enabled &&
        maintenanceMode.scheduled_end &&
        maintenanceMode.auto_disable &&
        new Date(maintenanceMode.scheduled_end) <= now
      ) {
        await executeQuery(`
          UPDATE maintenance_mode 
          SET is_enabled = FALSE, disabled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [maintenanceMode.id]);

        await this.logMaintenanceAction('auto_disabled', maintenanceMode.enabled_by || 0);
        await this.clearCache();
      }
    } catch (error) {
      console.error('Error checking scheduled maintenance : ', error);
    }
  }
}
