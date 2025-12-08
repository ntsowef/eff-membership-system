import { executeQuery, executeQuerySingle } from '../config/database-hybrid';
import { createDatabaseError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { RenewalAdministrativeService } from './renewalAdministrativeService';

/**
 * Renewal Bulk Upload Service
 * Handles bulk upload of membership renewals with fraud detection
 */

// =====================================================================================
// INTERFACES
// =====================================================================================

export interface BulkUploadRecord {
  row_number: number;
  member_id_number: string;
  member_firstname?: string;
  member_surname?: string;
  member_email?: string;
  member_phone?: string;
  renewal_ward_code: string;
  renewal_ward_name?: string;
  renewal_amount: number;
  payment_method?: string;
  payment_reference?: string;
  payment_date?: Date;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface FraudDetectionResult {
  detected: boolean;
  fraud_type?: string;
  fraud_severity?: string;
  description?: string;
  evidence?: any;
}

export interface MemberLookupResult {
  found: boolean;
  member_id?: number;
  member_name?: string;
  current_ward_code?: string;
  current_ward_name?: string;
  membership_status?: string;
  membership_expiry_date?: Date;
}

export interface ProcessingResult {
  total_records: number;
  processed_records: number;
  successful_renewals: number;
  failed_validations: number;
  fraud_detected: number;
  early_renewals: number;
  inactive_renewals: number;
  errors: any[];
  fraud_cases: any[];
}

// =====================================================================================
// BULK UPLOAD SERVICE
// =====================================================================================

export class RenewalBulkUploadService {
  
  /**
   * Create bulk upload record
   */
  static async createBulkUpload(data: {
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    uploaded_by: number;
    user_role?: string;
    province_code?: string;
  }): Promise<string> {
    try {
      const upload_uuid = uuidv4();
      
      const query = `
        INSERT INTO renewal_bulk_uploads (
          upload_uuid, file_name, file_path, file_type, file_size,
          uploaded_by, user_role, province_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING upload_id
      `;

      const params = [
        upload_uuid,
        data.file_name,
        data.file_path,
        data.file_type,
        data.file_size,
        data.uploaded_by,
        data.user_role || null,
        data.province_code || null
      ];

      await executeQuerySingle<{ upload_id: number }>(query, params);
      return upload_uuid;
    } catch (error) {
      throw createDatabaseError('Failed to create bulk upload', error);
    }
  }

  /**
   * Parse Excel/CSV file
   */
  static async parseUploadFile(filePath: string, fileType: string): Promise<BulkUploadRecord[]> {
    try {
      const records: BulkUploadRecord[] = [];
      
      if (fileType === 'Excel') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        data.forEach((row: any, index: number) => {
          records.push({
            row_number: index + 2, // +2 because Excel rows start at 1 and we skip header
            member_id_number: row['Member ID'] || row['member_id'] || row['member_id_number'] || row['ID Number'],
            member_firstname: row['First Name'] || row['firstname'] || row['member_firstname'],
            member_surname: row['Surname'] || row['surname'] || row['member_surname'] || row['Last Name'],
            member_email: row['Email'] || row['email'] || row['member_email'],
            member_phone: row['Phone'] || row['phone'] || row['member_phone'] || row['Cell Number'],
            renewal_ward_code: row['Ward Code'] || row['ward_code'] || row['renewal_ward_code'],
            renewal_ward_name: row['Ward Name'] || row['ward_name'] || row['renewal_ward_name'],
            renewal_amount: parseFloat(row['Amount'] || row['renewal_amount'] || row['amount'] || '0'),
            payment_method: row['Payment Method'] || row['payment_method'],
            payment_reference: row['Payment Reference'] || row['payment_reference'],
            payment_date: row['Payment Date'] || row['payment_date'] ? new Date(row['Payment Date'] || row['payment_date']) : undefined
          });
        });
      } else if (fileType === 'CSV') {
        const workbook = XLSX.readFile(filePath, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        data.forEach((row: any, index: number) => {
          records.push({
            row_number: index + 2,
            member_id_number: row['Member ID'] || row['member_id'] || row['member_id_number'] || row['ID Number'],
            member_firstname: row['First Name'] || row['firstname'] || row['member_firstname'],
            member_surname: row['Surname'] || row['surname'] || row['member_surname'] || row['Last Name'],
            member_email: row['Email'] || row['email'] || row['member_email'],
            member_phone: row['Phone'] || row['phone'] || row['member_phone'] || row['Cell Number'],
            renewal_ward_code: row['Ward Code'] || row['ward_code'] || row['renewal_ward_code'],
            renewal_ward_name: row['Ward Name'] || row['ward_name'] || row['renewal_ward_name'],
            renewal_amount: parseFloat(row['Amount'] || row['renewal_amount'] || row['amount'] || '0'),
            payment_method: row['Payment Method'] || row['payment_method'],
            payment_reference: row['Payment Reference'] || row['payment_reference'],
            payment_date: row['Payment Date'] || row['payment_date'] ? new Date(row['Payment Date'] || row['payment_date']) : undefined
          });
        });
      }

      return records;
    } catch (error) {
      throw createDatabaseError('Failed to parse upload file', error);
    }
  }

  /**
   * Validate a single record
   */
  static async validateRecord(record: BulkUploadRecord): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!record.member_id_number || record.member_id_number.trim() === '') {
      errors.push('Member ID number is required');
    }

    if (!record.renewal_ward_code || record.renewal_ward_code.trim() === '') {
      errors.push('Ward code is required');
    }

    if (!record.renewal_amount || record.renewal_amount <= 0) {
      errors.push('Valid renewal amount is required');
    }

    // Format validation
    if (record.member_id_number && record.member_id_number.length !== 13) {
      warnings.push('Member ID number should be 13 digits');
    }

    // Payment amount validation
    const expectedAmount = 500.00; // Standard renewal fee
    if (record.renewal_amount && Math.abs(record.renewal_amount - expectedAmount) > 0.01) {
      warnings.push(`Payment amount (R${record.renewal_amount}) differs from standard fee (R${expectedAmount})`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Look up member in database
   */
  static async lookupMember(idNumber: string): Promise<MemberLookupResult> {
    console.log(`[Service] Looking up member with ID number: ${idNumber}`);
    try {
      const query = `
        SELECT
          m.member_id,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
          m.ward_code as current_ward_code,
          w.ward_name as current_ward_name,
          CASE
            WHEN ms.status_id = 1 THEN 'Active'
            WHEN ms.status_id = 2 THEN 'Inactive'
            WHEN ms.status_id = 3 THEN 'Suspended'
            WHEN ms.status_id = 4 THEN 'Expired'
            ELSE 'Unknown'
          END as membership_status,
          ms.expiry_date as membership_expiry_date
        FROM members m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN memberships ms ON m.member_id = ms.member_id
        WHERE m.id_number = $1
        ORDER BY ms.expiry_date DESC NULLS LAST
        LIMIT 1
      `;

      const result = await executeQuerySingle<any>(query, [idNumber]);

      if (result) {
        console.log(`[Service] ✓ Member FOUND:`, {
          member_id: result.member_id,
          member_name: result.member_name,
          current_ward_code: result.current_ward_code,
          membership_status: result.membership_status
        });
        return {
          found: true,
          member_id: result.member_id,
          member_name: result.member_name,
          current_ward_code: result.current_ward_code,
          current_ward_name: result.current_ward_name,
          membership_status: result.membership_status,
          membership_expiry_date: result.membership_expiry_date
        };
      }

      console.log(`[Service] ✗ Member NOT FOUND for ID number: ${idNumber}`);
      return { found: false };
    } catch (error: any) {
      console.error(`[Service] ✗ ERROR during member lookup for ${idNumber}:`, error.message);
      console.error(`[Service] Error stack:`, error.stack);
      return { found: false };
    }
  }

  /**
   * Detect fraud - Ward Mismatch
   */
  static async detectWardMismatchFraud(
    record: BulkUploadRecord,
    memberInfo: MemberLookupResult
  ): Promise<FraudDetectionResult> {
    if (!memberInfo.found || !memberInfo.current_ward_code) {
      return { detected: false };
    }

    // Check if member has active membership
    const hasActiveMembership = memberInfo.membership_status === 'Active' || 
                                 (memberInfo.membership_expiry_date && 
                                  new Date(memberInfo.membership_expiry_date) > new Date());

    if (!hasActiveMembership) {
      return { detected: false };
    }

    // Compare wards
    const currentWard = memberInfo.current_ward_code.trim().toUpperCase();
    const renewalWard = record.renewal_ward_code.trim().toUpperCase();

    if (currentWard !== renewalWard) {
      return {
        detected: true,
        fraud_type: 'Ward Mismatch',
        fraud_severity: 'High',
        description: `Member has active membership in ward ${currentWard} but renewal attempts to register in ward ${renewalWard}`,
        evidence: {
          current_ward: memberInfo.current_ward_code,
          current_ward_name: memberInfo.current_ward_name,
          attempted_ward: record.renewal_ward_code,
          attempted_ward_name: record.renewal_ward_name,
          membership_status: memberInfo.membership_status,
          expiry_date: memberInfo.membership_expiry_date
        }
      };
    }

    return { detected: false };
  }

  /**
   * Detect duplicate renewals in upload
   */
  static detectDuplicateRenewals(records: BulkUploadRecord[]): Map<string, number[]> {
    const duplicates = new Map<string, number[]>();
    const seen = new Map<string, number>();

    records.forEach((record, index) => {
      // Skip records with missing member_id_number
      if (!record.member_id_number) {
        console.log(`[Service] Skipping duplicate detection for row ${record.row_number} - missing member_id_number`);
        return;
      }

      const key = record.member_id_number.trim().toUpperCase();

      if (seen.has(key)) {
        const firstRow = seen.get(key)!;
        if (!duplicates.has(key)) {
          duplicates.set(key, [firstRow]);
        }
        duplicates.get(key)!.push(record.row_number);
      } else {
        seen.set(key, record.row_number);
      }
    });

    return duplicates;
  }

  /**
   * Determine renewal type (Early vs Inactive)
   */
  static determineRenewalType(memberInfo: MemberLookupResult): string {
    if (!memberInfo.found || !memberInfo.membership_expiry_date) {
      return 'New';
    }

    const expiryDate = new Date(memberInfo.membership_expiry_date);
    const today = new Date();

    if (expiryDate > today) {
      return 'Early'; // Renewing before expiration
    } else {
      return 'Inactive'; // Renewing after expiration (lapsed membership)
    }
  }

  /**
   * Save upload record to database
   */
  static async saveUploadRecord(data: {
    upload_id: number;
    record: BulkUploadRecord;
    validation: ValidationResult;
    fraud: FraudDetectionResult;
    memberInfo: MemberLookupResult;
    renewal_type?: string;
  }): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_bulk_upload_records (
          upload_id, row_number,
          member_id_number, member_firstname, member_surname, member_email, member_phone,
          renewal_ward_code, renewal_ward_name, renewal_amount,
          payment_method, payment_reference, payment_date,
          record_status, validation_passed, validation_errors,
          fraud_detected, fraud_type, fraud_details,
          found_member_id, found_member_name,
          current_ward_code, current_ward_name,
          current_membership_status, membership_expiry_date,
          renewal_type
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        RETURNING record_id
      `;

      const recordStatus = data.fraud.detected ? 'Fraud' :
                          (data.validation.passed ? 'Valid' : 'Invalid');

      const params = [
        data.upload_id,
        data.record.row_number,
        data.record.member_id_number,
        data.record.member_firstname || null,
        data.record.member_surname || null,
        data.record.member_email || null,
        data.record.member_phone || null,
        data.record.renewal_ward_code,
        data.record.renewal_ward_name || null,
        data.record.renewal_amount,
        data.record.payment_method || null,
        data.record.payment_reference || null,
        data.record.payment_date || null,
        recordStatus,
        data.validation.passed,
        JSON.stringify({ errors: data.validation.errors, warnings: data.validation.warnings }),
        data.fraud.detected,
        data.fraud.fraud_type || null,
        data.fraud.detected ? JSON.stringify(data.fraud.evidence) : null,
        data.memberInfo.member_id || null,
        data.memberInfo.member_name || null,
        data.memberInfo.current_ward_code || null,
        data.memberInfo.current_ward_name || null,
        data.memberInfo.membership_status || null,
        data.memberInfo.membership_expiry_date || null,
        data.renewal_type || null
      ];

      const result = await executeQuerySingle<{ record_id: number }>(query, params);
      if (!result) {
        throw createDatabaseError('Failed to save upload record - no result returned');
      }
      return result.record_id;
    } catch (error) {
      throw createDatabaseError('Failed to save upload record', error);
    }
  }

  /**
   * Create fraud case
   */
  static async createFraudCase(data: {
    upload_id: number;
    record_id: number;
    fraud: FraudDetectionResult;
    record: BulkUploadRecord;
    memberInfo: MemberLookupResult;
  }): Promise<number> {
    try {
      const query = `
        INSERT INTO renewal_fraud_cases (
          upload_id, record_id, fraud_type, fraud_severity,
          member_id, member_id_number, member_name,
          current_ward_code, current_ward_name,
          attempted_ward_code, attempted_ward_name,
          fraud_description, fraud_evidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING fraud_case_id
      `;

      const params = [
        data.upload_id,
        data.record_id,
        data.fraud.fraud_type,
        data.fraud.fraud_severity,
        data.memberInfo.member_id || null,
        data.record.member_id_number,
        data.memberInfo.member_name || null,
        data.memberInfo.current_ward_code || null,
        data.memberInfo.current_ward_name || null,
        data.record.renewal_ward_code,
        data.record.renewal_ward_name || null,
        data.fraud.description,
        JSON.stringify(data.fraud.evidence)
      ];

      const result = await executeQuerySingle<{ fraud_case_id: number }>(query, params);
      if (!result) {
        throw createDatabaseError('Failed to create fraud case - no result returned');
      }
      return result.fraud_case_id;
    } catch (error) {
      throw createDatabaseError('Failed to create fraud case', error);
    }
  }

  /**
   * Update upload progress
   */
  static async updateUploadProgress(data: {
    upload_uuid: string;
    upload_status?: string;
    processed_records?: number;
    successful_renewals?: number;
    failed_validations?: number;
    fraud_detected?: number;
    early_renewals?: number;
    inactive_renewals?: number;
    progress_percentage?: number;
    processing_summary?: any;
  }): Promise<void> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.upload_status) {
        updates.push(`upload_status = $${paramIndex++}`);
        params.push(data.upload_status);
      }

      if (data.processed_records !== undefined) {
        updates.push(`processed_records = $${paramIndex++}`);
        params.push(data.processed_records);
      }

      if (data.successful_renewals !== undefined) {
        updates.push(`successful_renewals = $${paramIndex++}`);
        params.push(data.successful_renewals);
      }

      if (data.failed_validations !== undefined) {
        updates.push(`failed_validations = $${paramIndex++}`);
        params.push(data.failed_validations);
      }

      if (data.fraud_detected !== undefined) {
        updates.push(`fraud_detected = $${paramIndex++}`);
        params.push(data.fraud_detected);
      }

      if (data.early_renewals !== undefined) {
        updates.push(`early_renewals = $${paramIndex++}`);
        params.push(data.early_renewals);
      }

      if (data.inactive_renewals !== undefined) {
        updates.push(`inactive_renewals = $${paramIndex++}`);
        params.push(data.inactive_renewals);
      }

      if (data.progress_percentage !== undefined) {
        updates.push(`progress_percentage = $${paramIndex++}`);
        params.push(data.progress_percentage);
      }

      if (data.processing_summary !== undefined) {
        updates.push(`processing_summary = $${paramIndex++}`);
        params.push(JSON.stringify(data.processing_summary));
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(data.upload_uuid);

      const query = `
        UPDATE renewal_bulk_uploads
        SET ${updates.join(', ')}
        WHERE upload_uuid = $${paramIndex}
      `;

      await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to update upload progress', error);
    }
  }

  /**
   * Get upload status
   */
  static async getUploadStatus(upload_uuid: string): Promise<any> {
    try {
      const query = `
        SELECT * FROM vw_upload_progress_summary
        WHERE upload_uuid = $1
      `;

      return await executeQuerySingle(query, [upload_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get upload status', error);
    }
  }

  /**
   * Get fraud cases for upload
   */
  static async getFraudCases(upload_uuid: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM vw_fraud_cases_summary
        WHERE upload_uuid = $1
        ORDER BY detected_at DESC
      `;

      return await executeQuery(query, [upload_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get fraud cases', error);
    }
  }

  /**
   * Get upload records
   */
  static async getUploadRecords(upload_id: number, filters?: {
    status?: string;
    fraud_only?: boolean;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM renewal_bulk_upload_records
        WHERE upload_id = $1
      `;
      const params: any[] = [upload_id];
      let paramIndex = 2;

      if (filters?.status) {
        query += ` AND record_status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters?.fraud_only) {
        query += ` AND fraud_detected = true`;
      }

      query += ` ORDER BY row_number ASC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get upload records', error);
    }
  }
}

