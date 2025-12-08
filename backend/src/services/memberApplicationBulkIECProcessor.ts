/**
 * Member Application Bulk IEC Processor
 * 
 * Handles bulk upload of membership applications with IEC verification.
 * This processor:
 * 1. Parses the uploaded file (Excel/CSV)
 * 2. Validates ID numbers format
 * 3. Verifies each ID against IEC database
 * 4. Retrieves geographic hierarchy (province, district, municipality, ward, VD)
 * 5. Assigns special VD code 999999999 for non-registered voters
 * 6. Stores applications with verification status
 * 7. Generates comprehensive Excel report
 */

import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import { MemberApplicationBulkUploadService, BulkApplicationRecord } from './memberApplicationBulkUploadService';
import { IECVerificationService } from './bulk-upload/iecVerificationService';
import { IECRateLimitService } from './iecRateLimitService';
import { iecApiService } from './iecApiService';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// Special VD codes for business rules
const VD_CODE_NOT_REGISTERED = '999999999'; // Nine 9s for non-registered voters
const VD_CODE_REGISTERED_NO_VD = '222222222'; // For registered voters without VD code

// =====================================================================================
// INTERFACES
// =====================================================================================

export interface IECVerificationResult {
  id_number: string;
  is_registered: boolean;
  voter_status?: string;
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  municipality_code?: string;
  municipality_name?: string;
  ward_code?: string;
  ward_name?: string;
  voting_district_code?: string;
  voting_district_name?: string;
  voting_station_name?: string;
  verification_date: Date;
  error?: string;
}

export interface BulkApplicationWithIEC extends BulkApplicationRecord {
  iec_verified: boolean;
  iec_is_registered?: boolean;
  iec_voter_status?: string;
  iec_province_code?: string;
  iec_province_name?: string;
  iec_district_code?: string;
  iec_district_name?: string;
  iec_municipality_code?: string;
  iec_municipality_name?: string;
  iec_ward_code?: string;
  iec_ward_name?: string;
  iec_voting_district_code?: string;
  iec_voting_district_name?: string;
  iec_voting_station_name?: string;
  iec_verification_date?: Date;
  iec_verification_error?: string;
}

export interface IECProcessingResult {
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  iec_verified_count: number;
  iec_registered_count: number;
  iec_not_registered_count: number;
  iec_failed_count: number;
  rate_limited: boolean;
  rate_limit_reset_time?: number;
  report_file_path?: string;
  errors: Array<{ row: number; error: string }>;
  records: BulkApplicationWithIEC[];
}

// =====================================================================================
// PROCESSOR CLASS
// =====================================================================================

export class MemberApplicationBulkIECProcessor {
  private static readonly BATCH_SIZE = 10;
  private static readonly BATCH_DELAY_MS = 100;

  /**
   * Process bulk upload with IEC verification
   */
  static async processBulkUploadWithIEC(upload_uuid: string): Promise<IECProcessingResult> {
    console.log(`\n========================================`);
    console.log(`[BulkIECProcessor] Starting IEC verification for upload: ${upload_uuid}`);
    console.log(`[BulkIECProcessor] Timestamp: ${new Date().toISOString()}`);
    console.log(`========================================\n`);

    const result: IECProcessingResult = {
      total_records: 0,
      processed_records: 0,
      successful_records: 0,
      failed_records: 0,
      duplicate_records: 0,
      iec_verified_count: 0,
      iec_registered_count: 0,
      iec_not_registered_count: 0,
      iec_failed_count: 0,
      rate_limited: false,
      errors: [],
      records: []
    };

    try {
      // Step 1: Get upload details
      const upload = await MemberApplicationBulkUploadService.getUploadStatus(upload_uuid);
      if (!upload) {
        throw new Error('Upload not found');
      }

      console.log(`[BulkIECProcessor] Upload found: ${upload.file_name}`);

      // Step 2: Update status to Processing
      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        status: 'Processing'
      });

      // Step 3: Parse file
      console.log(`[BulkIECProcessor] Parsing file...`);
      const records = await MemberApplicationBulkUploadService.parseUploadFile(
        upload.file_path,
        upload.file_type
      );

      result.total_records = records.length;
      console.log(`[BulkIECProcessor] Found ${records.length} records`);

      // Update total records
      await this.updateUploadWithIECProgress(upload_uuid, { total_records: records.length });

      // Step 4: Validate records and check duplicates
      console.log(`[BulkIECProcessor] Validating records...`);
      const validRecords: BulkApplicationRecord[] = [];
      const invalidRecords: BulkApplicationWithIEC[] = [];

