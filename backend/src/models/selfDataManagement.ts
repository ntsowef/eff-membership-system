import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

export interface UploadedFile {
  file_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  upload_timestamp: Date;
  uploaded_by_user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  error_message?: string;
  rows_processed: number;
  rows_total: number;
  rows_success: number;
  rows_failed: number;
  processing_started_at?: Date;
  processing_completed_at?: Date;
  report_file_path?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FileProcessingError {
  error_id: number;
  file_id: number;
  row_number?: number;
  error_type: string;
  error_message: string;
  error_details?: any;
  created_at: Date;
}

export interface BulkOperation {
  operation_id: number;
  operation_type: 'status_update' | 'bulk_delete' | 'bulk_update';
  performed_by_user_id: number;
  member_ids: number[];
  total_members: number;
  successful_count: number;
  failed_count: number;
  operation_details?: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface MemberSearchResult {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  membership_status: string;
  membership_number?: string;
  province_name?: string;
  municipality_name?: string;
}

export class SelfDataManagementModel {
  /**
   * Register a new uploaded file
   */
  static async registerUploadedFile(data: {
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_by_user_id: number;
    rows_total?: number;
  }): Promise<UploadedFile> {
    try {
      const result = await executeQuerySingle<UploadedFile>(
        `INSERT INTO uploaded_files (
          filename, original_filename, file_path, file_size, mime_type,
          uploaded_by_user_id, rows_total, status, progress_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0)
        RETURNING *`,
        [
          data.filename,
          data.original_filename,
          data.file_path,
          data.file_size,
          data.mime_type,
          data.uploaded_by_user_id,
          data.rows_total || 0
        ]
      );

      if (!result) {
        throw new Error('Failed to register uploaded file');
      }

      return result;
    } catch (error) {
      throw createDatabaseError('Failed to register uploaded file', error);
    }
  }

  /**
   * Update file processing status
   */
  static async updateFileStatus(
    file_id: number,
    status: UploadedFile['status'],
    progress_percentage: number,
    rows_processed: number,
    rows_success: number,
    rows_failed: number,
    error_message?: string
  ): Promise<void> {
    try {
      const updates: string[] = [
        'status = $2',
        'progress_percentage = $3',
        'rows_processed = $4',
        'rows_success = $5',
        'rows_failed = $6'
      ];
      const params: any[] = [file_id, status, progress_percentage, rows_processed, rows_success, rows_failed];
      let paramIndex = 7;

      if (error_message) {
        updates.push(`error_message = $${paramIndex}`);
        params.push(error_message);
        paramIndex++;
      }

      if (status === 'processing') {
        updates.push('processing_started_at = CURRENT_TIMESTAMP');
      } else if (status === 'completed' || status === 'failed') {
        updates.push('processing_completed_at = CURRENT_TIMESTAMP');
      }

      await executeQuery(
        `UPDATE uploaded_files SET ${updates.join(', ')} WHERE file_id = $1`,
        params
      );
    } catch (error) {
      throw createDatabaseError('Failed to update file status', error);
    }
  }

  /**
   * Update report file path
   */
  static async updateReportFilePath(
    file_id: number,
    report_file_path: string
  ): Promise<void> {
    try {
      await executeQuery(
        'UPDATE uploaded_files SET report_file_path = $2 WHERE file_id = $1',
        [file_id, report_file_path]
      );
    } catch (error) {
      throw createDatabaseError('Failed to update report file path', error);
    }
  }

  /**
   * Get file by ID
   */
  static async getFileById(file_id: number): Promise<UploadedFile | null> {
    try {
      return await executeQuerySingle<UploadedFile>(
        'SELECT * FROM uploaded_files WHERE file_id = $1',
        [file_id]
      );
    } catch (error) {
      throw createDatabaseError('Failed to get file', error);
    }
  }

