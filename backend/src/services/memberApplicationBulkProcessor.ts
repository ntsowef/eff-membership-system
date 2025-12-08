import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { MemberApplicationBulkUploadService, BulkApplicationRecord, ProcessingResult } from './memberApplicationBulkUploadService';
import { BatchProcessingService } from './batchProcessingService';

// =====================================================================================
// PROCESSOR CLASS
// =====================================================================================

export class MemberApplicationBulkProcessor {
  
  /**
   * Process bulk upload in background
   */
  static async processBulkUpload(upload_uuid: string): Promise<ProcessingResult> {
    console.log(`\n========================================`);
    console.log(`[BulkProcessor] Starting processing for upload: ${upload_uuid}`);
    console.log(`[BulkProcessor] Timestamp: ${new Date().toISOString()}`);
    console.log(`========================================\n`);

    const result: ProcessingResult = {
      total_records: 0,
      processed_records: 0,
      successful_records: 0,
      failed_records: 0,
      duplicate_records: 0,
      errors: []
    };

    try {
      // Step 1: Get upload details
      const upload = await MemberApplicationBulkUploadService.getUploadStatus(upload_uuid);
      if (!upload) {
        throw new Error('Upload not found');
      }

      console.log(`[BulkProcessor] Upload found: ${upload.file_name}`);

      // Step 2: Update status to Processing
      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        status: 'Processing'
      });

      // Step 3: Parse file
      console.log(`[BulkProcessor] Parsing file...`);
      const records = await MemberApplicationBulkUploadService.parseUploadFile(
        upload.file_path,
        upload.file_type
      );

      result.total_records = records.length;
      console.log(`[BulkProcessor] Found ${records.length} records`);

