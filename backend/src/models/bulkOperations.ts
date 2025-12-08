import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

// Bulk operation interfaces
export interface BulkOperation {
  operation_id: number;
  operation_type: 'member_update' | 'member_delete' | 'member_transfer' | 'notification_send' | 'document_process';
  operation_status: 'Pending' | 'In Progress' | 'Completed' | 'Failed' | 'Cancelled';
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  operation_data: any;
  error_log: any;
  created_by: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BulkOperationDetails extends BulkOperation {
  created_by_name: string;
  progress_percentage: number;
  estimated_completion?: string;
}

export interface BulkMemberUpdate {
  member_ids: number[];
  update_data: {
    membership_status?: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
    hierarchy_level?: 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward';
    entity_id?: number;
    membership_type?: string;
    notes?: string;
  };
  reason?: string;
}

export interface BulkMemberTransfer {
  member_ids: number[];
  target_hierarchy_level: 'National' | 'Province' | 'Region' | 'Municipality' | 'Ward';
  target_entity_id: number;
  transfer_reason: string;
  effective_date?: string;
}

export interface BulkNotificationSend {
  recipient_type: 'all_members' | 'specific_members' | 'hierarchy_level' | 'membership_status';
  recipient_criteria?: {
    member_ids?: number[];
    hierarchy_level?: string;
    entity_id?: number;
    membership_status?: string;
  };
  notification_data: {
    title: string;
    message: string;
    notification_type: 'info' | 'warning' | 'success' | 'error';
    channels: ('email' | 'sms' | 'in_app')[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  schedule_for?: string;
}

export interface BulkOperationResult {
  operation_id: number;
  total_records: number;
  successful_records: number;
  failed_records: number;
  errors: Array<{
    record_id?: number;
    error_message: string;
    error_code?: string;
  }>;
}

export interface BulkOperationFilters {
  operation_type?: string;
  operation_status?: string;
  created_by?: number;
  date_from?: string;
  date_to?: string;
}

// Bulk Operations Model
export class BulkOperationsModel {
  // Create bulk operation record
  static async createBulkOperation(
    operationType: string,
    totalRecords: number,
    operationData: any,
    createdBy: number
  ): Promise<number> {
    try {
      const query = `
        INSERT INTO bulk_operations (
          operation_type, operation_status, total_records, processed_records,
          successful_records, failed_records, operation_data, created_by
        ) VALUES (?, 'Pending', ?, 0, 0, 0, ?, ?)
      `;

      const result = await executeQuery(query, [
        operationType,
        totalRecords,
        JSON.stringify(operationData),
        createdBy
      ]);

      return result.insertId;
    } catch (error) {
      throw createDatabaseError('Failed to create bulk operation', error);
    }
  }

  // Update bulk operation progress
  static async updateBulkOperationProgress(
    operationId: number,
    processedRecords: number,
    successfulRecords: number,
    failedRecords: number,
    status?: string,
    errorLog?: any
  ): Promise<boolean> {
    try {
      let query = `
        UPDATE bulk_operations 
        SET processed_records = ?, successful_records = ?, failed_records = ?, updated_at = CURRENT_TIMESTAMP
      `;
      const params: any[] = [processedRecords, successfulRecords, failedRecords];

      if (status) {
        query += ', operation_status = ?';
        params.push(status);

        if (status === 'In Progress' && processedRecords === 0) {
          query += ', started_at = CURRENT_TIMESTAMP';
        } else if (status === 'Completed' || status === 'Failed') {
          query += ', completed_at = CURRENT_TIMESTAMP';
        }
      }

      if (errorLog) {
        query += ', error_log = ?';
        params.push(JSON.stringify(errorLog));
      }

      query += ' WHERE operation_id = ?';
      params.push(operationId);

      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to update bulk operation progress', error);
    }
  }

  // Get bulk operations with filtering
  static async getBulkOperations(
    limit: number = 20,
    offset: number = 0,
    filters: BulkOperationFilters = {}
  ): Promise<BulkOperationDetails[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.operation_type) {
        whereClause += ' AND bo.operation_type = ?';
        params.push(filters.operation_type);
      }

      if (filters.operation_status) {
        whereClause += ' AND bo.operation_status = ?';
        params.push(filters.operation_status);
      }

      if (filters.created_by) {
        whereClause += ' AND bo.created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.date_from) {
        whereClause += ' AND DATE(bo.created_at) >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND DATE(bo.created_at) <= ?';
        params.push(filters.date_to);
      }

      const query = `
        SELECT 
          bo.*,
          CONCAT(u.firstname, ' ', u.surname) as created_by_name,
          CASE 
            WHEN bo.total_records > 0 THEN ROUND((bo.processed_records * 100.0) / bo.total_records, 2)
            ELSE 0 
          END as progress_percentage
        FROM bulk_operations bo
        LEFT JOIN users u ON bo.created_by = u.id
        ${whereClause}
        ORDER BY bo.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get bulk operations', error);
    }
  }

  // Get bulk operation by ID
  static async getBulkOperationById(operationId: number): Promise<BulkOperationDetails | null> {
    try {
      const query = `
        SELECT 
          bo.*,
          CONCAT(u.firstname, ' ', u.surname) as created_by_name,
          CASE 
            WHEN bo.total_records > 0 THEN ROUND((bo.processed_records * 100.0) / bo.total_records, 2)
            ELSE 0 
          END as progress_percentage
        FROM bulk_operations bo
        LEFT JOIN users u ON bo.created_by = u.id
        WHERE bo.operation_id = ?
      `;

      return await executeQuerySingle<BulkOperationDetails>(query, [operationId]);
    } catch (error) {
      throw createDatabaseError('Failed to get bulk operation', error);
    }
  }

  // Get bulk operations count
  static async getBulkOperationsCount(filters: BulkOperationFilters = {}): Promise<number> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.operation_type) {
        whereClause += ' AND operation_type = ?';
        params.push(filters.operation_type);
      }

      if (filters.operation_status) {
        whereClause += ' AND operation_status = ?';
        params.push(filters.operation_status);
      }

      if (filters.created_by) {
        whereClause += ' AND created_by = ?';
        params.push(filters.created_by);
      }

      if (filters.date_from) {
        whereClause += ' AND DATE(created_at) >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND DATE(created_at) <= ?';
        params.push(filters.date_to);
      }

      const query = `SELECT COUNT(*) as count FROM bulk_operations ${whereClause}`;
      const result = await executeQuerySingle<{ count: number }>(query, params);

      return result?.count || 0;
    } catch (error) {
      throw createDatabaseError('Failed to get bulk operations count', error);
    }
  }

  // Cancel bulk operation
  static async cancelBulkOperation(operationId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE bulk_operations 
        SET operation_status = 'Cancelled', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE operation_id = ? AND operation_status IN ('Pending', 'In Progress')
      `;

      const result = await executeQuery(query, [operationId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw createDatabaseError('Failed to cancel bulk operation', error);
    }
  }

  // Get active bulk operations (for processing)
  static async getActiveBulkOperations(): Promise<BulkOperation[]> {
    try {
      const query = `
        SELECT * FROM bulk_operations 
        WHERE operation_status IN ('Pending', 'In Progress')
        ORDER BY created_at ASC
        LIMIT 10
      `;

      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get active bulk operations', error);
    }
  }

  // Bulk update members
  static async bulkUpdateMembers(
    memberIds: number[],
    updateData: any,
    updatedBy: number
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    try {
      const errors: any[] = [];
      let successful = 0;
      let failed = 0;

      // Build update query
      const fields: string[] = [];
      const params: any[] = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'notes') {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid update fields provided');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');

      // Process members in batches
      const batchSize = 100;
      for (let i = 0; i < memberIds.length; i += batchSize) {
        const batch = memberIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        
        try {
          const query = `
            UPDATE members 
            SET ${fields.join(', ')}
            WHERE member_id IN (${placeholders})
          `;

          const result = await executeQuery(query, [...params, ...batch]);
          successful += result.affectedRows;

          // Log member updates if notes provided
          if (updateData.notes) {
            for (const memberId of batch) {
              try {
                await executeQuery(
                  'INSERT INTO member_notes (member_id, note_text, created_by) VALUES (?, ?, ?)',
                  [memberId, updateData.notes, updatedBy]
                );
              } catch (noteError) {
                // Note creation failure doesn't fail the update
                console.warn(`Failed to create note for member ${memberId}:`, noteError);
              }
            }
          }
        } catch (batchError) {
          failed += batch.length;
          errors.push({
            batch_start: i,
            batch_size: batch.length,
            error_message: (batchError as Error).message
          });
        }
      }

      return { successful, failed, errors };
    } catch (error) {
      throw createDatabaseError('Failed to bulk update members', error);
    }
  }

  // Bulk transfer members
  static async bulkTransferMembers(
    memberIds: number[],
    targetHierarchyLevel: string,
    targetEntityId: number,
    transferReason: string,
    transferredBy: number,
    effectiveDate?: string
  ): Promise<{ successful: number; failed: number; errors: any[] }> {
    try {
      const errors: any[] = [];
      let successful = 0;
      let failed = 0;

      const transferDate = effectiveDate || new Date().toISOString().split('T')[0];

      // Process members individually for transfer tracking
      for (const memberId of memberIds) {
        try {
          // Get current member details
          const currentMember = await executeQuerySingle(
            'SELECT hierarchy_level, entity_id FROM members_consolidated WHERE member_id = ?',
            [memberId]
          );

          if (!currentMember) {
            failed++;
            errors.push({
              member_id: memberId,
              error_message: 'Member not found'
            });
            continue;
          }

          // Update member
          await executeQuery(
            `UPDATE members 
             SET hierarchy_level = ?, entity_id = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE member_id = ?`,
            [targetHierarchyLevel, targetEntityId, memberId]
          );

          // Create transfer record
          await executeQuery(
            `INSERT INTO member_transfers (
               member_id, from_hierarchy_level, from_entity_id, 
               to_hierarchy_level, to_entity_id, transfer_reason, 
               transfer_date, transferred_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberId,
              currentMember.hierarchy_level,
              currentMember.entity_id,
              targetHierarchyLevel,
              targetEntityId,
              transferReason,
              transferDate,
              transferredBy
            ]
          );

          successful++;
        } catch (memberError) {
          failed++;
          errors.push({
            member_id: memberId,
            error_message: (memberError as Error).message
          });
        }
      }

      return { successful, failed, errors };
    } catch (error) {
      throw createDatabaseError('Failed to bulk transfer members', error);
    }
  }
}