      for (const record of records) {
        const validation = MemberApplicationBulkUploadService.validateRecord(record);
        
        if (!validation.passed) {
          result.failed_records++;
          result.errors.push({ row: record.row_number, error: validation.errors.join('; ') });
          invalidRecords.push({
            ...record,
            iec_verified: false,
            iec_verification_error: validation.errors.join('; ')
          });
        } else {
          // Check for duplicates
          const duplicateCheck = await MemberApplicationBulkUploadService.checkDuplicate(record.id_number);
          if (duplicateCheck.shouldBlock) {
            result.duplicate_records++;
            result.errors.push({ row: record.row_number, error: duplicateCheck.reason || 'Duplicate' });
            invalidRecords.push({
              ...record,
              iec_verified: false,
              iec_verification_error: duplicateCheck.reason
            });
          } else {
            validRecords.push(record);
          }
        }
        result.processed_records++;
      }

      console.log(`[BulkIECProcessor] Validation complete: ${validRecords.length} valid, ${invalidRecords.length} invalid/duplicate`);

      // Step 5: Verify with IEC
      console.log(`[BulkIECProcessor] Starting IEC verification for ${validRecords.length} records...`);
      const verifiedRecords = await this.verifyRecordsWithIEC(validRecords, result);

      // Combine invalid and verified records for report
      result.records = [...invalidRecords, ...verifiedRecords];

      // Step 6: Create membership applications for verified records
      console.log(`[BulkIECProcessor] Creating membership applications...`);
      for (const record of verifiedRecords) {
        try {
          const applicationId = await this.createApplicationWithIEC(record, upload.upload_id);
          if (applicationId) {
            result.successful_records++;
          }
        } catch (error: any) {
          result.failed_records++;
          result.errors.push({ row: record.row_number, error: error.message });
        }
      }

      // Step 7: Generate report
      console.log(`[BulkIECProcessor] Generating report...`);
      const reportPath = await this.generateReport(upload_uuid, result);
      result.report_file_path = reportPath;

      // Step 8: Update final status
      await this.updateUploadWithIECProgress(upload_uuid, {
        status: result.rate_limited ? 'Rate Limited' : 'Completed',
        processed_records: result.processed_records,
        successful_records: result.successful_records,
        failed_records: result.failed_records,
        duplicate_records: result.duplicate_records,
        iec_verified_count: result.iec_verified_count,
        iec_not_registered_count: result.iec_not_registered_count,
        iec_failed_count: result.iec_failed_count,
        iec_rate_limited: result.rate_limited,
        iec_rate_limit_reset_time: result.rate_limit_reset_time,
        report_file_path: reportPath
      });

      console.log(`\n========================================`);
      console.log(`[BulkIECProcessor] Processing completed`);
      console.log(`[BulkIECProcessor] Total: ${result.total_records}`);
      console.log(`[BulkIECProcessor] Successful: ${result.successful_records}`);
      console.log(`[BulkIECProcessor] Failed: ${result.failed_records}`);
      console.log(`[BulkIECProcessor] Duplicates: ${result.duplicate_records}`);
      console.log(`[BulkIECProcessor] IEC Verified: ${result.iec_verified_count}`);
      console.log(`[BulkIECProcessor] IEC Registered: ${result.iec_registered_count}`);
      console.log(`[BulkIECProcessor] IEC Not Registered: ${result.iec_not_registered_count}`);
      console.log(`[BulkIECProcessor] Rate Limited: ${result.rate_limited}`);
      console.log(`========================================\n`);

