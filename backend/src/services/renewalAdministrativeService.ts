import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * Renewal Administrative Service
 * Handles manual renewal processing, approval workflows, audit trails, and bulk operations
 */

// =====================================================================================
// INTERFACES
// =====================================================================================

export interface RenewalApproval {
  approval_id: number;
  renewal_id: number;
  member_id: number;
  approval_status: string;
  approval_level: string;
  requires_manual_review: boolean;
  review_reason?: string;
  review_priority: string;
  assigned_to?: number;
  reviewed_by?: number;
  approved_by?: number;
  rejected_by?: number;
  approval_notes?: string;
  rejection_reason?: string;
  admin_comments?: string;
  submitted_at: Date;
  assigned_at?: Date;
  reviewed_at?: Date;
  approved_at?: Date;
  rejected_at?: Date;
}

export interface RenewalAuditEntry {
  audit_id: number;
  renewal_id: number;
  member_id: number;
  action_type: string;
  action_category: string;
  action_description: string;
  previous_status?: string;
  new_status?: string;
  performed_by?: number;
  user_role?: string;
  ip_address?: string;
  created_at: Date;
}

export interface BulkOperation {
  operation_id: number;
  operation_uuid: string;
  operation_type: string;
  operation_status: string;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  progress_percentage: number;
  initiated_by: number;
  queued_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface ManualNote {
  note_id: number;
  renewal_id: number;
  member_id: number;
  note_type: string;
  note_priority: string;
  note_content: string;
  is_internal: boolean;
  requires_follow_up: boolean;
  follow_up_date?: Date;
  created_by: number;
  created_at: Date;
}

// =====================================================================================
// APPROVAL WORKFLOW METHODS
// =====================================================================================

export class RenewalAdministrativeService {
  
  /**
   * Get renewals pending approval
   */
  static async getRenewalsPendingApproval(filters?: {
    priority?: string;
    level?: string;
    assignedTo?: number;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM vw_renewals_pending_approval
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.priority) {
        query += ` AND review_priority = $${params.length + 1}`;
        params.push(filters.priority);
      }

      if (filters?.level) {
        query += ` AND approval_level = $${params.length + 1}`;
        params.push(filters.level);
      }

      if (filters?.assignedTo) {
        query += ` AND assigned_to = $${params.length + 1}`;
        params.push(filters.assignedTo);
      }

      query += ` LIMIT $${params.length + 1}`;
      params.push(filters?.limit || 50);

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get renewals pending approval', error);
    }
  }

