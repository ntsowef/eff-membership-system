import { executeQuery, executeQuerySingle } from '../config/database';
import { createDatabaseError } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

// =====================================================================================
// INTERFACES
// =====================================================================================

export interface BulkApplicationUpload {
  upload_id: number;
  upload_uuid: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: number;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: string;
  processing_started_at?: Date;
  processing_completed_at?: Date;
  created_at: Date;
}

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

export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

export interface ProcessingResult {
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  errors: Array<{ row: number; error: string }>;
}

// =====================================================================================
// SERVICE CLASS
// =====================================================================================

export class MemberApplicationBulkUploadService {
  
  /**
   * Create bulk upload record
   */
  static async createBulkUpload(data: {
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    uploaded_by: number;
  }): Promise<string> {
    try {
      const upload_uuid = uuidv4();

      console.log('📝 Creating bulk upload with data:', {
        upload_uuid,
        file_name: data.file_name,
        file_type: data.file_type,
        file_size: data.file_size,
        uploaded_by: data.uploaded_by
      });

      const query = `
        INSERT INTO member_application_bulk_uploads (
          upload_uuid, file_name, file_path, file_type, file_size, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
        RETURNING upload_id
      `;

      const params = [
        upload_uuid,
        data.file_name,
        data.file_path,
        data.file_type,
        data.file_size,
        data.uploaded_by
      ];

      console.log('📝 Executing query with params:', params);

      const result = await executeQuerySingle<{ upload_id: number }>(query, params);

      console.log('✅ Bulk upload created successfully, result:', result);

      return upload_uuid;
    } catch (error) {
      console.error('❌ Error in createBulkUpload:', error);
      throw createDatabaseError('Failed to create bulk upload', error);
    }
  }

