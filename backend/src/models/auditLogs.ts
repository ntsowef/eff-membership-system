import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Audit log interfaces
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export interface AuditLogDetails extends AuditLog {
  user_name?: string;
  user_email?: string;
}

export interface CreateAuditLogData {
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

export interface AuditLogFilters {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  ip_address?: string;
  created_after?: string;
  created_before?: string;
  search?: string;
}

// Common audit actions
export enum AuditAction {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',

  // CRUD actions
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',

  // Application actions
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_REVIEWED = 'application_reviewed',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',

  // Member actions
  MEMBER_ACTIVATED = 'member_activated',
  MEMBER_SUSPENDED = 'member_suspended',
  MEMBER_TRANSFERRED = 'member_transferred',

  // Document actions
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_DELETED = 'document_deleted',

  // System actions
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_RESTORE = 'system_restore',
  SYSTEM_MAINTENANCE = 'system_maintenance',

  // Administrative actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked'
}

// Entity types
export enum EntityType {
  USER = 'user',
  MEMBER = 'member',
  MEMBERSHIP = 'membership',
  APPLICATION = 'membership_application',
  DOCUMENT = 'document',
  NOTIFICATION = 'notification',
  ROLE = 'role',
  PERMISSION = 'permission',
  PROVINCE = 'province',
  REGION = 'region',
  MUNICIPALITY = 'municipality',
  WARD = 'ward',
  SYSTEM = 'system'
}

// Audit log model class
export class AuditLogModel {
  // Create new audit log entry
  static async createAuditLog(auditData: CreateAuditLogData): Promise<number> {
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, old_values,
          new_values, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        auditData.user_id || null,
        auditData.action,
        auditData.entity_type,
        auditData.entity_id || null,
        auditData.old_values ? JSON.stringify(auditData.old_values) : null,
        auditData.new_values ? JSON.stringify(auditData.new_values) : null,
        auditData.ip_address || null,
        auditData.user_agent || null,
        auditData.session_id || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      // Don't throw errors for audit logging to prevent disrupting main operations
      console.error('Failed to create audit log:', error);
      return 0;
    }
  }

  // Get audit log by ID with details
  static async getAuditLogById(id: number): Promise<AuditLogDetails | null> {
    try {
      const query = `
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.id = ?
      `;

      const auditLog = await executeQuerySingle<AuditLogDetails>(query, [id]);
      
      if (auditLog) {
        // Parse JSON fields
        if (auditLog.old_values) {
          try {
            auditLog.old_values = JSON.parse(auditLog.old_values);
          } catch (error) {
            console.warn('Failed to parse old_values for audit log', id);
          }
        }
        
        if (auditLog.new_values) {
          try {
            auditLog.new_values = JSON.parse(auditLog.new_values);
          } catch (error) {
            console.warn('Failed to parse new_values for audit log', id);
          }
        }
      }

      return auditLog;
    } catch (error) {
      throw createDatabaseError('Failed to fetch audit log', error);
    }
  }

  // Get audit logs with filtering and pagination
  static async getAuditLogs(
    limit: number = 50,
    offset: number = 0,
    filters: AuditLogFilters = {}
  ): Promise<AuditLogDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.user_id) {
        whereClause += ' AND al.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.action) {
        whereClause += ' AND al.action = ?';
        params.push(filters.action);
      }

      if (filters.entity_type) {
        whereClause += ' AND al.entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.entity_id) {
        whereClause += ' AND al.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.ip_address) {
        whereClause += ' AND al.ip_address = ?';
        params.push(filters.ip_address);
      }

      if (filters.created_after) {
        whereClause += ' AND al.created_at >= ?';
        params.push(filters.created_after);
      }

      if (filters.created_before) {
        whereClause += ' AND al.created_at <= ?';
        params.push(filters.created_before);
      }

      if (filters.search) {
        whereClause += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const auditLogs = await executeQuery<AuditLogDetails>(query, params);

      // Parse JSON fields for each audit log
      auditLogs.forEach(auditLog => {
        if (auditLog.old_values) {
          try {
            auditLog.old_values = JSON.parse(auditLog.old_values);
          } catch (error) {
            console.warn('Failed to parse old_values for audit log', auditLog.id);
          }
        }
        
        if (auditLog.new_values) {
          try {
            auditLog.new_values = JSON.parse(auditLog.new_values);
          } catch (error) {
            console.warn('Failed to parse new_values for audit log', auditLog.id);
          }
        }
      });

      return auditLogs;
    } catch (error) {
      throw createDatabaseError('Failed to fetch audit logs', error);
    }
  }

  // Get audit log count with filters
  static async getAuditLogCount(filters: AuditLogFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.user_id) {
        whereClause += ' AND al.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.action) {
        whereClause += ' AND al.action = ?';
        params.push(filters.action);
      }

      if (filters.entity_type) {
        whereClause += ' AND al.entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.entity_id) {
        whereClause += ' AND al.entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.ip_address) {
        whereClause += ' AND al.ip_address = ?';
        params.push(filters.ip_address);
      }

      if (filters.created_after) {
        whereClause += ' AND al.created_at >= ?';
        params.push(filters.created_after);
      }

      if (filters.created_before) {
        whereClause += ' AND al.created_at <= ?';
        params.push(filters.created_before);
      }

      if (filters.search) {
        whereClause += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const query = `
        SELECT COUNT(*) as count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
      `;

      const result = await executeQuerySingle<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get audit log count', error);
    }
  }

  // Get audit logs for specific entity
  static async getEntityAuditLogs(entityType: string, entityId: number): Promise<AuditLogDetails[]> {
    try {
      return await this.getAuditLogs(100, 0, { entity_type: entityType, entity_id: entityId });
    } catch (error) {
      throw createDatabaseError('Failed to fetch entity audit logs', error);
    }
  }

  // Get user activity logs
  static async getUserActivityLogs(userId: number, limit: number = 50): Promise<AuditLogDetails[]> {
    try {
      return await this.getAuditLogs(limit, 0, { user_id: userId });
    } catch (error) {
      throw createDatabaseError('Failed to fetch user activity logs', error);
    }
  }

  // Get recent activity (last 24 hours)
  static async getRecentActivity(limit: number = 100): Promise<AuditLogDetails[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      return await this.getAuditLogs(limit, 0, { 
        created_after: yesterday.toISOString() 
      });
    } catch (error) {
      throw createDatabaseError('Failed to fetch recent activity', error);
    }
  }

  // Get audit statistics
  static async getAuditStatistics(filters: { created_after?: string; created_before?: string } = {}): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.created_after) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.created_after);
      }

      if (filters.created_before) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.created_before);
      }

      const query = `
        SELECT 
          COUNT(*) as total_actions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          action,
          entity_type,
          COUNT(*) as action_count
        FROM audit_logs
        ${whereClause}
        GROUP BY action, entity_type
        ORDER BY action_count DESC
      `;

      const results = await executeQuery(query, params);
      
      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_actions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT entity_type) as entity_types_affected
        FROM audit_logs
        ${whereClause}
      `;

      const summary = await executeQuerySingle(summaryQuery, params);

      return {
        summary,
        action_breakdown: results
      };
    } catch (error) {
      throw createDatabaseError('Failed to get audit statistics', error);
    }
  }

  // Clean up old audit logs (older than specified days)
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const query = 'DELETE FROM audit_logs WHERE created_at < ?';
      const result = await executeQuery(query, [cutoffDate.toISOString()]);

      console.log(`Cleaned up ${result.affectedRows} audit log entries older than ${daysToKeep} days`);
      return result.affectedRows;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }
}