  /**
   * Get upload history with pagination
   */
  static async getUploadHistory(
    user_id?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ files: UploadedFile[]; total: number }> {
    try {
      const whereClause = user_id ? 'WHERE uploaded_by_user_id = $1' : '';
      const params = user_id ? [user_id] : [];

      const files = await executeQuery<UploadedFile>(
        `SELECT * FROM uploaded_files ${whereClause}
         ORDER BY upload_timestamp DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const countResult = await executeQuerySingle<{ count: number }>(
        `SELECT COUNT(*) as count FROM uploaded_files ${whereClause}`,
        params
      );

      return {
        files,
        total: countResult?.count || 0
      };
    } catch (error) {
      throw createDatabaseError('Failed to get upload history', error);
    }
  }

  /**
   * Delete upload history record
   */
  static async deleteUploadHistory(file_id: number): Promise<void> {
    try {
      // Start transaction
      await executeQuery('BEGIN');

      // Check if file exists
      const file = await executeQuerySingle<UploadedFile>(
        'SELECT * FROM uploaded_files WHERE file_id = $1',
        [file_id]
      );

      if (!file) {
        await executeQuery('ROLLBACK');
        throw new Error('Upload history record not found');
      }

      // Delete related file processing errors first (foreign key constraint)
      await executeQuery(
        'DELETE FROM file_processing_errors WHERE file_id = $1',
        [file_id]
      );

      // Delete the uploaded file record
      await executeQuery(
        'DELETE FROM uploaded_files WHERE file_id = $1',
        [file_id]
      );

      // Commit transaction
      await executeQuery('COMMIT');
    } catch (error) {
      // Rollback on error
      await executeQuery('ROLLBACK');
      throw createDatabaseError('Failed to delete upload history', error);
    }
  }

  /**
   * Search members by ID number
   */
  static async searchMembersByIdNumber(
    id_number_pattern: string,
    limit: number = 100
  ): Promise<MemberSearchResult[]> {
    try {
      return await executeQuery<MemberSearchResult>(
        `SELECT
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          COALESCE(ms.status_name, 'Unknown') as membership_status,
          m.membership_number,
          m.province_name,
          m.municipality_name
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        WHERE m.id_number LIKE $1
        ORDER BY m.id_number
        LIMIT $2`,
        [`%${id_number_pattern}%`, limit]
      );
    } catch (error) {
      throw createDatabaseError('Failed to search members', error);
    }
  }

  /**
   * Bulk update member status
   */
  static async bulkUpdateMemberStatus(
    member_ids: number[],
    new_status_id: number,
    performed_by_user_id: number,
    reason?: string
  ): Promise<BulkOperation> {
    try {
      // Start transaction
      await executeQuery('BEGIN');

      // Create bulk operation log
      const operation = await executeQuerySingle<BulkOperation>(
        `INSERT INTO bulk_operations_log (
          operation_type, performed_by_user_id, member_ids, total_members,
          operation_details, status
        ) VALUES ($1, $2, $3, $4, $5, 'processing')
        RETURNING *`,
        [
          'status_update',
          performed_by_user_id,
          member_ids,
          member_ids.length,
          { new_status_id, reason }
        ]
      );

      if (!operation) {
        throw new Error('Failed to create bulk operation log');
      }

      // Update member statuses
      const result = await executeQuery(
        `UPDATE members_consolidated
         SET membership_status_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE member_id = ANY($2::int[])`,
        [new_status_id, member_ids]
      );

      // Update operation log with results
      await executeQuery(
        `UPDATE bulk_operations_log
         SET status = 'completed', successful_count = $2, completed_at = CURRENT_TIMESTAMP
         WHERE operation_id = $1`,
        [operation.operation_id, member_ids.length]
      );

      // Commit transaction
      await executeQuery('COMMIT');

      return operation;
    } catch (error) {
      await executeQuery('ROLLBACK');
      throw createDatabaseError('Failed to bulk update member status', error);
    }
  }

  /**
   * Bulk delete members
   */
  static async bulkDeleteMembers(
    member_ids: number[],
    performed_by_user_id: number
  ): Promise<BulkOperation> {
    try {
      // Start transaction
      await executeQuery('BEGIN');

      // Create bulk operation log
      const operation = await executeQuerySingle<BulkOperation>(
        `INSERT INTO bulk_operations_log (
          operation_type, performed_by_user_id, member_ids, total_members, status
        ) VALUES ($1, $2, $3, $4, 'processing')
        RETURNING *`,
        ['bulk_delete', performed_by_user_id, member_ids, member_ids.length]
      );

      if (!operation) {
        throw new Error('Failed to create bulk operation log');
      }

      // Delete members
      await executeQuery(
        'DELETE FROM members_consolidated WHERE member_id = ANY($1::int[])',
        [member_ids]
      );

      // Update operation log
      await executeQuery(
        `UPDATE bulk_operations_log
         SET status = 'completed', successful_count = $2, completed_at = CURRENT_TIMESTAMP
         WHERE operation_id = $1`,
        [operation.operation_id, member_ids.length]
      );

      // Commit transaction
      await executeQuery('COMMIT');

      return operation;
    } catch (error) {
      await executeQuery('ROLLBACK');
      throw createDatabaseError('Failed to bulk delete members', error);
    }
  }
}