  /**
   * Create approval request for a renewal
   */
  static async createApprovalRequest(data: {
    renewal_id: number;
    member_id: number;
    review_reason?: string;
    review_priority?: string;
    assigned_to?: number;
  }): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_approvals (
          renewal_id, member_id, requires_manual_review, review_reason,
          review_priority, assigned_to, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING approval_id
      `;

      const params = [
        data.renewal_id,
        data.member_id,
        true,
        data.review_reason || 'Manual review required',
        data.review_priority || 'Normal',
        data.assigned_to || null
      ];

      const result = await executeQuerySingle<{ approval_id: number }>(query, params);

      if (!result) {
        throw createDatabaseError('Failed to create approval request - no result returned');
      }

      // Log audit trail
      await this.logAuditTrail({
        renewal_id: data.renewal_id,
        member_id: data.member_id,
        action_type: 'approval_request_created',
        action_category: 'Approval',
        action_description: 'Approval request created for manual review',
        new_status: 'Pending'
      });

      return result.approval_id;
    } catch (error) {
      throw createDatabaseError('Failed to create approval request', error);
    }
  }

  /**
   * Approve a renewal
   */
  static async approveRenewal(data: {
    approval_id: number;
    approved_by: number;
    approval_notes?: string;
  }): Promise<void> {
    try {
      // Update approval record
      const updateQuery = `
        UPDATE renewal_approvals
        SET approval_status = 'Approved',
            approved_by = $1,
            approval_notes = $2,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE approval_id = $3
        RETURNING renewal_id, member_id
      `;

      const result = await executeQuerySingle<{ renewal_id: number; member_id: number }>(
        updateQuery,
        [data.approved_by, data.approval_notes || null, data.approval_id]
      );

      if (!result) {
        throw createDatabaseError('Failed to approve renewal - no result returned');
      }

      // Update renewal status
      await executeQuery(
        `UPDATE membership_renewals SET renewal_status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE renewal_id = $1`,
        [result.renewal_id]
      );

      // Log audit trail
      await this.logAuditTrail({
        renewal_id: result.renewal_id,
        member_id: result.member_id,
        action_type: 'renewal_approved',
        action_category: 'Approval',
        action_description: `Renewal approved by admin`,
        previous_status: 'Pending',
        new_status: 'Approved',
        performed_by: data.approved_by
      });
    } catch (error) {
      throw createDatabaseError('Failed to approve renewal', error);
    }
  }

  /**
   * Reject a renewal
   */
  static async rejectRenewal(data: {
    approval_id: number;
    rejected_by: number;
    rejection_reason: string;
  }): Promise<void> {
    try {
      // Update approval record
      const updateQuery = `
        UPDATE renewal_approvals
        SET approval_status = 'Rejected',
            rejected_by = $1,
            rejection_reason = $2,
            rejected_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE approval_id = $3
        RETURNING renewal_id, member_id
      `;

      const result = await executeQuerySingle<{ renewal_id: number; member_id: number }>(
        updateQuery,
        [data.rejected_by, data.rejection_reason, data.approval_id]
      );

      if (!result) {
        throw createDatabaseError('Failed to reject renewal - no result returned');
      }

      // Update renewal status
      await executeQuery(
        `UPDATE membership_renewals SET renewal_status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE renewal_id = $1`,
        [result.renewal_id]
      );

      // Log audit trail
      await this.logAuditTrail({
        renewal_id: result.renewal_id,
        member_id: result.member_id,
        action_type: 'renewal_rejected',
        action_category: 'Approval',
        action_description: `Renewal rejected: ${data.rejection_reason}`,
        previous_status: 'Pending',
        new_status: 'Rejected',
        performed_by: data.rejected_by
      });
    } catch (error) {
      throw createDatabaseError('Failed to reject renewal', error);
    }
  }

  // =====================================================================================
  // AUDIT TRAIL METHODS
  // =====================================================================================

  /**
   * Log audit trail entry
   */
  static async logAuditTrail(data: {
    renewal_id: number;
    member_id: number;
    action_type: string;
    action_category: string;
    action_description: string;
    previous_status?: string;
    new_status?: string;
    previous_payment_status?: string;
    new_payment_status?: string;
    previous_amount?: number;
    new_amount?: number;
    performed_by?: number;
    user_role?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    metadata?: any;
  }): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_audit_trail (
          renewal_id, member_id, action_type, action_category, action_description,
          previous_status, new_status, previous_payment_status, new_payment_status,
          previous_amount, new_amount, amount_difference,
          performed_by, user_role, ip_address, user_agent, session_id, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING audit_id
      `;

      const amount_difference = (data.new_amount && data.previous_amount) 
        ? data.new_amount - data.previous_amount 
        : null;

      const params = [
        data.renewal_id,
        data.member_id,
        data.action_type,
        data.action_category,
        data.action_description,
        data.previous_status || null,
        data.new_status || null,
        data.previous_payment_status || null,
        data.new_payment_status || null,
        data.previous_amount || null,
        data.new_amount || null,
        amount_difference,
        data.performed_by || null,
        data.user_role || null,
        data.ip_address || null,
        data.user_agent || null,
        data.session_id || null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ];

      const result = await executeQuerySingle<{ audit_id: number }>(query, params);
      if (!result) {
        throw createDatabaseError('Failed to log audit trail - no result returned');
      }
      return result.audit_id;
    } catch (error) {
      throw createDatabaseError('Failed to log audit trail', error);
    }
  }

  /**
   * Get audit trail for a renewal
   */
  static async getRenewalAuditTrail(renewalId: number, limit: number = 100): Promise<RenewalAuditEntry[]> {
    try {
      const query = `
        SELECT 
          rat.*,
          u.name as performed_by_name,
          u.email as performed_by_email
        FROM renewal_audit_trail rat
        LEFT JOIN users u ON rat.performed_by = u.user_id
        WHERE rat.renewal_id = $1
        ORDER BY rat.created_at DESC
        LIMIT $2
      `;

      return await executeQuery<RenewalAuditEntry>(query, [renewalId, limit]);
    } catch (error) {
      throw createDatabaseError('Failed to get renewal audit trail', error);
    }
  }

  /**
   * Get audit trail summary statistics
   */
  static async getAuditTrailStats(filters?: {
    startDate?: Date;
    endDate?: Date;
    actionCategory?: string;
  }): Promise<any> {
    try {
      let query = `
        SELECT 
          action_category,
          COUNT(*) as total_actions,
          COUNT(DISTINCT renewal_id) as unique_renewals,
          COUNT(DISTINCT performed_by) as unique_users
        FROM renewal_audit_trail
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.startDate) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(filters.endDate);
      }

      if (filters?.actionCategory) {
        query += ` AND action_category = $${params.length + 1}`;
        params.push(filters.actionCategory);
      }

      query += ` GROUP BY action_category ORDER BY total_actions DESC`;

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get audit trail stats', error);
    }
  }

  // =====================================================================================
  // BULK OPERATIONS METHODS
  // =====================================================================================

  /**
   * Create bulk operation
   */
  static async createBulkOperation(data: {
    operation_type: string;
    total_items: number;
    filter_criteria?: any;
    selected_renewal_ids?: number[];
    initiated_by: number;
    user_role?: string;
  }): Promise<string> {
    try {
      const operation_uuid = uuidv4();

      const query = `
        INSERT INTO renewal_bulk_operations (
          operation_uuid, operation_type, total_items,
          filter_criteria, selected_renewal_ids,
          initiated_by, user_role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING operation_id
      `;

      const params = [
        operation_uuid,
        data.operation_type,
        data.total_items,
        data.filter_criteria ? JSON.stringify(data.filter_criteria) : null,
        data.selected_renewal_ids ? JSON.stringify(data.selected_renewal_ids) : null,
        data.initiated_by,
        data.user_role || null
      ];

      await executeQuerySingle<{ operation_id: number }>(query, params);
      return operation_uuid;
    } catch (error) {
      throw createDatabaseError('Failed to create bulk operation', error);
    }
  }

  /**
   * Update bulk operation progress
   */
  static async updateBulkOperationProgress(data: {
    operation_uuid: string;
    processed_items: number;
    successful_items: number;
    failed_items: number;
    operation_status?: string;
  }): Promise<void> {
    try {
      const progress_percentage = (data.processed_items / (data.successful_items + data.failed_items)) * 100;

      const query = `
        UPDATE renewal_bulk_operations
        SET processed_items = $1,
            successful_items = $2,
            failed_items = $3,
            progress_percentage = $4,
            operation_status = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE operation_uuid = $6
      `;

      await executeQuery(query, [
        data.processed_items,
        data.successful_items,
        data.failed_items,
        progress_percentage,
        data.operation_status || 'Processing',
        data.operation_uuid
      ]);
    } catch (error) {
      throw createDatabaseError('Failed to update bulk operation progress', error);
    }
  }

  /**
   * Complete bulk operation
   */
  static async completeBulkOperation(data: {
    operation_uuid: string;
    operation_result?: any;
    error_log?: any;
  }): Promise<void> {
    try {
      const query = `
        UPDATE renewal_bulk_operations
        SET operation_status = 'Completed',
            completed_at = CURRENT_TIMESTAMP,
            operation_result = $1,
            error_log = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE operation_uuid = $3
      `;

      await executeQuery(query, [
        data.operation_result ? JSON.stringify(data.operation_result) : null,
        data.error_log ? JSON.stringify(data.error_log) : null,
        data.operation_uuid
      ]);
    } catch (error) {
      throw createDatabaseError('Failed to complete bulk operation', error);
    }
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperationStatus(operation_uuid: string): Promise<BulkOperation | null> {
    try {
      const query = `
        SELECT * FROM renewal_bulk_operations
        WHERE operation_uuid = $1
      `;

      return await executeQuerySingle<BulkOperation>(query, [operation_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get bulk operation status', error);
    }
  }

  /**
   * Get recent bulk operations
   */
  static async getRecentBulkOperations(userId?: number, limit: number = 20): Promise<BulkOperation[]> {
    try {
      let query = `
        SELECT
          rbo.*,
          u.name as initiated_by_name,
          u.email as initiated_by_email
        FROM renewal_bulk_operations rbo
        LEFT JOIN users u ON rbo.initiated_by = u.user_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        query += ` AND rbo.initiated_by = $${params.length + 1}`;
        params.push(userId);
      }

      query += ` ORDER BY rbo.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      return await executeQuery<BulkOperation>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get recent bulk operations', error);
    }
  }

  // =====================================================================================
  // MANUAL NOTES METHODS
  // =====================================================================================

  /**
   * Add manual note to renewal
   */
  static async addManualNote(data: {
    renewal_id: number;
    member_id: number;
    note_type: string;
    note_priority: string;
    note_content: string;
    is_internal?: boolean;
    requires_follow_up?: boolean;
    follow_up_date?: Date;
    created_by: number;
    user_role?: string;
  }): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_manual_notes (
          renewal_id, member_id, note_type, note_priority, note_content,
          is_internal, requires_follow_up, follow_up_date,
          created_by, user_role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING note_id
      `;

      const params = [
        data.renewal_id,
        data.member_id,
        data.note_type,
        data.note_priority,
        data.note_content,
        data.is_internal !== undefined ? data.is_internal : true,
        data.requires_follow_up || false,
        data.follow_up_date || null,
        data.created_by,
        data.user_role || null
      ];

      const result = await executeQuerySingle<{ note_id: number }>(query, params);

      if (!result) {
        throw createDatabaseError('Failed to add manual note - no result returned');
      }

      // Log audit trail
      await this.logAuditTrail({
        renewal_id: data.renewal_id,
        member_id: data.member_id,
        action_type: 'manual_note_added',
        action_category: 'Manual Processing',
        action_description: `Manual note added: ${data.note_type}`,
        performed_by: data.created_by,
        user_role: data.user_role
      });

      return result.note_id;
    } catch (error) {
      throw createDatabaseError('Failed to add manual note', error);
    }
  }

  /**
   * Get manual notes for renewal
   */
  static async getRenewalManualNotes(renewalId: number): Promise<ManualNote[]> {
    try {
      const query = `
        SELECT
          rmn.*,
          u.name as created_by_name,
          u.email as created_by_email
        FROM renewal_manual_notes rmn
        LEFT JOIN users u ON rmn.created_by = u.user_id
        WHERE rmn.renewal_id = $1
        ORDER BY rmn.created_at DESC
      `;

      return await executeQuery<ManualNote>(query, [renewalId]);
    } catch (error) {
      throw createDatabaseError('Failed to get renewal manual notes', error);
    }
  }

  /**
   * Get notes requiring follow-up
   */
  static async getNotesRequiringFollowUp(assignedTo?: number): Promise<ManualNote[]> {
    try {
      let query = `
        SELECT
          rmn.*,
          u.name as created_by_name,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          mr.renewal_status
        FROM renewal_manual_notes rmn
        LEFT JOIN users u ON rmn.created_by = u.user_id
        LEFT JOIN members_consolidated m ON rmn.member_id = m.member_id
        LEFT JOIN membership_renewals mr ON rmn.renewal_id = mr.renewal_id
        WHERE rmn.requires_follow_up = true
          AND rmn.follow_up_completed = false
      `;
      const params: any[] = [];

      if (assignedTo) {
        query += ` AND rmn.created_by = $${params.length + 1}`;
        params.push(assignedTo);
      }

      query += ` ORDER BY rmn.follow_up_date ASC, rmn.note_priority DESC`;

      return await executeQuery<ManualNote>(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get notes requiring follow-up', error);
    }
  }

  /**
   * Mark follow-up as completed
   */
  static async completeFollowUp(noteId: number): Promise<void> {
    try {
      const query = `
        UPDATE renewal_manual_notes
        SET follow_up_completed = true,
            follow_up_completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE note_id = $1
      `;

      await executeQuery(query, [noteId]);
    } catch (error) {
      throw createDatabaseError('Failed to complete follow-up', error);
    }
  }

  // =====================================================================================
  // EXPORT METHODS
  // =====================================================================================

  /**
   * Create export job
   */
  static async createExportJob(data: {
    export_type: string;
    export_format: string;
    filter_criteria?: any;
    requested_by: number;
    user_role?: string;
  }): Promise<string> {
    try {
      const export_uuid = uuidv4();
      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + 24); // Expire after 24 hours

      const query = `
        INSERT INTO renewal_export_jobs (
          export_uuid, export_type, export_format,
          filter_criteria, requested_by, user_role, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING export_id
      `;

      const params = [
        export_uuid,
        data.export_type,
        data.export_format,
        data.filter_criteria ? JSON.stringify(data.filter_criteria) : null,
        data.requested_by,
        data.user_role || null,
        expires_at
      ];

      await executeQuerySingle<{ export_id: number }>(query, params);
      return export_uuid;
    } catch (error) {
      throw createDatabaseError('Failed to create export job', error);
    }
  }

  /**
   * Update export job with file details
   */
  static async updateExportJob(data: {
    export_uuid: string;
    file_name: string;
    file_path: string;
    file_size: number;
    download_url: string;
    total_records: number;
  }): Promise<void> {
    try {
      const query = `
        UPDATE renewal_export_jobs
        SET export_status = 'Completed',
            file_name = $1,
            file_path = $2,
            file_size = $3,
            download_url = $4,
            total_records = $5,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE export_uuid = $6
      `;

      await executeQuery(query, [
        data.file_name,
        data.file_path,
        data.file_size,
        data.download_url,
        data.total_records,
        data.export_uuid
      ]);
    } catch (error) {
      throw createDatabaseError('Failed to update export job', error);
    }
  }

  /**
   * Get export job status
   */
  static async getExportJobStatus(export_uuid: string): Promise<any> {
    try {
      const query = `
        SELECT * FROM renewal_export_jobs
        WHERE export_uuid = $1
      `;

      return await executeQuerySingle(query, [export_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get export job status', error);
    }
  }
}