  /**
   * Parse Excel/CSV file
   */
  static async parseUploadFile(filePath: string, fileType: string): Promise<BulkApplicationRecord[]> {
    try {
      const records: BulkApplicationRecord[] = [];
      
      if (fileType === 'Excel') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        data.forEach((row: any, index: number) => {
          records.push({
            row_number: index + 2, // +2 because Excel is 1-based and has header row
            first_name: row['First Name'] || row['first_name'] || '',
            last_name: row['Last Name'] || row['last_name'] || row['surname'] || '',
            id_number: String(row['ID Number'] || row['id_number'] || '').trim(),
            date_of_birth: row['Date of Birth'] || row['date_of_birth'] || '',
            gender: row['Gender'] || row['gender'] || '',
            email: row['Email'] || row['email'] || '',
            cell_number: String(row['Cell Number'] || row['cell_number'] || row['phone'] || '').trim(),
            residential_address: row['Address'] || row['residential_address'] || row['address'] || '',
            ward_code: String(row['Ward Code'] || row['ward_code'] || '').trim(),
            province_code: row['Province Code'] || row['province_code'] || '',
            district_code: row['District Code'] || row['district_code'] || '',
            municipal_code: row['Municipal Code'] || row['municipal_code'] || '',
            application_type: row['Application Type'] || row['application_type'] || 'New',
            payment_method: row['Payment Method'] || row['payment_method'] || '',
            payment_reference: row['Payment Reference'] || row['payment_reference'] || '',
            payment_amount: parseFloat(row['Payment Amount'] || row['payment_amount'] || '0')
          });
        });
      } else if (fileType === 'CSV') {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        data.forEach((row: any, index: number) => {
          records.push({
            row_number: index + 2,
            first_name: row['First Name'] || row['first_name'] || '',
            last_name: row['Last Name'] || row['last_name'] || row['surname'] || '',
            id_number: String(row['ID Number'] || row['id_number'] || '').trim(),
            date_of_birth: row['Date of Birth'] || row['date_of_birth'] || '',
            gender: row['Gender'] || row['gender'] || '',
            email: row['Email'] || row['email'] || '',
            cell_number: String(row['Cell Number'] || row['cell_number'] || row['phone'] || '').trim(),
            residential_address: row['Address'] || row['residential_address'] || row['address'] || '',
            ward_code: String(row['Ward Code'] || row['ward_code'] || '').trim(),
            province_code: row['Province Code'] || row['province_code'] || '',
            district_code: row['District Code'] || row['district_code'] || '',
            municipal_code: row['Municipal Code'] || row['municipal_code'] || '',
            application_type: row['Application Type'] || row['application_type'] || 'New',
            payment_method: row['Payment Method'] || row['payment_method'] || '',
            payment_reference: row['Payment Reference'] || row['payment_reference'] || '',
            payment_amount: parseFloat(row['Payment Amount'] || row['payment_amount'] || '0')
          });
        });
      }

      return records;
    } catch (error) {
      throw createDatabaseError('Failed to parse upload file', error);
    }
  }

  /**
   * Validate South African ID number using Luhn algorithm and date validation
   */
  static validateSAIDNumber(idNumber: string): { isValid: boolean; error?: string } {
    // Check if ID number is provided and is 13 digits
    if (!idNumber || !/^\d{13}$/.test(idNumber)) {
      return {
        isValid: false,
        error: 'Invalid ID number format - must be exactly 13 digits'
      };
    }

    // Extract date components (YYMMDD)
    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10);
    const day = parseInt(idNumber.substring(4, 6), 10);

    // Validate month (01-12)
    if (month < 1 || month > 12) {
      return {
        isValid: false,
        error: `Invalid ID number - month must be between 01-12 (found: ${idNumber.substring(2, 4)})`
      };
    }

    // Validate day (01-31)
    if (day < 1 || day > 31) {
      return {
        isValid: false,
        error: `Invalid ID number - day must be between 01-31 (found: ${idNumber.substring(4, 6)})`
      };
    }

    // Determine full year (assume 1900s for years >= 25, 2000s for years < 25)
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year > currentYear ? 1900 + year : 2000 + year;

    // Validate date is not in the future
    const birthDate = new Date(fullYear, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      return {
        isValid: false,
        error: 'Invalid ID number - date of birth cannot be in the future'
      };
    }

    // Validate the date is valid (e.g., no Feb 30, no Apr 31)
    if (
      birthDate.getFullYear() !== fullYear ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return {
        isValid: false,
        error: `Invalid ID number - date of birth is invalid (${idNumber.substring(0, 6)} = ${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')})`
      };
    }

    // Luhn algorithm checksum validation
    let sum = 0;
    let alternate = false;

    // Process digits from right to left (excluding the last checksum digit)
    for (let i = idNumber.length - 2; i >= 0; i--) {
      let digit = parseInt(idNumber.charAt(i), 10);

      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      alternate = !alternate;
    }

    // Calculate checksum
    const checksum = (10 - (sum % 10)) % 10;
    const providedChecksum = parseInt(idNumber.charAt(12), 10);

    if (checksum !== providedChecksum) {
      return {
        isValid: false,
        error: `Invalid ID number - checksum validation failed (expected: ${checksum}, got: ${providedChecksum})`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate South African cell number format and normalize
   */
  static validateCellNumber(cellNumber: string): {
    isValid: boolean;
    normalizedNumber?: string;
    error?: string;
  } {
    if (!cellNumber || cellNumber.trim() === '') {
      return {
        isValid: false,
        error: 'Cell number is required'
      };
    }

    // Remove all non-digit characters except leading +
    let cleaned = cellNumber.trim();
    const hasPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    // Check for valid length and format
    let normalized = '';

    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Format: 0XXXXXXXXX
      normalized = cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('27')) {
      // Format: 27XXXXXXXXX - convert to 0XXXXXXXXX
      normalized = '0' + cleaned.substring(2);
    } else if (hasPlus && cleaned.length === 11 && cleaned.startsWith('27')) {
      // Format: +27XXXXXXXXX - convert to 0XXXXXXXXX
      normalized = '0' + cleaned.substring(2);
    } else {
      return {
        isValid: false,
        error: 'Invalid cell number - must be 10 digits starting with 0 or 11 digits starting with 27'
      };
    }

    // Validate South African mobile prefixes
    const validPrefixes = [
      '060', '061', '062', '063', '064', '065', '066', '067', '068', '069',
      '071', '072', '073', '074', '076', '078', '079',
      '081', '082', '083', '084'
    ];

    const prefix = normalized.substring(0, 3);
    if (!validPrefixes.includes(prefix)) {
      return {
        isValid: false,
        error: `Invalid cell number - invalid South African mobile prefix (${prefix}). Valid prefixes: ${validPrefixes.join(', ')}`
      };
    }

    return {
      isValid: true,
      normalizedNumber: normalized
    };
  }

  /**
   * Validate record with enhanced checks including SA ID and cell number validation
   */
  static validateRecord(record: BulkApplicationRecord): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!record.first_name || record.first_name.trim() === '') {
      errors.push('First name is required');
    }
    if (!record.last_name || record.last_name.trim() === '') {
      errors.push('Last name is required');
    }

    // Enhanced ID number validation
    if (!record.id_number || record.id_number.trim() === '') {
      errors.push('ID number is required');
    } else {
      const idValidation = this.validateSAIDNumber(record.id_number);
      if (!idValidation.isValid) {
        errors.push(idValidation.error || 'Invalid ID number');
      }
    }

    if (!record.date_of_birth) {
      errors.push('Date of birth is required');
    }

    if (!record.gender) {
      errors.push('Gender is required');
    } else {
      // Gender validation
      const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      if (!validGenders.includes(record.gender)) {
        errors.push(`Invalid gender. Must be one of: ${validGenders.join(', ')}`);
      }
    }

    // Enhanced cell number validation
    if (!record.cell_number || record.cell_number.trim() === '') {
      errors.push('Cell number is required');
    } else {
      const cellValidation = this.validateCellNumber(record.cell_number);
      if (!cellValidation.isValid) {
        errors.push(cellValidation.error || 'Invalid cell number');
      } else {
        // Update record with normalized cell number
        record.cell_number = cellValidation.normalizedNumber || record.cell_number;
      }
    }

    if (!record.residential_address || record.residential_address.trim() === '') {
      errors.push('Residential address is required');
    }

    if (!record.ward_code || record.ward_code.trim() === '') {
      errors.push('Ward code is required');
    }

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Check if member exists and get their status
   * Returns detailed information about existing members
   */
  static async checkExistingMember(idNumber: string): Promise<{
    exists: boolean;
    status?: string;
    memberId?: number;
    statusCode?: string;
  }> {
    try {
      const query = `
        SELECT
          m.member_id,
          ms.status_name,
          ms.status_code
        FROM members_consolidated m
        LEFT JOIN memberships mb ON m.member_id = mb.member_id
        LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
        WHERE m.id_number = $1
        ORDER BY mb.created_at DESC
        LIMIT 1
      `;

      const results = await executeQuery(query, [idNumber]);

      if (results.length === 0) {
        return { exists: false };
      }

      return {
        exists: true,
        status: results[0].status_name || 'Unknown',
        statusCode: results[0].status_code || 'UNK',
        memberId: results[0].member_id
      };
    } catch (error) {
      console.error('Error checking existing member:', error);
      return { exists: false };
    }
  }

  /**
   * Check for fraud cases associated with ID number
   */
  static async checkFraudCases(idNumber: string): Promise<{
    hasFraud: boolean;
    fraudCount: number;
    cases?: any[];
  }> {
    try {
      const query = `
        SELECT
          fraud_case_id,
          fraud_type,
          fraud_severity,
          case_status,
          fraud_description
        FROM renewal_fraud_cases
        WHERE member_id_number = $1
          AND case_status IN ('Detected', 'Under Review', 'Confirmed')
        ORDER BY detected_at DESC
      `;

      const results = await executeQuery(query, [idNumber]);

      return {
        hasFraud: results.length > 0,
        fraudCount: results.length,
        cases: results
      };
    } catch (error) {
      console.error('Error checking fraud cases:', error);
      return {
        hasFraud: false,
        fraudCount: 0,
        cases: []
      };
    }
  }

  /**
   * Enhanced duplicate check with status categorization
   * Returns detailed information about why the application should be blocked
   */
  static async checkDuplicate(idNumber: string): Promise<{
    isDuplicate: boolean;
    reason?: string;
    category?: string;
    shouldBlock: boolean;
  }> {
    try {
      // Check existing member status
      const memberCheck = await this.checkExistingMember(idNumber);

      if (memberCheck.exists) {
        const status = memberCheck.status || 'Unknown';

        // Categorize based on status
        if (status === 'Suspended') {
          return {
            isDuplicate: true,
            reason: `ID number ${idNumber} belongs to a SUSPENDED member - application BLOCKED until suspension lifted`,
            category: 'FAILED_SUSPENDED',
            shouldBlock: true
          };
        } else if (status === 'Cancelled') {
          return {
            isDuplicate: true,
            reason: `ID number ${idNumber} belongs to a member who RESIGNED - requires manual review`,
            category: 'FAILED_RESIGNED',
            shouldBlock: true // Block for manual review
          };
        } else if (status === 'Active') {
          return {
            isDuplicate: true,
            reason: `ID number ${idNumber} belongs to an ACTIVE member - duplicate application`,
            category: 'DUPLICATE_ACTIVE',
            shouldBlock: true
          };
        } else if (status === 'Expired') {
          // Expired members can reapply - this is a renewal scenario
          return {
            isDuplicate: false,
            shouldBlock: false
          };
        }
      }

      // Check for fraud cases
      const fraudCheck = await this.checkFraudCases(idNumber);
      if (fraudCheck.hasFraud) {
        return {
          isDuplicate: true,
          reason: `FRAUD DETECTED: ID number ${idNumber} has ${fraudCheck.fraudCount} fraud case(s) on record - application PERMANENTLY BLOCKED`,
          category: 'FAILED_FRAUD',
          shouldBlock: true
        };
      }

      // Check in membership_applications table for pending applications
      const appQuery = `
        SELECT COUNT(*) as count
        FROM membership_applications
        WHERE id_number = $1
        AND status IN ('Draft', 'Submitted', 'Under Review')
      `;
      const appResult = await executeQuerySingle<{ count: number }>(appQuery, [idNumber]);

      if (appResult && appResult.count > 0) {
        return {
          isDuplicate: true,
          reason: `ID number ${idNumber} already has a pending application`,
          category: 'DUPLICATE_PENDING',
          shouldBlock: true
        };
      }

      return {
        isDuplicate: false,
        shouldBlock: false
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        shouldBlock: false
      };
    }
  }

  /**
   * Update upload progress
   */
  static async updateUploadProgress(
    upload_uuid: string,
    data: {
      total_records?: number;
      processed_records?: number;
      successful_records?: number;
      failed_records?: number;
      duplicate_records?: number;
      status?: string;
    }
  ): Promise<void> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

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
      if (data.status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(data.status);
        
        if (data.status === 'Processing') {
          updates.push(`processing_started_at = CURRENT_TIMESTAMP`);
        } else if (data.status === 'Completed' || data.status === 'Failed') {
          updates.push(`processing_completed_at = CURRENT_TIMESTAMP`);
        }
      }

      params.push(upload_uuid);

      const query = `
        UPDATE member_application_bulk_uploads 
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
  static async getUploadStatus(upload_uuid: string): Promise<BulkApplicationUpload | null> {
    try {
      const query = `
        SELECT * FROM member_application_bulk_uploads 
        WHERE upload_uuid = $1
      `;
      return await executeQuerySingle<BulkApplicationUpload>(query, [upload_uuid]);
    } catch (error) {
      throw createDatabaseError('Failed to get upload status', error);
    }
  }
}

