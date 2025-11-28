import { RenewalBulkUploadService, BulkUploadRecord, ProcessingResult } from './renewalBulkUploadService';
import { RenewalAdministrativeService } from './renewalAdministrativeService';
import { executeQuerySingle } from '../config/database-hybrid';
import { DatabaseError } from '../middleware/errorHandler';

/**
 * Renewal Bulk Processor
 * Background processor for bulk renewal uploads
 */

export class RenewalBulkProcessor {
  
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
      successful_renewals: 0,
      failed_validations: 0,
      fraud_detected: 0,
      early_renewals: 0,
      inactive_renewals: 0,
      errors: [],
      fraud_cases: []
    };

    try {
      // Get upload details
      console.log(`[BulkProcessor] STEP 1: Getting upload details...`);
      const upload = await this.getUploadDetails(upload_uuid);
      if (!upload) {
        console.error(`[BulkProcessor] ERROR: Upload not found for UUID: ${upload_uuid}`);
        throw new Error('Upload not found');
      }
      console.log(`[BulkProcessor] ✓ Upload found:`, {
        upload_id: upload.upload_id,
        file_name: upload.file_name,
        file_path: upload.file_path,
        file_type: upload.file_type,
        uploaded_by: upload.uploaded_by
      });

      // Update status to Processing
      console.log(`[BulkProcessor] STEP 2: Updating status to Processing...`);
      await RenewalBulkUploadService.updateUploadProgress({
        upload_uuid,
        upload_status: 'Processing'
      });
      console.log(`[BulkProcessor] ✓ Status updated to Processing`);

      // Parse file
      console.log(`[BulkProcessor] STEP 3: Parsing file: ${upload.file_path}`);
      const records = await RenewalBulkUploadService.parseUploadFile(
        upload.file_path,
        upload.file_type
      );
      console.log(`[BulkProcessor] ✓ File parsed successfully. Records found: ${records.length}`);

      result.total_records = records.length;

      // Update total records
      console.log(`[BulkProcessor] STEP 4: Updating total records count...`);
      await this.updateTotalRecords(upload_uuid, records.length);
      console.log(`[BulkProcessor] ✓ Total records updated: ${records.length}`);

      // Detect duplicates in upload
      console.log(`[BulkProcessor] STEP 5: Detecting duplicate renewals...`);
      const duplicates = RenewalBulkUploadService.detectDuplicateRenewals(records);
      console.log(`[BulkProcessor] ✓ Duplicate detection complete. Found: ${duplicates.size} duplicate ID numbers`);

      // Process each record
      console.log(`[BulkProcessor] STEP 6: Processing ${records.length} records...`);
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        console.log(`\n[BulkProcessor] --- Processing Record ${i + 1}/${records.length} (Row ${record.row_number}) ---`);
        console.log(`[BulkProcessor] ID Number: ${record.member_id_number}`);
        console.log(`[BulkProcessor] Ward Code: ${record.renewal_ward_code}`);

        try {
          await this.processRecord(
            upload.upload_id,
            upload_uuid,
            record,
            duplicates,
            result
          );

          result.processed_records++;
          console.log(`[BulkProcessor] ✓ Record ${i + 1} processed successfully`);

          // Update progress every 10 records
          if (result.processed_records % 10 === 0) {
            const progress = (result.processed_records / result.total_records) * 100;
            console.log(`[BulkProcessor] Updating progress: ${result.processed_records}/${result.total_records} (${progress.toFixed(2)}%)`);
            await RenewalBulkUploadService.updateUploadProgress({
              upload_uuid,
              processed_records: result.processed_records,
              successful_renewals: result.successful_renewals,
              failed_validations: result.failed_validations,
              fraud_detected: result.fraud_detected,
              early_renewals: result.early_renewals,
              inactive_renewals: result.inactive_renewals,
              progress_percentage: progress
            });
          }
        } catch (error: any) {
          console.error(`[BulkProcessor] ✗ ERROR processing row ${record.row_number}:`, error.message);
          console.error(`[BulkProcessor] Error stack:`, error.stack);
          result.errors.push({
            row: record.row_number,
            error: error.message
          });
        }
      }
      console.log(`\n[BulkProcessor] ✓ All records processed. Successful: ${result.successful_renewals}, Failed: ${result.failed_validations}, Fraud: ${result.fraud_detected}`);

      // Final update
      await RenewalBulkUploadService.updateUploadProgress({
        upload_uuid,
        upload_status: 'Completed',
        processed_records: result.processed_records,
        successful_renewals: result.successful_renewals,
        failed_validations: result.failed_validations,
        fraud_detected: result.fraud_detected,
        early_renewals: result.early_renewals,
        inactive_renewals: result.inactive_renewals,
        progress_percentage: 100
      });

      // Log audit trail (optional - may fail for bulk operations)
      try {
        await RenewalAdministrativeService.logAuditTrail({
          renewal_id: 0, // Bulk operation
          member_id: 0,
          action_type: 'bulk_upload_completed',
          action_category: 'Bulk Operation',
          action_description: `Bulk upload completed: ${result.successful_renewals} successful, ${result.fraud_detected} fraud detected`,
          performed_by: upload.uploaded_by,
          metadata: result
        });
        console.log(`[BulkProcessor] ✓ Audit trail logged successfully`);
      } catch (auditError: any) {
        console.log(`[BulkProcessor] ⚠ Failed to log audit trail (non-critical):`, auditError.message);
        // Continue processing - audit trail failure is not critical
      }

      console.log(`[BulkProcessor] Processing completed for upload: ${upload_uuid}`);
      return result;

    } catch (error: any) {
      console.error(`\n========================================`);
      console.error(`[BulkProcessor] ✗✗✗ FATAL ERROR ✗✗✗`);
      console.error(`[BulkProcessor] Upload UUID: ${upload_uuid}`);
      console.error(`[BulkProcessor] Error Message: ${error.message}`);
      console.error(`[BulkProcessor] Error Stack:`, error.stack);
      console.error(`========================================\n`);

      // Save detailed error to database
      const errorDetails = {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        result: result
      };

      await RenewalBulkUploadService.updateUploadProgress({
        upload_uuid,
        upload_status: 'Failed',
        processing_summary: errorDetails
      });

      throw error;
    }
  }

  /**
   * Process a single record
   */
  private static async processRecord(
    upload_id: number,
    upload_uuid: string,
    record: BulkUploadRecord,
    duplicates: Map<string, number[]>,
    result: ProcessingResult
  ): Promise<void> {
    
    // Step 1: Validate record
    const validation = await RenewalBulkUploadService.validateRecord(record);
    
    if (!validation.passed) {
      result.failed_validations++;
    }

    // Step 2: Look up member
    const memberInfo = await RenewalBulkUploadService.lookupMember(record.member_id_number);
    
    if (!memberInfo.found) {
      validation.passed = false;
      validation.errors.push('Member not found in database');
      result.failed_validations++;
    }

    // Step 3: Detect fraud - Ward Mismatch
    let fraud = await RenewalBulkUploadService.detectWardMismatchFraud(record, memberInfo);

    // Step 4: Detect fraud - Duplicate in upload
    if (!fraud.detected && record.member_id_number) {
      const memberIdKey = record.member_id_number.trim().toUpperCase();
      if (duplicates.has(memberIdKey)) {
        const duplicateRows = duplicates.get(memberIdKey)!;
        fraud = {
          detected: true,
          fraud_type: 'Duplicate Renewal',
          fraud_severity: 'Medium',
          description: `Member appears multiple times in upload at rows: ${duplicateRows.join(', ')}`,
          evidence: {
            duplicate_rows: duplicateRows
          }
        };
      }
    }

    if (fraud.detected) {
      result.fraud_detected++;
    }

    // Step 5: Determine renewal type
    const renewal_type = memberInfo.found ? 
      RenewalBulkUploadService.determineRenewalType(memberInfo) : 
      'New';

    if (renewal_type === 'Early') {
      result.early_renewals++;
    } else if (renewal_type === 'Inactive') {
      result.inactive_renewals++;
    }

    // Step 6: Save record to database
    const record_id = await RenewalBulkUploadService.saveUploadRecord({
      upload_id,
      record,
      validation,
      fraud,
      memberInfo,
      renewal_type
    });

    // Step 7: Create fraud case if detected
    if (fraud.detected) {
      const fraud_case_id = await RenewalBulkUploadService.createFraudCase({
        upload_id,
        record_id,
        fraud,
        record,
        memberInfo
      });

      result.fraud_cases.push({
        fraud_case_id,
        row_number: record.row_number,
        fraud_type: fraud.fraud_type,
        member_id_number: record.member_id_number
      });

      // Log fraud detection to audit trail
      await RenewalAdministrativeService.logAuditTrail({
        renewal_id: 0,
        member_id: memberInfo.member_id || 0,
        action_type: 'fraud_detected',
        action_category: 'Bulk Operation',
        action_description: `${fraud.fraud_type} detected: ${fraud.description}`,
        metadata: fraud.evidence
      });

      // Create manual note for follow-up
      if (memberInfo.member_id) {
        await RenewalAdministrativeService.addManualNote({
          renewal_id: 0,
          member_id: memberInfo.member_id,
          note_type: 'Issue',
          note_priority: fraud.fraud_severity === 'High' ? 'High' : 'Normal',
          note_content: `Fraud detected in bulk upload: ${fraud.description}`,
          is_internal: true,
          requires_follow_up: true,
          created_by: 0 // System
        });
      }
    }

    // Step 8: Process valid renewals (if not fraud and validation passed)
    if (!fraud.detected && validation.passed && memberInfo.found) {
      try {
        // Create renewal record
        await this.createRenewal({
          member_id: memberInfo.member_id!,
          renewal_amount: record.renewal_amount,
          payment_method: record.payment_method || 'Cash',
          payment_reference: record.payment_reference,
          payment_date: record.payment_date,
          renewal_type
        });

        result.successful_renewals++;

        // Update record status
        await this.updateRecordStatus(record_id, 'Processed');

      } catch (error: any) {
        console.error(`Error creating renewal for row ${record.row_number}:`, error);
        await this.updateRecordStatus(record_id, 'Failed', error.message);
      }
    }
  }

  /**
   * Create renewal record
   */
  private static async createRenewal(data: {
    member_id: number;
    renewal_amount: number;
    payment_method: string;
    payment_reference?: string;
    payment_date?: Date;
    renewal_type: string;
  }): Promise<number> {
    const query = `
      INSERT INTO membership_renewals (
        member_id, renewal_amount, payment_method,
        payment_reference, payment_date, renewal_status,
        renewal_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING renewal_id
    `;

    const params = [
      data.member_id,
      data.renewal_amount,
      data.payment_method,
      data.payment_reference || null,
      data.payment_date || new Date(),
      'Completed',
      data.renewal_type
    ];

    const result = await executeQuerySingle<{ renewal_id: number }>(query, params);
    if (!result) {
      throw new DatabaseError('Failed to create renewal - no result returned');
    }
    return result.renewal_id;
  }

  /**
   * Update record status
   */
  private static async updateRecordStatus(
    record_id: number,
    status: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE renewal_bulk_upload_records
      SET record_status = $1,
          processing_error = $2,
          processed_at = CURRENT_TIMESTAMP
      WHERE record_id = $3
    `;

    await executeQuerySingle(query, [status, error || null, record_id]);
  }

  /**
   * Get upload details
   */
  private static async getUploadDetails(upload_uuid: string): Promise<any> {
    const query = `
      SELECT * FROM renewal_bulk_uploads
      WHERE upload_uuid = $1
    `;

    return await executeQuerySingle(query, [upload_uuid]);
  }

  /**
   * Update total records
   */
  private static async updateTotalRecords(upload_uuid: string, total: number): Promise<void> {
    const query = `
      UPDATE renewal_bulk_uploads
      SET total_records = $1
      WHERE upload_uuid = $2
    `;

    await executeQuerySingle(query, [total, upload_uuid]);
  }
}