      return result;
    } catch (error: any) {
      console.error('[BulkIECProcessor] Processing failed:', error);

      await MemberApplicationBulkUploadService.updateUploadProgress(upload_uuid, {
        status: 'Failed'
      });

      throw error;
    }
  }

  /**
   * Verify records with IEC API
   */
  private static async verifyRecordsWithIEC(
    records: BulkApplicationRecord[],
    result: IECProcessingResult
  ): Promise<BulkApplicationWithIEC[]> {
    const verifiedRecords: BulkApplicationWithIEC[] = [];

    // Check rate limit before starting
    const rateLimitCheck = await IECRateLimitService.checkStatus();
    if (rateLimitCheck.is_limited) {
      console.log(`[BulkIECProcessor] ⚠️ Rate limit already reached, skipping IEC verification`);
      result.rate_limited = true;
      result.rate_limit_reset_time = rateLimitCheck.reset_time;

      // Return records without IEC data
      for (const record of records) {
        verifiedRecords.push({
          ...record,
          iec_verified: false,
          iec_verification_error: 'Rate limit exceeded - verification skipped'
        });
        result.iec_failed_count++;
      }
      return verifiedRecords;
    }

    // Process records in batches
    for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
      if (result.rate_limited) break;

      const batch = records.slice(i, i + this.BATCH_SIZE);
      const batchPromises = batch.map(record => this.verifyRecordWithIEC(record, result));
      const batchResults = await Promise.all(batchPromises);

      verifiedRecords.push(...batchResults);

      // Progress update
      console.log(`[BulkIECProcessor] Verified ${Math.min(i + this.BATCH_SIZE, records.length)}/${records.length} records`);

      // Delay between batches
      if (i + this.BATCH_SIZE < records.length && !result.rate_limited) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    return verifiedRecords;
  }

  /**
   * Verify single record with IEC API
   */
  private static async verifyRecordWithIEC(
    record: BulkApplicationRecord,
    result: IECProcessingResult
  ): Promise<BulkApplicationWithIEC> {
    try {
      // Check rate limit
      const rateLimitStatus = await IECRateLimitService.incrementAndCheck();
      if (rateLimitStatus.is_limited) {
        result.rate_limited = true;
        result.rate_limit_reset_time = rateLimitStatus.reset_time;
        result.iec_failed_count++;
        return {
          ...record,
          iec_verified: false,
          iec_verification_error: `Rate limit exceeded - resets at ${new Date(rateLimitStatus.reset_time).toLocaleTimeString()}`
        };
      }

      // Call IEC API
      const iecDetails = await iecApiService.verifyVoter(record.id_number);
      result.iec_verified_count++;

      if (!iecDetails || !iecDetails.is_registered) {
        // Not registered voter - assign special VD code
        result.iec_not_registered_count++;
        return {
          ...record,
          iec_verified: true,
          iec_is_registered: false,
          iec_voter_status: iecDetails?.voter_status || 'Not Registered',
          iec_voting_district_code: VD_CODE_NOT_REGISTERED,
          iec_verification_date: new Date()
        };
      }

      // Registered voter
      result.iec_registered_count++;
      return {
        ...record,
        iec_verified: true,
        iec_is_registered: true,
        iec_voter_status: iecDetails.voter_status,
        iec_province_code: iecDetails.province_code,
        iec_province_name: iecDetails.province,
        iec_district_code: iecDetails.district_code,
        iec_municipality_code: iecDetails.municipality_code,
        iec_municipality_name: iecDetails.municipality,
        iec_ward_code: iecDetails.ward_code,
        iec_voting_district_code: iecDetails.voting_district_code || VD_CODE_REGISTERED_NO_VD,
        iec_voting_station_name: iecDetails.voting_station_name,
        iec_verification_date: new Date()
      };
    } catch (error: any) {
      console.error(`[BulkIECProcessor] IEC verification failed for ${record.id_number}:`, error.message);
      result.iec_failed_count++;

      // Check if rate limit error
      if (error.message?.includes('rate limit')) {
        result.rate_limited = true;
      }

      return {
        ...record,
        iec_verified: false,
        iec_verification_error: error.message
      };
    }
  }

  /**
   * Create membership application with IEC data
   */
  private static async createApplicationWithIEC(
    record: BulkApplicationWithIEC,
    uploadId: number
  ): Promise<number | null> {
    try {
      const appNumber = `APP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const query = `
        INSERT INTO membership_applications (
          application_number, first_name, last_name, id_number, date_of_birth,
          gender, email, cell_number, residential_address, ward_code,
          province_code, district_code, municipal_code, voting_district_code,
          application_type, status, is_internal, bulk_upload_id,
          iec_verified, iec_is_registered, iec_voter_status, iec_province_code,
          iec_district_code, iec_municipality_code, iec_ward_code, iec_voting_district_code,
          iec_voting_station_name, iec_verification_date, iec_verification_error
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          'New', 'Submitted', true, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        RETURNING application_id
      `;

      // Determine VD code based on IEC verification
      const votingDistrictCode = record.iec_is_registered
        ? (record.iec_voting_district_code || VD_CODE_REGISTERED_NO_VD)
        : VD_CODE_NOT_REGISTERED;

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
        record.iec_province_code || record.province_code || null,
        record.iec_district_code || record.district_code || null,
        record.iec_municipality_code || record.municipal_code || null,
        votingDistrictCode,
        uploadId,
        record.iec_verified,
        record.iec_is_registered || false,
        record.iec_voter_status || null,
        record.iec_province_code || null,
        record.iec_district_code || null,
        record.iec_municipality_code || null,
        record.iec_ward_code || null,
        votingDistrictCode,
        record.iec_voting_station_name || null,
        record.iec_verification_date || null,
        record.iec_verification_error || null
      ];

      const result = await executeQuerySingle<{ application_id: number }>(query, params);
      return result?.application_id || null;
    } catch (error: any) {
      throw createDatabaseError('Failed to create application', error);
    }
  }

  /**
   * Update upload with IEC progress
   */
  private static async updateUploadWithIECProgress(
    upload_uuid: string,
    data: {
      status?: string;
      total_records?: number;
      processed_records?: number;
      successful_records?: number;
      failed_records?: number;
      duplicate_records?: number;
      iec_verified_count?: number;
      iec_not_registered_count?: number;
      iec_failed_count?: number;
      iec_rate_limited?: boolean;
      iec_rate_limit_reset_time?: number;
      report_file_path?: string;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.total_records !== undefined) {
      updates.push(`total_records = $${paramIndex++}`);
      params.push(data.total_records);
    }
    if (data.processed_records !== undefined) {
      updates.push(`processed_records = $${paramIndex++}`);
      params.push(data.processed_records);
    }
    if (data.successful_records !== undefined) {
      updates.push(`successful_records = $${paramIndex++}`);
      params.push(data.successful_records);
    }
    if (data.failed_records !== undefined) {
      updates.push(`failed_records = $${paramIndex++}`);
      params.push(data.failed_records);
    }
    if (data.duplicate_records !== undefined) {
      updates.push(`duplicate_records = $${paramIndex++}`);
      params.push(data.duplicate_records);
    }
    if (data.iec_verified_count !== undefined) {
      updates.push(`iec_verified_count = $${paramIndex++}`);
      params.push(data.iec_verified_count);
    }
    if (data.iec_not_registered_count !== undefined) {
      updates.push(`iec_not_registered_count = $${paramIndex++}`);
      params.push(data.iec_not_registered_count);
    }
    if (data.iec_failed_count !== undefined) {
      updates.push(`iec_failed_count = $${paramIndex++}`);
      params.push(data.iec_failed_count);
    }
    if (data.iec_rate_limited !== undefined) {
      updates.push(`iec_rate_limited = $${paramIndex++}`);
      params.push(data.iec_rate_limited);
    }
    if (data.iec_rate_limit_reset_time !== undefined) {
      updates.push(`iec_rate_limit_reset_time = $${paramIndex++}`);
      params.push(new Date(data.iec_rate_limit_reset_time));
    }
    if (data.report_file_path !== undefined) {
      updates.push(`report_file_path = $${paramIndex++}`);
      params.push(data.report_file_path);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length > 0) {
      params.push(upload_uuid);
      const query = `
        UPDATE member_application_bulk_uploads
        SET ${updates.join(', ')}
        WHERE upload_uuid = $${paramIndex}
      `;
      await executeQuery(query, params);
    }
  }

  /**
   * Generate Excel report for IEC verification results
   */
  private static async generateReport(
    upload_uuid: string,
    result: IECProcessingResult
  ): Promise<string> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    summarySheet.addRows([
      { metric: 'Upload UUID', value: upload_uuid },
      { metric: 'Processing Date', value: new Date().toISOString() },
      { metric: 'Total Records', value: result.total_records },
      { metric: 'Processed Records', value: result.processed_records },
      { metric: 'Successful Applications', value: result.successful_records },
      { metric: 'Failed Records', value: result.failed_records },
      { metric: 'Duplicate Records', value: result.duplicate_records },
      { metric: '', value: '' },
      { metric: 'IEC Verification Summary', value: '' },
      { metric: 'IEC Verified', value: result.iec_verified_count },
      { metric: 'Registered Voters', value: result.iec_registered_count },
      { metric: 'Not Registered Voters', value: result.iec_not_registered_count },
      { metric: 'IEC Verification Failed', value: result.iec_failed_count },
      { metric: 'Rate Limited', value: result.rate_limited ? 'Yes' : 'No' }
    ]);

    // Style summary header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // All Records Sheet
    const allRecordsSheet = workbook.addWorksheet('All Records');
    this.addRecordsSheet(allRecordsSheet, result.records, 'All');

    // Registered Voters Sheet
    const registeredSheet = workbook.addWorksheet('Registered Voters');
    const registeredRecords = result.records.filter(r => r.iec_is_registered === true);
    this.addRecordsSheet(registeredSheet, registeredRecords, 'Registered');

    // Not Registered Voters Sheet
    const notRegisteredSheet = workbook.addWorksheet('Not Registered');
    const notRegisteredRecords = result.records.filter(r => r.iec_verified && r.iec_is_registered === false);
    this.addRecordsSheet(notRegisteredSheet, notRegisteredRecords, 'NotRegistered');

    // Verification Failed Sheet
    const failedSheet = workbook.addWorksheet('Verification Failed');
    const failedRecords = result.records.filter(r => !r.iec_verified || r.iec_verification_error);
    this.addRecordsSheet(failedSheet, failedRecords, 'Failed');

    // Errors Sheet
    if (result.errors.length > 0) {
      const errorsSheet = workbook.addWorksheet('Errors');
      errorsSheet.columns = [
        { header: 'Row', key: 'row', width: 10 },
        { header: 'Error', key: 'error', width: 80 }
      ];
      errorsSheet.addRows(result.errors);
      errorsSheet.getRow(1).font = { bold: true };
      errorsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' }
      };
      errorsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Save report
    const reportsDir = path.join(__dirname, '../../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `iec_verification_report_${upload_uuid}_${Date.now()}.xlsx`;
    const reportPath = path.join(reportsDir, reportFileName);
    await workbook.xlsx.writeFile(reportPath);

    console.log(`[BulkIECProcessor] Report saved: ${reportPath}`);
    return reportPath;
  }

  /**
   * Add records to worksheet
   */
  private static addRecordsSheet(
    sheet: any,
    records: BulkApplicationWithIEC[],
    type: string
  ): void {
    sheet.columns = [
      { header: 'Row', key: 'row_number', width: 8 },
      { header: 'ID Number', key: 'id_number', width: 15 },
      { header: 'First Name', key: 'first_name', width: 15 },
      { header: 'Last Name', key: 'last_name', width: 15 },
      { header: 'Cell Number', key: 'cell_number', width: 15 },
      { header: 'IEC Verified', key: 'iec_verified', width: 12 },
      { header: 'Is Registered', key: 'iec_is_registered', width: 12 },
      { header: 'Voter Status', key: 'iec_voter_status', width: 15 },
      { header: 'Province Code', key: 'iec_province_code', width: 12 },
      { header: 'Province', key: 'iec_province_name', width: 20 },
      { header: 'District Code', key: 'iec_district_code', width: 12 },
      { header: 'Municipality Code', key: 'iec_municipality_code', width: 15 },
      { header: 'Municipality', key: 'iec_municipality_name', width: 25 },
      { header: 'Ward Code', key: 'iec_ward_code', width: 12 },
      { header: 'VD Code', key: 'iec_voting_district_code', width: 12 },
      { header: 'Voting Station', key: 'iec_voting_station_name', width: 30 },
      { header: 'Verification Error', key: 'iec_verification_error', width: 40 }
    ];

    for (const record of records) {
      sheet.addRow({
        row_number: record.row_number,
        id_number: record.id_number,
        first_name: record.first_name,
        last_name: record.last_name,
        cell_number: record.cell_number,
        iec_verified: record.iec_verified ? 'Yes' : 'No',
        iec_is_registered: record.iec_is_registered === true ? 'Yes' : (record.iec_is_registered === false ? 'No' : ''),
        iec_voter_status: record.iec_voter_status || '',
        iec_province_code: record.iec_province_code || '',
        iec_province_name: record.iec_province_name || '',
        iec_district_code: record.iec_district_code || '',
        iec_municipality_code: record.iec_municipality_code || '',
        iec_municipality_name: record.iec_municipality_name || '',
        iec_ward_code: record.iec_ward_code || '',
        iec_voting_district_code: record.iec_voting_district_code || '',
        iec_voting_station_name: record.iec_voting_station_name || '',
        iec_verification_error: record.iec_verification_error || ''
      });
    }

    // Style header
    sheet.getRow(1).font = { bold: true };

    // Color based on type
    let headerColor = 'FF4472C4'; // Blue default
    if (type === 'Registered') headerColor = 'FF70AD47'; // Green
    else if (type === 'NotRegistered') headerColor = 'FFFFC000'; // Orange
    else if (type === 'Failed') headerColor = 'FFFF0000'; // Red

    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerColor }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MemberApplicationBulkIECProcessor;
