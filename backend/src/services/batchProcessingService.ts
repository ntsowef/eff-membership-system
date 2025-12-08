import { executeQuery } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';

/**
 * Batch Processing Service
 * 
 * Provides efficient batch database operations to replace row-by-row processing
 * Processes records in batches of 500 for optimal performance
 */

export interface BulkApplicationRecord {
  row_number: number;
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: string;
  email?: string;
  cell_number: string;
  residential_address: string;
  ward_code: string;
  province_code?: string;
  district_code?: string;
  municipal_code?: string;
  application_type?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_amount?: number;
}

export interface BatchResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; error: string }>;
  successfulRecords: BulkApplicationRecord[];  // Records that were successfully inserted
  failedRecords: BulkApplicationRecord[];      // Records that failed to insert
}

export class BatchProcessingService {
  private static readonly BATCH_SIZE = 500;

  /**
   * Batch insert membership applications
   */
  static async batchInsertApplications(
    records: BulkApplicationRecord[]
  ): Promise<BatchResult> {
    const result: BatchResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      successfulRecords: [],
      failedRecords: []
    };

    console.log(`📦 Starting batch insert of ${records.length} applications...`);

    // Process in batches
    for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
      const batch = records.slice(i, i + this.BATCH_SIZE);
      const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(records.length / this.BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

      try {
        await this.insertApplicationBatch(batch);
        result.successCount += batch.length;
        result.successfulRecords.push(...batch);  // Track successful records
        console.log(`✅ Batch ${batchNumber} completed successfully`);
      } catch (error: any) {
        // Extract detailed error message
        const errorMessage = error.details?.message || error.message || 'Unknown error';
        const errorDetail = error.details?.detail || '';
        const fullError = errorDetail ? `${errorMessage} - ${errorDetail}` : errorMessage;

        console.error(`❌ Batch ${batchNumber} failed:`, fullError);
        console.error(`   Error details:`, error.details || error);

        result.failureCount += batch.length;
        result.failedRecords.push(...batch);  // Track failed records

        // Add error for each record in failed batch
        batch.forEach(record => {
          result.errors.push({
            row: record.row_number,
            error: fullError
          });
        });
      }
    }

    console.log(`✅ Batch insert complete: ${result.successCount} success, ${result.failureCount} failed`);
    return result;
  }

  /**
   * Insert a single batch of applications
   */
  private static async insertApplicationBatch(batch: BulkApplicationRecord[]): Promise<void> {
    const COLUMNS_PER_RECORD = 17;
    
    // Build VALUES clause with numbered parameters
    const valuesClauses: string[] = [];
    const params: any[] = [];

    batch.forEach((record, idx) => {
      const offset = idx * COLUMNS_PER_RECORD;
      // Generate application number that fits in VARCHAR(20)
      // Format: APP + last 7 digits of timestamp + 3-digit random + 3-digit index = APP + 13 digits = 16 chars max
      const timestamp = Date.now().toString().slice(-7);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const index = idx.toString().padStart(3, '0');
      const appNumber = `APP${timestamp}${random}${index}`;
      
      // Add parameters for this record
      params.push(
        appNumber,                          // $1, $18, $35, etc.
        record.first_name,                  // $2, $19, $36, etc.
        record.last_name,                   // $3, $20, $37, etc.
        record.id_number,                   // $4, $21, $38, etc.
        record.date_of_birth,               // $5, $22, $39, etc.
        record.gender,                      // $6, $23, $40, etc.
        record.email || null,               // $7, $24, $41, etc.
        record.cell_number,                 // $8, $25, $42, etc.
        record.residential_address,         // $9, $26, $43, etc.
        record.ward_code,                   // $10, $27, $44, etc.
        record.province_code || null,       // $11, $28, $45, etc.
        record.district_code || null,       // $12, $29, $46, etc.
        record.municipal_code || null,      // $13, $30, $47, etc.
        record.application_type || 'New',   // $14, $31, $48, etc.
        record.payment_method || null,      // $15, $32, $49, etc.
        record.payment_reference || null,   // $16, $33, $50, etc.
        record.payment_amount || null       // $17, $34, $51, etc.
      );

      // Build parameter placeholders for this record
      const placeholders: string[] = [];
      for (let j = 1; j <= COLUMNS_PER_RECORD; j++) {
        placeholders.push(`$${offset + j}`);
      }

      valuesClauses.push(`(${placeholders.join(', ')})`);
    });

    const query = `
      INSERT INTO membership_applications (
        application_number, first_name, last_name, id_number, date_of_birth,
        gender, email, cell_number, residential_address, ward_code,
        province_code, district_code, municipal_code, application_type,
        payment_method, payment_reference, payment_amount
      ) VALUES ${valuesClauses.join(', ')}
    `;

    try {
      await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Batch insert failed', error);
    }
  }

  /**
   * Batch insert upload records (for tracking)
   */
  static async batchInsertUploadRecords(
    uploadId: number,
    records: BulkApplicationRecord[],
    status: 'Success' | 'Failed' = 'Success'
  ): Promise<void> {
    const COLUMNS_PER_RECORD = 19;

    // Process in batches
    for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
      const batch = records.slice(i, i + this.BATCH_SIZE);

      const valuesClauses: string[] = [];
      const params: any[] = [];

      batch.forEach((record, idx) => {
        const offset = idx * COLUMNS_PER_RECORD;

        params.push(
          uploadId,
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
          status
        );

        const placeholders: string[] = [];
        for (let j = 1; j <= COLUMNS_PER_RECORD; j++) {
          placeholders.push(`$${offset + j}`);
        }

        valuesClauses.push(`(${placeholders.join(', ')})`);
      });

      const query = `
        INSERT INTO member_application_bulk_upload_records (
          upload_id, row_number, first_name, last_name, id_number,
          date_of_birth, gender, email, cell_number, residential_address,
          ward_code, province_code, district_code, municipal_code,
          application_type, payment_method, payment_reference, payment_amount,
          status
        ) VALUES ${valuesClauses.join(', ')}
      `;

      try {
        await executeQuery(query, params);
      } catch (error) {
        console.error('Error inserting upload records batch:', error);
        // Don't throw - we don't want to stop processing if record save fails
      }
    }
  }

  /**
   * Batch update progress
   */
  static async batchUpdateProgress(
    uploadUuid: string,
    updates: {
      processed_records?: number;
      successful_records?: number;
      failed_records?: number;
      duplicate_records?: number;
      status?: string;
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) return;

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(uploadUuid);

    const query = `
      UPDATE member_application_bulk_uploads
      SET ${updateFields.join(', ')}
      WHERE upload_uuid = $${paramIndex}
    `;

    try {
      await executeQuery(query, params);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }
}

