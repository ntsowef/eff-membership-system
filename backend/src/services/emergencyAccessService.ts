import { executeQuery } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';

/**
 * Emergency Access Service for MFA Bypass Management
 * Handles both Option A (Bypass Permissions) and Option B (Emergency Access Requests)
 */

export interface BypassPermission {
  bypass_id: number;
  user_id: number;
  granted_by_user_id: number;
  reason: string;
  granted_at: Date;
  expires_at: Date;
  revoked_at?: Date;
  revoked_by_user_id?: number;
  revocation_reason?: string;
  is_active: boolean;
}

export interface EmergencyAccessRequest {
  request_id: number;
  user_id: number;
  reason: string;
  contact_phone?: string;
  contact_email?: string;
  urgency_level: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
  requested_at: Date;
  reviewed_at?: Date;
  reviewed_by_user_id?: number;
  review_notes?: string;
  bypass_duration_hours: number;
  bypass_permission_id?: number;
}

export class EmergencyAccessService {
  
  // ============================================
  // OPTION A: Bypass Permissions (National Admin grants)
  // ============================================

  /**
   * Check if user has active bypass permission
   */
  static async hasActiveBypass(userId: number): Promise<boolean> {
    try {
      const query = `
        SELECT bypass_id FROM mfa_bypass_permissions
        WHERE user_id = $1
          AND is_active = TRUE
          AND expires_at > CURRENT_TIMESTAMP
          AND revoked_at IS NULL
        LIMIT 1
      `;
      const result = await executeQuery(query, [userId]);
      return result.length > 0;
    } catch (error) {
      console.error('❌ Error checking bypass permission:', error);
      return false;
    }
  }