      // Update total records
      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        total_records: records.length
      });

      // Step 4: Validate and filter records
      console.log(`[BulkProcessor] Validating records...`);
      const validRecords: BulkApplicationRecord[] = [];
      const invalidRecords: BulkApplicationRecord[] = [];

      for (const record of records) {
        const validation = MemberApplicationBulkUploadService.validateRecord(record);

        if (!validation.passed) {
          result.failed_records++;
          result.errors.push({
            row: record.row_number,
            error: validation.errors.join('; ')
          });
          invalidRecords.push(record);

          // Save failed record
          await this.saveUploadRecord(upload.upload_id, record, 'Failed', validation.errors.join('; '));
        } else {
          // Check for duplicates
          const duplicateCheck = await MemberApplicationBulkUploadService.checkDuplicate(record.id_number);

          if (duplicateCheck.shouldBlock) {
            const category = duplicateCheck.category || 'Duplicate';

            if (category === 'DUPLICATE_ACTIVE' || category === 'DUPLICATE_PENDING') {
              result.duplicate_records++;
            } else {
              result.failed_records++;
            }

            result.errors.push({
              row: record.row_number,
              error: duplicateCheck.reason || 'Duplicate or blocked application'
            });

            const recordStatus = category.startsWith('DUPLICATE') ? 'Duplicate' : 'Failed';
            await this.saveUploadRecord(upload.upload_id, record, recordStatus, duplicateCheck.reason || 'Blocked');
          } else {
            validRecords.push(record);
          }
        }

        result.processed_records++;

        // Update progress every 50 records during validation
        if (result.processed_records % 50 === 0) {
          await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
            processed_records: result.processed_records,
            successful_records: result.successful_records,
            failed_records: result.failed_records,
            duplicate_records: result.duplicate_records
          });
        }
      }

      console.log(`[BulkProcessor] Validation complete: ${validRecords.length} valid, ${invalidRecords.length} invalid`);

      // Step 5: Batch insert valid records
      if (validRecords.length > 0) {
        console.log(`[BulkProcessor] Batch inserting ${validRecords.length} valid records...`);

        const batchResult = await BatchProcessingService.batchInsertApplications(validRecords);

        result.successful_records = batchResult.successCount;
        result.failed_records += batchResult.failureCount;
        result.errors.push(...batchResult.errors);

        // Save upload records - only mark as Success those that actually succeeded
        console.log(`[BulkProcessor] Saving upload records...`);

        // Save successful records
        for (const record of batchResult.successfulRecords) {
          await this.saveUploadRecord(upload.upload_id, record, 'Success', null);
        }

        // Save failed records (from batch insert failures)
        for (const record of batchResult.failedRecords) {
          const error = batchResult.errors.find(e => e.row === record.row_number);
          await this.saveUploadRecord(upload.upload_id, record, 'Failed', error?.error || 'Batch insert failed');
        }
      }

      // Step 6: Final update
      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        processed_records: result.processed_records,
        successful_records: result.successful_records,
        failed_records: result.failed_records,
        duplicate_records: result.duplicate_records,
        status: 'Completed'
      });

      console.log(`\n========================================`);
      console.log(`[BulkProcessor] Processing completed`);
      console.log(`[BulkProcessor] Total: ${result.total_records}`);
      console.log(`[BulkProcessor] Successful: ${result.successful_records}`);
      console.log(`[BulkProcessor] Failed: ${result.failed_records}`);
      console.log(`[BulkProcessor] Duplicates: ${result.duplicate_records}`);
      console.log(`========================================\n`);

      return result;
    } catch (error: any) {
      console.error('[BulkProcessor] Processing failed:', error);
      
      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        status: 'Failed'
      });

      throw error;
    }
  }

  /**
   * Process single record with enhanced validation
   */
  static async processRecord(
    upload_id: number,
    record: BulkApplicationRecord,
    result: ProcessingResult
  ): Promise<void> {
    // Step 1: Validate record (includes SA ID and cell number validation)
    const validation = MemberApplicationBulkUploadService.validateRecord(record);

    if (!validation.passed) {
      result.failed_records++;

      // Categorize validation errors
      const errorMessage = validation.errors.join('; ');
      let category = 'FAILED_VALIDATION';

      if (errorMessage.includes('Invalid ID number')) {
        category = 'FAILED_INVALID_ID';
      } else if (errorMessage.includes('Invalid cell number')) {
        category = 'FAILED_INVALID_CELL';
      }

      result.errors.push({
        row: record.row_number,
        error: `[${category}] ${errorMessage}`
      });

      // Save failed record with category
      await this.saveUploadRecord(upload_id, record, 'Failed', `[${category}] ${errorMessage}`);
      return;
    }

    // Step 2: Enhanced duplicate check with status categorization
    const duplicateCheck = await MemberApplicationBulkUploadService.checkDuplicate(record.id_number);

    if (duplicateCheck.shouldBlock) {
      // Categorize the failure
      const category = duplicateCheck.category || 'Duplicate';

      if (category === 'DUPLICATE_ACTIVE' || category === 'DUPLICATE_PENDING') {
        result.duplicate_records++;
      } else {
        // FAILED_SUSPENDED, FAILED_RESIGNED, FAILED_FRAUD, etc.
        result.failed_records++;
      }

      result.errors.push({
        row: record.row_number,
        error: duplicateCheck.reason || 'Duplicate or blocked application'
      });

      // Save record with appropriate status
      const recordStatus = category.startsWith('DUPLICATE') ? 'Duplicate' : 'Failed';
      await this.saveUploadRecord(upload_id, record, recordStatus, duplicateCheck.reason || 'Blocked');
      return;
    }

    // Step 3: Create application (internal application - no signature/payment required)
    try {
      await this.createApplication(record);
      result.successful_records++;

      // Save successful record
      await this.saveUploadRecord(upload_id, record, 'Success', null);
    } catch (error: any) {
      result.failed_records++;
      result.errors.push({
        row: record.row_number,
        error: `Failed to create application: ${error.message}`
      });

      // Save failed record
      await this.saveUploadRecord(upload_id, record, 'Failed', error.message);
    }
  }

  /**
   * Create membership application (Internal - no signature/payment required)
   */
  static async createApplication(record: BulkApplicationRecord): Promise<number> {
    try {
      // Generate application number
      const appNumber = `APP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const query = `
        INSERT INTO membership_applications (
          application_number, first_name, last_name, id_number, date_of_birth,
          gender, email, cell_number, residential_address, ward_code,
          province_code, district_code, municipal_code, application_type,
          status, payment_method, payment_reference, payment_amount, is_internal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Submitted', $15, $16, $17, true)
        RETURNING application_id
      `;

      const params = [
        appNumber,
        record.first_name,
        record.last_name,
        record.id_number,
        record.date_of_birth,
        record.gender,
        record.email || null,
        record.cell_number,
        record.residential_address,
        record.ward_code,
        record.province_code || null,
        record.district_code || null,
        record.municipal_code || null,
        record.application_type || 'New',
        record.payment_method || null,
        record.payment_reference || null,
        record.payment_amount || null
      ];

      const result = await executeQuerySingle<{ application_id: number }>(query, params);
      return result?.application_id || 0;
    } catch (error) {
      throw createDatabaseError('Failed to create application', error);
    }
  }

  /**
   * Save upload record
   */
  static async saveUploadRecord(
    upload_id: number,
    record: BulkApplicationRecord,
    status: string,
    error_message: string | null
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO member_application_bulk_upload_records (
          upload_id, row_number, first_name, last_name, id_number,
          date_of_birth, gender, email, cell_number, residential_address,
          ward_code, province_code, district_code, municipal_code,
          application_type, payment_method, payment_reference, payment_amount,
          record_status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `;

      const params = [
        upload_id,
        record.row_number,
        record.first_name,
        record.last_name,
        record.id_number,
        record.date_of_birth,
        record.gender,
        record.email || null,
        record.cell_number,
        record.residential_address,
        record.ward_code,
        record.province_code || null,
        record.district_code || null,
        record.municipal_code || null,
        record.application_type || 'New',
        record.payment_method || null,
        record.payment_reference || null,
        record.payment_amount || null,
        status,
        error_message
      ];

      await executeQuery(query, params);
    } catch (error) {
      console.error('Error saving upload record:', error);
      // Don't throw - we don't want to stop processing if record save fails
    }
  }

  /**
   * Get upload details
   */
  static async getUploadDetails(upload_uuid: string): Promise<any> {
    try {
      const query = `
        SELECT 
          u.*,
          COUNT(r.record_id) as total_records,
          SUM(CASE WHEN r.record_status = 'Success' THEN 1 ELSE 0 END) as successful_records,
          SUM(CASE WHEN r.record_status = 'Failed' THEN 1 ELSE 0 END) as failed_records,
          SUM(CASE WHEN r.record_status = 'Duplicate' THEN 1 ELSE 0 END) as duplicate_records
        FROM member_application_bulk_uploads u
        LEFT JOIN member_application_bulk_upload_records r ON u.upload_id = r.upload_id
        WHERE u.upload_uuid = $1
        GROUP BY u.upload_id
      `;

      return await executeQuerySingle(query, [upload_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get upload details', error);
    }
  }
}

