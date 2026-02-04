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

  // ========================================
  // BULK REMOVAL / EXPULSION METHODS
  // ========================================

  /**
   * Find members by list of ID numbers
   */
  static async findMembersByIdNumbers(idNumbers: string[]): Promise<MemberForRemoval[]> {
    if (idNumbers.length === 0) return [];

    const placeholders = idNumbers.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.cell_number,
        m.email,
        m.province_code,
        p.province_name,
        m.municipality_code,
        mu.municipality_name,
        m.ward_code,
        w.ward_name,
        m.expiry_date,
        CASE
          WHEN m.expiry_date IS NULL THEN 'Inactive'
          WHEN m.expiry_date >= CURRENT_DATE THEN 'Active'
          WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
          ELSE 'Expired'
        END as membership_status
      FROM members_consolidated m
      LEFT JOIN provinces p ON m.province_code = p.province_code
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE m.id_number IN (${placeholders})
    `;

    return await executeQuery<MemberForRemoval>(query, idNumbers);
  }

  /**
   * Find members by name and province (for records without ID numbers)
   */
  static async findMembersByNameAndProvince(
    nameAndSurname: string,
    province?: string
  ): Promise<MemberForRemoval[]> {
    // Split the name into parts for flexible matching
    const nameParts = nameAndSurname.trim().split(/\s+/);

    let query = `
      SELECT
        m.member_id,
        m.id_number,
        m.firstname,
        m.surname,
        m.cell_number,
        m.email,
        m.province_code,
        p.province_name,
        m.municipality_code,
        mu.municipality_name,
        m.ward_code,
        w.ward_name,
        m.expiry_date,
        CASE
          WHEN m.expiry_date IS NULL THEN 'Inactive'
          WHEN m.expiry_date >= CURRENT_DATE THEN 'Active'
          WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
          ELSE 'Expired'
        END as membership_status
      FROM members_consolidated m
      LEFT JOIN provinces p ON m.province_code = p.province_code
      LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      WHERE (
        -- Match full name concatenation
        LOWER(CONCAT(m.firstname, ' ', m.surname)) LIKE LOWER($1)
        OR LOWER(CONCAT(m.surname, ' ', m.firstname)) LIKE LOWER($1)
    `;

    const params: any[] = [`%${nameAndSurname}%`];
    let paramIndex = 2;

    // Add individual name part matching
    if (nameParts.length >= 2) {
      query += `
        OR (LOWER(m.firstname) LIKE LOWER($${paramIndex}) AND LOWER(m.surname) LIKE LOWER($${paramIndex + 1}))
        OR (LOWER(m.surname) LIKE LOWER($${paramIndex}) AND LOWER(m.firstname) LIKE LOWER($${paramIndex + 1}))
      `;
      params.push(`%${nameParts[0]}%`, `%${nameParts[nameParts.length - 1]}%`);
      paramIndex += 2;
    }

    query += ')';

    // Add province filter if provided
    if (province) {
      query += ` AND (LOWER(p.province_name) LIKE LOWER($${paramIndex}) OR LOWER(m.province_code) = LOWER($${paramIndex}))`;
      params.push(`%${province}%`);
    }

    query += ' LIMIT 10'; // Limit results to prevent too many matches

    return await executeQuery<MemberForRemoval>(query, params);
  }

  /**
   * Archive and remove members (move to expelled_suspended_members, delete from members_consolidated)
   */
  static async archiveAndRemoveMembers(
    membersToRemove: MemberRemovalRequest[],
    removalReason: string,
    removalType: string,
    userId: number,
    batchId: string,
    sourceFile?: string
  ): Promise<BulkRemovalResult> {
    const result: BulkRemovalResult = {
      total: membersToRemove.length,
      successful: 0,
      failed: 0,
      archived: [],
      errors: []
    };

    try {
      await executeQuery('BEGIN');

      for (const member of membersToRemove) {
        try {
          // Get full member data for archival
          const memberData = await executeQuerySingle<any>(
            `SELECT * FROM members_consolidated WHERE member_id = $1`,
            [member.member_id]
          );

          if (!memberData) {
            result.errors.push({
              member_id: member.member_id,
              id_number: member.id_number,
              error: 'Member not found in database'
            });
            result.failed++;
            continue;
          }

          // Insert into expelled_suspended_members
          await executeQuery(
            `INSERT INTO expelled_suspended_members (
              row_number, subregion, ward_no, name_and_surname, id_number,
              firstname, surname, original_member_id, original_member_data,
              province_code, province_name, municipality_code, municipality_name,
              ward_code, ward_name, cell_number, email,
              removal_reason, removal_type, removal_date, removed_by_user_id,
              search_method, match_confidence, batch_id, source_file, created_by
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9,
              $10, $11, $12, $13,
              $14, $15, $16, $17,
              $18, $19, NOW(), $20,
              $21, $22, $23, $24, $20
            )`,
            [
              member.row_number || null,
              member.subregion || memberData.province_name || null,
              member.ward_no || memberData.ward_code || null,
              member.name_and_surname || `${memberData.firstname} ${memberData.surname}`,
              memberData.id_number,
              memberData.firstname,
              memberData.surname,
              memberData.member_id,
              JSON.stringify(memberData),
              memberData.province_code,
              member.province_name || null,
              memberData.municipality_code,
              member.municipality_name || null,
              memberData.ward_code,
              member.ward_name || null,
              memberData.cell_number,
              memberData.email,
              removalReason,
              removalType,
              userId,
              member.search_method || 'manual',
              member.match_confidence || 'exact',
              batchId,
              sourceFile || null
            ]
          );

          // Delete from members_consolidated
          await executeQuery(
            `DELETE FROM members_consolidated WHERE member_id = $1`,
            [member.member_id]
          );

          result.archived.push({
            member_id: member.member_id,
            id_number: memberData.id_number,
            name: `${memberData.firstname} ${memberData.surname}`
          });
          result.successful++;
        } catch (err: any) {
          result.errors.push({
            member_id: member.member_id,
            id_number: member.id_number,
            error: err.message
          });
          result.failed++;
        }
      }

      await executeQuery('COMMIT');
      return result;
    } catch (error) {
      await executeQuery('ROLLBACK');
      throw createDatabaseError('Failed to archive and remove members', error);
    }
  }

  /**
   * Get expelled/suspended members with pagination
   */
  static async getExpelledMembers(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      search?: string;
      removal_type?: string;
      province?: string;
      batch_id?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<{ members: ExpelledMember[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.search) {
      whereClause += ` AND (
        id_number LIKE $${paramIndex}
        OR LOWER(firstname) LIKE LOWER($${paramIndex})
        OR LOWER(surname) LIKE LOWER($${paramIndex})
        OR LOWER(name_and_surname) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.removal_type) {
      whereClause += ` AND removal_type = $${paramIndex}`;
      params.push(filters.removal_type);
      paramIndex++;
    }

    if (filters?.province) {
      whereClause += ` AND (province_code = $${paramIndex} OR LOWER(province_name) LIKE LOWER($${paramIndex}))`;
      params.push(`%${filters.province}%`);
      paramIndex++;
    }

    if (filters?.batch_id) {
      whereClause += ` AND batch_id = $${paramIndex}`;
      params.push(filters.batch_id);
      paramIndex++;
    }

    if (filters?.from_date) {
      whereClause += ` AND removal_date >= $${paramIndex}`;
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters?.to_date) {
      whereClause += ` AND removal_date <= $${paramIndex}`;
      params.push(filters.to_date);
      paramIndex++;
    }

    const members = await executeQuery<ExpelledMember>(
      `SELECT * FROM expelled_suspended_members ${whereClause}
       ORDER BY removal_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await executeQuerySingle<{ count: number }>(
      `SELECT COUNT(*) as count FROM expelled_suspended_members ${whereClause}`,
      params
    );

    return {
      members,
      total: countResult?.count || 0
    };
  }
}

// Additional interfaces for bulk removal
export interface MemberForRemoval {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  cell_number?: string;
  email?: string;
  province_code?: string;
  province_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  expiry_date?: Date;
  membership_status: string;
}

export interface MemberRemovalRequest {
  member_id: number;
  id_number?: string;
  row_number?: number;
  subregion?: string;
  ward_no?: string;
  name_and_surname?: string;
  province_name?: string;
  municipality_name?: string;
  ward_name?: string;
  search_method?: string;
  match_confidence?: string;
}

export interface BulkRemovalResult {
  total: number;
  successful: number;
  failed: number;
  archived: Array<{
    member_id: number;
    id_number: string;
    name: string;
  }>;
  errors: Array<{
    member_id: number;
    id_number?: string;
    error: string;
  }>;
}

export interface ExpelledMember {
  id: number;
  row_number?: number;
  subregion?: string;
  ward_no?: string;
  name_and_surname?: string;
  id_number?: string;
  firstname?: string;
  surname?: string;
  original_member_id?: number;
  original_member_data?: any;
  province_code?: string;
  province_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  cell_number?: string;
  email?: string;
  removal_reason?: string;
  removal_type?: string;
  removal_date?: Date;
  removed_by_user_id?: number;
  removal_notes?: string;
  search_method?: string;
  match_confidence?: string;
  batch_id?: string;
  source_file?: string;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
}