  /**
   * Get active bypass permission for user
   */
  static async getActiveBypass(userId: number): Promise<BypassPermission | null> {
    try {
      const query = `
        SELECT * FROM mfa_bypass_permissions
        WHERE user_id = $1
          AND is_active = TRUE
          AND expires_at > CURRENT_TIMESTAMP
          AND revoked_at IS NULL
        ORDER BY granted_at DESC
        LIMIT 1
      `;
      const result = await executeQuery(query, [userId]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ Error getting bypass permission:', error);
      return null;
    }
  }

  /**
   * Grant bypass permission to user (National Admin only)
   */
  static async grantBypassPermission(
    userId: number,
    grantedByUserId: number,
    reason: string,
    durationHours: number = 24,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BypassPermission> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      const query = `
        INSERT INTO mfa_bypass_permissions (
          user_id, granted_by_user_id, reason, expires_at, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await executeQuery(query, [
        userId, grantedByUserId, reason, expiresAt, ipAddress, userAgent
      ]);

      // Audit log
      await this.logAuditEvent('BYPASS_GRANTED', grantedByUserId, userId, result[0].bypass_id, null, {
        reason, duration_hours: durationHours, expires_at: expiresAt
      }, ipAddress, userAgent);

      console.log(`✅ Bypass permission granted to user ${userId} by ${grantedByUserId}, expires ${expiresAt}`);
      return result[0];
    } catch (error) {
      console.error('❌ Error granting bypass permission:', error);
      throw createDatabaseError('Failed to grant bypass permission', error);
    }
  }

  /**
   * Revoke bypass permission (National Admin only)
   */
  static async revokeBypassPermission(
    bypassId: number,
    revokedByUserId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE mfa_bypass_permissions
        SET is_active = FALSE,
            revoked_at = CURRENT_TIMESTAMP,
            revoked_by_user_id = $2,
            revocation_reason = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE bypass_id = $1 AND is_active = TRUE
        RETURNING user_id
      `;

      const result = await executeQuery(query, [bypassId, revokedByUserId, reason]);
      
      if (result.length > 0) {
        await this.logAuditEvent('BYPASS_REVOKED', revokedByUserId, result[0].user_id, bypassId, null, {
          reason
        }, ipAddress, userAgent);
        console.log(`✅ Bypass permission ${bypassId} revoked by ${revokedByUserId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error revoking bypass permission:', error);
      throw createDatabaseError('Failed to revoke bypass permission', error);
    }
  }

  /**
   * List all active bypass permissions (National Admin only)
   */
  static async listActiveBypassPermissions(): Promise<any[]> {
    try {
      const query = `
        SELECT bp.*,
               u.name as user_name, u.email as user_email, u.admin_level,
               g.name as granted_by_name
        FROM mfa_bypass_permissions bp
        JOIN users u ON bp.user_id = u.user_id
        JOIN users g ON bp.granted_by_user_id = g.user_id
        WHERE bp.is_active = TRUE
          AND bp.expires_at > CURRENT_TIMESTAMP
          AND bp.revoked_at IS NULL
        ORDER BY bp.granted_at DESC
      `;
      return await executeQuery(query, []);
    } catch (error) {
      console.error('❌ Error listing bypass permissions:', error);
      return [];
    }
  }

  // ============================================
  // OPTION B: Emergency Access Requests (Provincial Admin requests)
  // ============================================

  /**
   * Create emergency access request (Provincial Admin)
   */
  static async createEmergencyRequest(
    userId: number,
    reason: string,
    urgencyLevel: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    contactPhone?: string,
    contactEmail?: string,
    bypassDurationHours: number = 24,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmergencyAccessRequest> {
    try {
      // Check for existing pending request
      const existingQuery = `
        SELECT request_id FROM mfa_emergency_access_requests
        WHERE user_id = $1 AND status = 'pending'
        LIMIT 1
      `;
      const existing = await executeQuery(existingQuery, [userId]);

      if (existing.length > 0) {
        throw new Error('You already have a pending emergency access request');
      }

      const query = `
        INSERT INTO mfa_emergency_access_requests (
          user_id, reason, urgency_level, contact_phone, contact_email,
          bypass_duration_hours, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await executeQuery(query, [
        userId, reason, urgencyLevel, contactPhone, contactEmail,
        bypassDurationHours, ipAddress, userAgent
      ]);

      await this.logAuditEvent('REQUEST_CREATED', userId, userId, null, result[0].request_id, {
        reason, urgency_level: urgencyLevel
      }, ipAddress, userAgent);

      console.log(`✅ Emergency access request created by user ${userId}`);
      return result[0];
    } catch (error) {
      console.error('❌ Error creating emergency request:', error);
      throw createDatabaseError('Failed to create emergency access request', error);
    }
  }

  /**
   * Get pending emergency requests (National Admin only)
   */
  static async getPendingRequests(): Promise<any[]> {
    try {
      const query = `
        SELECT ear.*,
               u.name as user_name, u.email as user_email,
               u.admin_level, u.province_code
        FROM mfa_emergency_access_requests ear
        JOIN users u ON ear.user_id = u.user_id
        WHERE ear.status = 'pending'
        ORDER BY
          CASE ear.urgency_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
          END,
          ear.requested_at ASC
      `;
      return await executeQuery(query, []);
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      return [];
    }
  }

  /**
   * Approve emergency request and create bypass (National Admin)
   */
  static async approveRequest(
    requestId: number,
    reviewedByUserId: number,
    reviewNotes?: string,
    durationHours?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ request: EmergencyAccessRequest; bypass: BypassPermission }> {
    try {
      const getQuery = `SELECT * FROM mfa_emergency_access_requests WHERE request_id = $1 AND status = 'pending'`;
      const requestResult = await executeQuery(getQuery, [requestId]);

      if (requestResult.length === 0) {
        throw new Error('Request not found or already processed');
      }

      const request = requestResult[0];
      const bypassDuration = durationHours || request.bypass_duration_hours || 24;

      // Create bypass permission
      const bypass = await this.grantBypassPermission(
        request.user_id, reviewedByUserId,
        `Emergency Access Request #${requestId}: ${request.reason}`,
        bypassDuration, ipAddress, userAgent
      );

      // Update request status
      const updateQuery = `
        UPDATE mfa_emergency_access_requests
        SET status = 'approved',
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by_user_id = $2,
            review_notes = $3,
            bypass_permission_id = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $1
        RETURNING *
      `;

      const updatedRequest = await executeQuery(updateQuery, [
        requestId, reviewedByUserId, reviewNotes, bypass.bypass_id
      ]);

      await this.logAuditEvent('REQUEST_APPROVED', reviewedByUserId, request.user_id, bypass.bypass_id, requestId, {
        review_notes: reviewNotes, duration_hours: bypassDuration
      }, ipAddress, userAgent);

      console.log(`✅ Emergency request ${requestId} approved by ${reviewedByUserId}`);
      return { request: updatedRequest[0], bypass };
    } catch (error) {
      console.error('❌ Error approving request:', error);
      throw createDatabaseError('Failed to approve emergency request', error);
    }
  }

  /**
   * Deny emergency request (National Admin)
   */
  static async denyRequest(
    requestId: number,
    reviewedByUserId: number,
    reviewNotes: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<EmergencyAccessRequest> {
    try {
      const query = `
        UPDATE mfa_emergency_access_requests
        SET status = 'denied',
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by_user_id = $2,
            review_notes = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $1 AND status = 'pending'
        RETURNING *
      `;

      const result = await executeQuery(query, [requestId, reviewedByUserId, reviewNotes]);

      if (result.length === 0) {
        throw new Error('Request not found or already processed');
      }

      await this.logAuditEvent('REQUEST_DENIED', reviewedByUserId, result[0].user_id, null, requestId, {
        review_notes: reviewNotes
      }, ipAddress, userAgent);

      console.log(`❌ Emergency request ${requestId} denied by ${reviewedByUserId}`);
      return result[0];
    } catch (error) {
      console.error('❌ Error denying request:', error);
      throw createDatabaseError('Failed to deny emergency request', error);
    }
  }

  /**
   * Get user's emergency requests history
   */
  static async getUserRequestHistory(userId: number): Promise<any[]> {
    try {
      const query = `
        SELECT ear.*, r.name as reviewed_by_name
        FROM mfa_emergency_access_requests ear
        LEFT JOIN users r ON ear.reviewed_by_user_id = r.user_id
        WHERE ear.user_id = $1
        ORDER BY ear.requested_at DESC
        LIMIT 10
      `;
      return await executeQuery(query, [userId]);
    } catch (error) {
      console.error('❌ Error getting user request history:', error);
      return [];
    }
  }

  // ============================================
  // Audit Logging
  // ============================================

  private static async logAuditEvent(
    action: string,
    userId: number,
    targetUserId: number,
    bypassId: number | null,
    requestId: number | null,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO mfa_emergency_access_audit_log (
          action, user_id, target_user_id, bypass_id, request_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await executeQuery(query, [
        action, userId, targetUserId, bypassId, requestId,
        JSON.stringify(details), ipAddress, userAgent
      ]);
    } catch (error) {
      console.error('❌ Error logging audit event:', error);
    }
  }

  /**
   * Get audit log for emergency access operations
   */
  static async getAuditLog(limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT eal.*, u.name as user_name, t.name as target_user_name
        FROM mfa_emergency_access_audit_log eal
        LEFT JOIN users u ON eal.user_id = u.user_id
        LEFT JOIN users t ON eal.target_user_id = t.user_id
        ORDER BY eal.created_at DESC
        LIMIT $1
      `;
      return await executeQuery(query, [limit]);
    } catch (error) {
      console.error('❌ Error getting audit log:', error);
      return [];
    }
  }
}
