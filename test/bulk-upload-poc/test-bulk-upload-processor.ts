/**
 * PROOF OF CONCEPT: Standalone Bulk Upload Processor in Node.js/TypeScript
 * 
 * This script demonstrates the complete bulk upload processing workflow:
 * 1. Read Excel file
 * 2. Validate South African ID numbers (Luhn checksum)
 * 3. Detect duplicates within file
 * 4. Check existing members in database
 * 5. Perform IEC voter verification
 * 6. Insert/update database records
 * 7. Generate comprehensive Excel report
 * 
 * Usage: ts-node test-bulk-upload-processor.ts <excel-file-path>
 * Example: ts-node test-bulk-upload-processor.ts "../../uploads/test-members.xlsx"
 */

import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const IEC_API_CONFIG = {
  baseURL: process.env.IEC_API_BASE_URL || 'https://iec.example.com',
  clientId: process.env.IEC_CLIENT_ID || '',
  clientSecret: process.env.IEC_CLIENT_SECRET || '',
  enabled: process.env.IEC_VERIFICATION_ENABLED === 'true',
};

const REPORTS_DIR = path.join(__dirname, 'reports');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BulkUploadRecord {
  row_number: number;
  'ID Number': string;
  Name?: string;
  Firstname?: string;
  Surname?: string;
  'Cell Number'?: string;
  Email?: string;
  'Last Payment'?: any;
  'Expiry Date'?: any;
  'Date Joined'?: any;
  [key: string]: any;
}

interface InvalidIdRecord extends BulkUploadRecord {
  error: string;
}

interface DuplicateRecord extends BulkUploadRecord {
  duplicate_of_row: number;
}

interface ExistingMemberRecord extends BulkUploadRecord {
  member_id: number;
  created_at: Date;
  updated_at: Date;
  existing_ward_code?: string;
  existing_ward_name?: string;
  existing_vd_code?: string;
  existing_vd_name?: string;
  existing_firstname?: string;
  existing_surname?: string;
}

interface ValidationResult {
  valid_records: BulkUploadRecord[];
  invalid_ids: InvalidIdRecord[];
  duplicates: DuplicateRecord[];
  existing_members: ExistingMemberRecord[];
  new_members: BulkUploadRecord[];
  validation_stats: {
    total_records: number;
    valid_ids: number;
    invalid_ids: number;
    unique_records: number;
    duplicates: number;
    existing_members: number;
    new_members: number;
  };
}

interface IECVoterDetails {
  id_number: string;
  is_registered: boolean;
  voter_status: string;
  voting_district_code?: string;
  ward_code?: string;
  province?: string;
  municipality?: string;
  voting_station?: string;
}

interface ProcessingResult {
  total_processed: number;
  successful_inserts: number;
  successful_updates: number;
  failed_operations: number;
  iec_verified: number;
  iec_not_registered: number;
  iec_errors: number;
}

// ============================================================================
// DATABASE CONNECTION POOL
// ============================================================================

const pool = new Pool(DB_CONFIG);

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert Excel serial date to JavaScript Date
 * Excel stores dates as number of days since 1900-01-01
 */
function excelSerialToDate(serial: number): Date {
  // Excel incorrectly treats 1900 as a leap year, so we need to adjust
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const days = Math.floor(serial);
  const milliseconds = days * 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + milliseconds);
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Parse date from various formats (Excel serial, ISO string, Date object)
 */
function parseDate(value: any): Date | null {
  if (!value) return null;

  // Already a Date object
  if (value instanceof Date) return value;

  // Excel serial number (numeric)
  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }

  // ISO string or other string format
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Calculate expiry date from payment date (add 24 months)
 */
function calculateExpiryDate(paymentDate: any): Date | null {
  const parsed = parseDate(paymentDate);
  if (!parsed) return null;
  return addMonths(parsed, 24);
}

// ============================================================================
// ID VALIDATION SERVICE
// ============================================================================

class IdValidationService {
  /**
   * Normalize South African ID number (remove spaces, ensure 13 digits)
   */
  static normalizeSAIdNumber(idNumber: string | number): string | null {
    if (!idNumber) return null;
    
    const cleaned = String(idNumber).trim().replace(/\s+/g, '');
    
    if (!/^\d{13}$/.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Validate South African ID number using Luhn algorithm and date validation
   */
  static validateSAIdNumber(idNumber: string): { valid: boolean; error?: string } {
    if (!idNumber || typeof idNumber !== 'string') {
      return { valid: false, error: 'ID number is required' };
    }

    // Remove spaces and ensure it's 13 digits
    const idClean = idNumber.trim().replace(/\s+/g, '');
    if (!/^\d{13}$/.test(idClean)) {
      return { valid: false, error: `ID number must be exactly 13 digits (found ${idClean.length})` };
    }

    // Validate date portion (YYMMDD)
    const year = parseInt(idClean.substring(0, 2));
    const month = parseInt(idClean.substring(2, 4));
    const day = parseInt(idClean.substring(4, 6));

    // Validate month
    if (month < 1 || month > 12) {
      return { valid: false, error: `Invalid month in ID number: ${month.toString().padStart(2, '0')}` };
    }

    // Validate day
    if (day < 1 || day > 31) {
      return { valid: false, error: `Invalid day in ID number: ${day.toString().padStart(2, '0')}` };
    }

    // Determine full year (assume < 25 is 2000s, >= 25 is 1900s)
    const fullYear = year < 25 ? 2000 + year : 1900 + year;

    // Validate the date is valid (e.g., no Feb 30, no Apr 31)
    try {
      const birthDate = new Date(fullYear, month - 1, day);
      if (
        birthDate.getFullYear() !== fullYear ||
        birthDate.getMonth() !== month - 1 ||
        birthDate.getDate() !== day
      ) {
        return { valid: false, error: 'Invalid date in ID number' };
      }

      // Check if date is not in the future
      if (birthDate > new Date()) {
        return { valid: false, error: 'Date of birth cannot be in the future' };
      }
    } catch (e) {
      return { valid: false, error: 'Invalid date in ID number' };
    }

    // Luhn algorithm checksum validation
    try {
      const digits = idClean.split('').map(Number);
      let checksum = 0;

      // Process odd positions (from left, 0-indexed)
      for (let i = 0; i < 13; i += 2) {
        checksum += digits[i];
      }

      // Process even positions (from left, 0-indexed) - double and subtract 9 if > 9
      for (let i = 1; i < 13; i += 2) {
        const doubled = digits[i] * 2;
        checksum += doubled < 10 ? doubled : doubled - 9;
      }

      if (checksum % 10 !== 0) {
        return { valid: false, error: 'Invalid ID number checksum' };
      }
    } catch (e) {
      return { valid: false, error: `Checksum validation error: ${e}` };
    }

    return { valid: true };
  }
}

// ============================================================================
// PRE-VALIDATION SERVICE
// ============================================================================

class PreValidationService {
  /**
   * Validate uploaded records before IEC verification
   */
  static async validateRecords(records: BulkUploadRecord[]): Promise<ValidationResult> {
    console.log(`\n📋 PRE-VALIDATION: Processing ${records.length} records`);

    // Step 1: Validate ID numbers
    const { validRecords, invalidIds } = this.validateIdNumbers(records);
    console.log(`   ✅ Valid IDs: ${validRecords.length}`);
    console.log(`   ❌ Invalid IDs: ${invalidIds.length}`);

    if (invalidIds.length > 0) {
      console.log(`   📋 Sample invalid ID: ${invalidIds[0].error}`);
    }

    // Step 2: Detect duplicates within file
    const { uniqueRecords, duplicates } = this.detectDuplicates(validRecords);
    console.log(`   ✅ Unique records: ${uniqueRecords.length}`);
    console.log(`   ⚠️  Duplicates: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log(`   📋 Sample duplicate: ID ${duplicates[0]['ID Number']} (row ${duplicates[0].row_number})`);
    }

    // Step 3: Check existing members in database
    const { existingMembers, newMembers } = await this.checkExistingMembers(uniqueRecords);
    console.log(`   📋 Existing members: ${existingMembers.length}`);
    console.log(`   🆕 New members: ${newMembers.length}`);

    return {
      valid_records: uniqueRecords,
      invalid_ids: invalidIds,
      duplicates,
      existing_members: existingMembers,
      new_members: newMembers,
      validation_stats: {
        total_records: records.length,
        valid_ids: validRecords.length,
        invalid_ids: invalidIds.length,
        unique_records: uniqueRecords.length,
        duplicates: duplicates.length,
        existing_members: existingMembers.length,
        new_members: newMembers.length,
      },
    };
  }

  /**
   * Validate ID numbers using Luhn algorithm
   */
  private static validateIdNumbers(records: BulkUploadRecord[]): {
    validRecords: BulkUploadRecord[];
    invalidIds: InvalidIdRecord[];
  } {
    const validRecords: BulkUploadRecord[] = [];
    const invalidIds: InvalidIdRecord[] = [];

    records.forEach((record, index) => {
      const idNumber = IdValidationService.normalizeSAIdNumber(record['ID Number']);

      if (!idNumber) {
        invalidIds.push({
          ...record,
          row_number: index + 2, // +2 for Excel (header + 0-index)
          'ID Number': record['ID Number'] || 'MISSING',
          error: 'Invalid or missing ID number',
        });
        return;
      }

      const validation = IdValidationService.validateSAIdNumber(idNumber);

      if (!validation.valid) {
        invalidIds.push({
          ...record,
          row_number: index + 2,
          'ID Number': idNumber,
          error: validation.error!,
        });
      } else {
        validRecords.push({ ...record, 'ID Number': idNumber });
      }
    });

    return { validRecords, invalidIds };
  }

  /**
   * Detect duplicate ID numbers within the file
   */
  private static detectDuplicates(records: BulkUploadRecord[]): {
    uniqueRecords: BulkUploadRecord[];
    duplicates: DuplicateRecord[];
  } {
    const seen = new Map<string, BulkUploadRecord>();
    const duplicates: DuplicateRecord[] = [];
    const uniqueRecords: BulkUploadRecord[] = [];

    records.forEach((record) => {
      const idNumber = record['ID Number'];

      if (seen.has(idNumber)) {
        // This is a duplicate
        duplicates.push({
          ...record,
          duplicate_of_row: seen.get(idNumber)!.row_number,
        });
      } else {
        // First occurrence
        seen.set(idNumber, record);
        uniqueRecords.push(record);
      }
    });

    return { uniqueRecords, duplicates };
  }

  /**
   * Check which members already exist in database
   */
  private static async checkExistingMembers(records: BulkUploadRecord[]): Promise<{
    existingMembers: ExistingMemberRecord[];
    newMembers: BulkUploadRecord[];
  }> {
    if (records.length === 0) {
      return { existingMembers: [], newMembers: [] };
    }

    const idNumbers = records.map((r) => r['ID Number']);

    // Query database for existing members with ward and VD information
    const query = `
      SELECT
        m.id_number,
        m.member_id,
        m.created_at,
        m.updated_at,
        m.firstname,
        m.surname,
        m.ward_code,
        w.ward_name,
        m.voting_district_code,
        vd.voting_district_name
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      WHERE m.id_number = ANY($1)
    `;

    const result = await pool.query(query, [idNumbers]);
    const existingRecords = result.rows;
    const existingIdSet = new Set(existingRecords.map((r: any) => r.id_number));

    const existingMembers: ExistingMemberRecord[] = [];
    const newMembers: BulkUploadRecord[] = [];

    records.forEach((record) => {
      if (existingIdSet.has(record['ID Number'])) {
        const dbRecord = existingRecords.find((r: any) => r.id_number === record['ID Number']);
        existingMembers.push({
          ...record,
          member_id: dbRecord.member_id,
          created_at: dbRecord.created_at,
          updated_at: dbRecord.updated_at,
          existing_ward_code: dbRecord.ward_code,
          existing_ward_name: dbRecord.ward_name,
          existing_vd_code: dbRecord.voting_district_code,
          existing_vd_name: dbRecord.voting_district_name,
          existing_firstname: dbRecord.firstname,
          existing_surname: dbRecord.surname,
        });
      } else {
        newMembers.push(record);
      }
    });

    return { existingMembers, newMembers };
  }
}

// ============================================================================
// IEC VERIFICATION SERVICE (Simplified for POC)
// ============================================================================

class IECVerificationService {
  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  /**
   * Get IEC API access token
   */
  private static async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!IEC_API_CONFIG.enabled) {
      throw new Error('IEC API is disabled in configuration');
    }

    try {
      const response = await axios.post(
        `${IEC_API_CONFIG.baseURL}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: IEC_API_CONFIG.clientId,
          client_secret: IEC_API_CONFIG.clientSecret,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 min early

      return this.accessToken!;
    } catch (error: any) {
      console.error('❌ Failed to get IEC access token:', error.message);
      throw new Error('Failed to authenticate with IEC API');
    }
  }

  /**
   * Verify voter details by ID number
   */
  static async verifyVoter(idNumber: string): Promise<IECVoterDetails> {
    if (!IEC_API_CONFIG.enabled) {
      // Return mock data for testing when IEC is disabled
      return {
        id_number: idNumber,
        is_registered: true,
        voter_status: 'Registered',
        voting_district_code: '12345678',
        ward_code: '12345',
        province: 'Gauteng',
        municipality: 'City of Johannesburg',
        voting_station: 'Test Voting Station',
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${IEC_API_CONFIG.baseURL}/api/v1/Voters/IDNumber?ID=${idNumber}`,
        {
          headers: {
            Authorization: `bearer ${token}`,
          },
          timeout: 12000,
        }
      );

      if (response.status === 200 && response.data) {
        return {
          id_number: idNumber,
          is_registered: response.data.bRegistered || false,
          voter_status: response.data.VoterStatus || 'Unknown',
          voting_district_code: response.data.VotingStation?.Delimitation?.VDNumber || null,
          ward_code: response.data.VotingStation?.Delimitation?.WardID || null,
          province: response.data.VotingStation?.Delimitation?.Province || null,
          municipality: response.data.VotingStation?.Delimitation?.Municipality || null,
          voting_station: response.data.VotingStation?.Name || null,
        };
      }

      // Not found
      return {
        id_number: idNumber,
        is_registered: false,
        voter_status: 'Not Registered',
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          id_number: idNumber,
          is_registered: false,
          voter_status: 'Not Registered',
        };
      }

      console.error(`❌ IEC verification error for ${idNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Verify multiple voters with rate limiting
   */
  static async verifyVotersBatch(
    idNumbers: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, IECVoterDetails>> {
    const results = new Map<string, IECVoterDetails>();
    const batchSize = 5; // Process 5 at a time
    const delayMs = 1000; // 1 second delay between batches

    console.log(`\n🔍 IEC VERIFICATION: Processing ${idNumbers.length} records`);

    for (let i = 0; i < idNumbers.length; i += batchSize) {
      const batch = idNumbers.slice(i, i + batchSize);
      const promises = batch.map((id) =>
        this.verifyVoter(id).catch((error) => {
          console.error(`   ❌ Failed to verify ${id}:`, error.message);
          return {
            id_number: id,
            is_registered: false,
            voter_status: 'Verification Error',
          };
        })
      );

      const batchResults = await Promise.all(promises);

      batchResults.forEach((result) => {
        results.set(result.id_number, result);
      });

      const processed = Math.min(i + batchSize, idNumbers.length);
      console.log(`   ✅ Verified ${processed}/${idNumbers.length} records`);

      if (onProgress) {
        onProgress(processed, idNumbers.length);
      }

      // Delay between batches to respect rate limits
      if (i + batchSize < idNumbers.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

// ============================================================================
// DATABASE OPERATIONS SERVICE
// ============================================================================

class DatabaseOperationsService {
  /**
   * Insert new member into database
   */
  static async insertMember(
    record: BulkUploadRecord,
    iecDetails: IECVoterDetails
  ): Promise<number> {
    // Parse dates
    const dateJoined = parseDate(record['Date Joined']);
    const lastPayment = parseDate(record['Last Payment']);
    const expiryDate = parseDate(record['Expiry Date']);

    const query = `
      INSERT INTO members_consolidated (
        id_number, firstname, surname, cell_number, email,
        voter_district_code, membership_status_id,
        date_joined, last_payment_date, expiry_date,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING member_id
    `;

    const params = [
      record['ID Number'],
      record.Name || record.Firstname || null,
      record.Surname || null,
      record['Cell Number'] || null,
      record.Email || null,
      iecDetails.voting_district_code || null,
      1, // membership_status_id = 1 (Good Standing)
      dateJoined,
      lastPayment,
      expiryDate,
    ];

    const result = await pool.query(query, params);
    return result.rows[0].member_id;
  }

  /**
   * Update existing member in database
   */
  static async updateMember(
    memberId: number,
    record: BulkUploadRecord,
    iecDetails: IECVoterDetails
  ): Promise<boolean> {
    // Parse dates
    const lastPayment = parseDate(record['Last Payment']);
    const expiryDate = parseDate(record['Expiry Date']);

    const query = `
      UPDATE members_consolidated
      SET
        firstname = COALESCE($1, firstname),
        surname = COALESCE($2, surname),
        cell_number = COALESCE($3, cell_number),
        email = COALESCE($4, email),
        voter_district_code = COALESCE($5, voter_district_code),
        last_payment_date = COALESCE($6, last_payment_date),
        expiry_date = COALESCE($7, expiry_date),
        updated_at = NOW()
      WHERE member_id = $8
    `;

    const params = [
      record.Name || record.Firstname || null,
      record.Surname || null,
      record['Cell Number'] || null,
      record.Email || null,
      iecDetails.voting_district_code || null,
      lastPayment,
      expiryDate,
      memberId,
    ];

    const result = await pool.query(query, params);
    return result.rowCount! > 0;
  }

  /**
   * Process all records (insert new, update existing)
   */
  static async processRecords(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    iecResults: Map<string, IECVoterDetails>
  ): Promise<ProcessingResult> {
    console.log(`\n💾 DATABASE OPERATIONS: Processing ${newMembers.length + existingMembers.length} records`);

    const result: ProcessingResult = {
      total_processed: 0,
      successful_inserts: 0,
      successful_updates: 0,
      failed_operations: 0,
      iec_verified: 0,
      iec_not_registered: 0,
      iec_errors: 0,
    };

    // Process new members (inserts)
    for (const record of newMembers) {
      try {
        const iecDetails = iecResults.get(record['ID Number']);
        if (!iecDetails) {
          console.error(`   ❌ No IEC details for ${record['ID Number']}`);
          result.failed_operations++;
          continue;
        }

        await this.insertMember(record, iecDetails);
        result.successful_inserts++;
        result.total_processed++;

        if (iecDetails.is_registered) {
          result.iec_verified++;
        } else {
          result.iec_not_registered++;
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to insert ${record['ID Number']}:`, error.message);
        result.failed_operations++;
      }
    }

    // Process existing members (updates)
    for (const record of existingMembers) {
      try {
        const iecDetails = iecResults.get(record['ID Number']);
        if (!iecDetails) {
          console.error(`   ❌ No IEC details for ${record['ID Number']}`);
          result.failed_operations++;
          continue;
        }

        await this.updateMember(record.member_id, record, iecDetails);
        result.successful_updates++;
        result.total_processed++;

        if (iecDetails.is_registered) {
          result.iec_verified++;
        } else {
          result.iec_not_registered++;
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to update ${record['ID Number']}:`, error.message);
        result.failed_operations++;
      }
    }

    console.log(`   ✅ Inserts: ${result.successful_inserts}`);
    console.log(`   ✅ Updates: ${result.successful_updates}`);
    console.log(`   ❌ Failed: ${result.failed_operations}`);
    console.log(`   🗳️  Registered voters: ${result.iec_verified}`);
    console.log(`   ⚠️  Not registered: ${result.iec_not_registered}`);

    return result;
  }
}

// ============================================================================
// EXCEL REPORT GENERATION SERVICE
// ============================================================================

class ExcelReportService {
  /**
   * Generate comprehensive Excel report
   */
  static async generateReport(
    originalData: any[],
    validationResult: ValidationResult,
    processingResult: ProcessingResult,
    iecResults: Map<string, IECVoterDetails>,
    outputPath: string
  ): Promise<string> {
    console.log(`\n📊 EXCEL REPORT: Generating report...`);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    this.createSummarySheet(workbook, validationResult, processingResult);

    // Sheet 2: All Uploaded Rows (with IEC status and existing member info)
    this.createAllUploadedRowsSheet(workbook, originalData, validationResult, iecResults);

    // Sheet 3: Invalid IDs
    this.createInvalidIdsSheet(workbook, validationResult.invalid_ids);

    // Sheet 4: Duplicates
    this.createDuplicatesSheet(workbook, validationResult.duplicates);

    // Sheet 5: Not Registered Voters
    const notRegistered = this.getNotRegisteredVoters(
      validationResult.valid_records,
      iecResults
    );
    this.createNotRegisteredSheet(workbook, notRegistered);

    // Sheet 6: New Members
    this.createNewMembersSheet(workbook, validationResult.new_members);

    // Sheet 7: Existing Members (Updated)
    this.createExistingMembersSheet(workbook, validationResult.existing_members);

    // Save workbook
    await workbook.xlsx.writeFile(outputPath);
    console.log(`   ✅ Report saved to: ${outputPath}`);

    return outputPath;
  }

  /**
   * Create Summary sheet
   */
  private static createSummarySheet(
    workbook: ExcelJS.Workbook,
    validationResult: ValidationResult,
    processingResult: ProcessingResult
  ): void {
    const sheet = workbook.addWorksheet('Summary');

    // Title
    sheet.mergeCells('A1:B1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Bulk Upload Processing Summary';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Timestamp
    sheet.mergeCells('A2:B2');
    const timestampCell = sheet.getCell('A2');
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.alignment = { horizontal: 'center' };

    // Validation Statistics
    sheet.getCell('A4').value = 'VALIDATION STATISTICS';
    sheet.getCell('A4').font = { bold: true, size: 12 };

    const validationStats = [
      ['Total Records Uploaded', validationResult.validation_stats.total_records],
      ['Valid ID Numbers', validationResult.validation_stats.valid_ids],
      ['Invalid ID Numbers', validationResult.validation_stats.invalid_ids],
      ['Unique Records', validationResult.validation_stats.unique_records],
      ['Duplicate Records', validationResult.validation_stats.duplicates],
      ['Existing Members', validationResult.validation_stats.existing_members],
      ['New Members', validationResult.validation_stats.new_members],
    ];

    let row = 5;
    validationStats.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Processing Statistics
    sheet.getCell(`A${row + 1}`).value = 'PROCESSING STATISTICS';
    sheet.getCell(`A${row + 1}`).font = { bold: true, size: 12 };

    const processingStats = [
      ['Total Processed', processingResult.total_processed],
      ['Successful Inserts', processingResult.successful_inserts],
      ['Successful Updates', processingResult.successful_updates],
      ['Failed Operations', processingResult.failed_operations],
      ['IEC Verified (Registered)', processingResult.iec_verified],
      ['IEC Not Registered', processingResult.iec_not_registered],
    ];

    row += 2;
    processingStats.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 20;

    // Styling
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
  }

  /**
   * Create All Uploaded Rows sheet with IEC status and existing member info
   */
  private static createAllUploadedRowsSheet(
    workbook: ExcelJS.Workbook,
    originalData: any[],
    validationResult: ValidationResult,
    iecResults: Map<string, IECVoterDetails>
  ): void {
    const sheet = workbook.addWorksheet('All Uploaded Rows');

    if (originalData.length === 0) {
      sheet.getCell('A1').value = 'No data uploaded';
      return;
    }

    // Create existing members lookup
    const existingMembersMap = new Map<string, ExistingMemberRecord>();
    validationResult.existing_members.forEach(em => {
      existingMembersMap.set(em['ID Number'], em);
    });

    // Get headers from first row and add status columns
    const originalHeaders = Object.keys(originalData[0]).filter(h =>
      !h.startsWith('_') && h !== 'row_number' && h !== '__EMPTY'
    );

    const statusHeaders = [
      'IEC Registered',
      'IEC Ward',
      'IEC VD Code',
      'Already Exists',
      'Existing Member Name',
      'Existing Ward',
      'Existing VD'
    ];

    const allHeaders = [...originalHeaders, ...statusHeaders];
    sheet.addRow(allHeaders);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows with status information
    originalData.forEach((record) => {
      const idNumber = record['ID Number'];
      const iecDetails = iecResults.get(idNumber);
      const existingMember = existingMembersMap.get(idNumber);

      const values = [
        ...originalHeaders.map((h) => record[h]),
        iecDetails?.is_registered ? 'YES' : 'NO',
        iecDetails?.ward_code || 'N/A',
        iecDetails?.voting_district_code || 'N/A',
        existingMember ? 'YES' : 'NO',
        existingMember ? `${existingMember.existing_firstname || ''} ${existingMember.existing_surname || ''}`.trim() : 'N/A',
        existingMember?.existing_ward_name || existingMember?.existing_ward_code || 'N/A',
        existingMember?.existing_vd_name || existingMember?.existing_vd_code || 'N/A'
      ];

      const row = sheet.addRow(values);

      // Color code based on status
      if (!iecDetails?.is_registered) {
        // Not registered - light red
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      } else if (existingMember) {
        // Existing member - light yellow
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' },
        };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < originalHeaders.length) {
        column.width = 15;
      } else {
        column.width = 20; // Wider for status columns
      }
    });
  }

  /**
   * Create Invalid IDs sheet
   */
  private static createInvalidIdsSheet(
    workbook: ExcelJS.Workbook,
    invalidIds: InvalidIdRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Invalid IDs');

    if (invalidIds.length === 0) {
      sheet.getCell('A1').value = 'No invalid ID numbers found';
      return;
    }

    // Get all column headers from first invalid record (excluding internal fields)
    const firstRecord = invalidIds[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'error' && h !== '__EMPTY'
    );

    // Put error and row number first, then all other columns
    const headers = ['Row Number', 'Error', 'ID Number', ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number')];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' },
    };

    // Add data rows with all original data
    invalidIds.forEach((record) => {
      const values = [
        record.row_number,
        record.error,
        record['ID Number'],
        ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number').map(h => record[h])
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < 3) {
        column.width = 15; // Row Number, Error, ID Number
      } else {
        column.width = 20; // Other columns
      }
    });
  }

  /**
   * Create Duplicates sheet
   */
  private static createDuplicatesSheet(
    workbook: ExcelJS.Workbook,
    duplicates: DuplicateRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Duplicates');

    if (duplicates.length === 0) {
      sheet.getCell('A1').value = 'No duplicate records found';
      return;
    }

    // Get all column headers from first duplicate record (excluding internal fields)
    const firstRecord = duplicates[0];
    const allColumns = Object.keys(firstRecord).filter(h =>
      !h.startsWith('_') && h !== 'duplicate_of_row' && h !== '__EMPTY'
    );

    // Put row number and duplicate info first, then all other columns
    const headers = ['Row Number', 'Duplicate Of Row', 'ID Number', ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number')];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF000000' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD93D' },
    };

    // Add data rows with all original data
    duplicates.forEach((record) => {
      const values = [
        record.row_number,
        record.duplicate_of_row,
        record['ID Number'],
        ...allColumns.filter(h => h !== 'row_number' && h !== 'ID Number').map(h => record[h])
      ];
      sheet.addRow(values);
    });

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (idx < 3) {
        column.width = 15; // Row Number, Duplicate Of Row, ID Number
      } else {
        column.width = 20; // Other columns
      }
    });
  }

  /**
   * Create Not Registered sheet
   */
  private static createNotRegisteredSheet(
    workbook: ExcelJS.Workbook,
    notRegistered: any[]
  ): void {
    const sheet = workbook.addWorksheet('Not Registered');

    if (notRegistered.length === 0) {
      sheet.getCell('A1').value = 'All members are registered voters';
      return;
    }

    // Headers
    const headers = ['ID Number', 'Name', 'Surname', 'Voter Status'];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFB347' },
    };

    // Add data rows
    notRegistered.forEach((record) => {
      sheet.addRow([
        record['ID Number'],
        record.Name || '',
        record.Surname || '',
        record.voter_status,
      ]);
    });

    // Column widths
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Create New Members sheet
   */
  private static createNewMembersSheet(
    workbook: ExcelJS.Workbook,
    newMembers: BulkUploadRecord[]
  ): void {
    const sheet = workbook.addWorksheet('New Members');

    if (newMembers.length === 0) {
      sheet.getCell('A1').value = 'No new members added';
      return;
    }

    // Headers
    const headers = ['ID Number', 'Name', 'Surname', 'Cell Number', 'Email'];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF95E1D3' },
    };

    // Add data rows
    newMembers.forEach((record) => {
      sheet.addRow([
        record['ID Number'],
        record.Name || '',
        record.Surname || '',
        record['Cell Number'] || '',
        record.Email || '',
      ]);
    });

    // Column widths
    sheet.columns.forEach((column) => {
      column.width = 20;
    });
  }

  /**
   * Create Existing Members sheet
   */
  private static createExistingMembersSheet(
    workbook: ExcelJS.Workbook,
    existingMembers: ExistingMemberRecord[]
  ): void {
    const sheet = workbook.addWorksheet('Existing Members (Updated)');

    if (existingMembers.length === 0) {
      sheet.getCell('A1').value = 'No existing members updated';
      return;
    }

    // Headers with existing member information
    const headers = [
      'ID Number',
      'Name',
      'Surname',
      'Member ID',
      'Existing Name in DB',
      'Existing Ward',
      'Existing VD',
      'Last Updated'
    ];
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add data rows with existing member details
    existingMembers.forEach((record) => {
      const existingName = `${record.existing_firstname || ''} ${record.existing_surname || ''}`.trim();
      const existingWard = record.existing_ward_name || record.existing_ward_code || 'N/A';
      const existingVD = record.existing_vd_name || record.existing_vd_code || 'N/A';

      sheet.addRow([
        record['ID Number'],
        record.Name || record.Firstname || '',
        record.Surname || '',
        record.member_id,
        existingName || 'N/A',
        existingWard,
        existingVD,
        record.updated_at ? new Date(record.updated_at).toLocaleString() : '',
      ]);
    });

    // Column widths
    sheet.columns.forEach((column, idx) => {
      if (idx === 0) {
        column.width = 15; // ID Number
      } else if (idx === 3) {
        column.width = 12; // Member ID
      } else {
        column.width = 25; // Other columns
      }
    });
  }

  /**
   * Get not registered voters from IEC results
   */
  private static getNotRegisteredVoters(
    validRecords: BulkUploadRecord[],
    iecResults: Map<string, IECVoterDetails>
  ): any[] {
    const notRegistered: any[] = [];

    validRecords.forEach((record) => {
      const iecDetails = iecResults.get(record['ID Number']);
      if (iecDetails && !iecDetails.is_registered) {
        notRegistered.push({
          ...record,
          voter_status: iecDetails.voter_status,
        });
      }
    });

    return notRegistered;
  }
}

// ============================================================================
// FILE READER SERVICE
// ============================================================================

class FileReaderService {
  /**
   * Read Excel file and convert to array of records
   */
  static readExcelFile(filePath: string): any[] {
    console.log(`\n📂 READING FILE: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`   ✅ Read ${data.length} rows from sheet: ${sheetName}`);

    // Add row numbers and normalize data
    const dataWithRowNumbers = data.map((row: any, index: number) => {
      const normalized: any = {
        row_number: index + 2, // +2 for Excel (header + 0-index)
        ...row,
      };

      // Normalize column names (handle both "Name" and "Firstname")
      if (normalized.Firstname && !normalized.Name) {
        normalized.Name = normalized.Firstname;
      }

      // Calculate expiry date if missing but "Last Payment" exists
      if (!normalized['Expiry Date'] && normalized['Last Payment']) {
        const expiryDate = calculateExpiryDate(normalized['Last Payment']);
        if (expiryDate) {
          normalized['Expiry Date'] = expiryDate;
          normalized['_expiry_calculated'] = true; // Flag for reporting
        }
      }

      return normalized;
    });

    return dataWithRowNumbers;
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

async function processBulkUpload(filePath: string): Promise<void> {
  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log('🚀 BULK UPLOAD PROCESSOR - PROOF OF CONCEPT');
  console.log('='.repeat(80));

  try {
    // Step 1: Read Excel file
    const originalData = FileReaderService.readExcelFile(filePath);

    if (originalData.length === 0) {
      throw new Error('No data found in Excel file');
    }

    // Step 2: Pre-validation
    const validationResult = await PreValidationService.validateRecords(originalData);

    // Step 3: IEC Verification (only for unique, valid records)
    const recordsToVerify = [
      ...validationResult.new_members,
      ...validationResult.existing_members,
    ];

    let iecResults = new Map<string, IECVoterDetails>();

    if (recordsToVerify.length > 0) {
      const idNumbers = recordsToVerify.map((r) => r['ID Number']);
      iecResults = await IECVerificationService.verifyVotersBatch(idNumbers);
    } else {
      console.log('\n🔍 IEC VERIFICATION: No records to verify (all invalid or duplicates)');
    }

    // Step 4: Database Operations
    let processingResult: ProcessingResult = {
      total_processed: 0,
      successful_inserts: 0,
      successful_updates: 0,
      failed_operations: 0,
      iec_verified: 0,
      iec_not_registered: 0,
      iec_errors: 0,
    };

    if (recordsToVerify.length > 0) {
      processingResult = await DatabaseOperationsService.processRecords(
        validationResult.new_members,
        validationResult.existing_members,
        iecResults
      );
    } else {
      console.log('\n💾 DATABASE OPERATIONS: No records to process');
    }

    // Step 5: Generate Excel Report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportFileName = `bulk-upload-report-${timestamp}.xlsx`;
    const reportPath = path.join(REPORTS_DIR, reportFileName);

    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    await ExcelReportService.generateReport(
      originalData,
      validationResult,
      processingResult,
      iecResults,
      reportPath
    );

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROCESSING COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Total Records: ${originalData.length}`);
    console.log(`✅ Successfully Processed: ${processingResult.total_processed}`);
    console.log(`❌ Failed: ${processingResult.failed_operations}`);
    console.log(`📄 Report: ${reportPath}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(80) + '\n');
  } catch (error: any) {
    console.error('\n❌ PROCESSING FAILED:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('\n❌ ERROR: No file path provided');
    console.log('\nUsage: ts-node test-bulk-upload-processor.ts <excel-file-path>');
    console.log('\nExample:');
    console.log('  ts-node test-bulk-upload-processor.ts "../../uploads/test-members.xlsx"');
    console.log('  ts-node test-bulk-upload-processor.ts "C:/path/to/members.xlsx"\n');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  try {
    await processBulkUpload(filePath);
    await pool.end(); // Close database connection
    process.exit(0);
  } catch (error) {
    await pool.end();
    process.exit(1);
  }
}

// Export for testing
export {
  IdValidationService,
  PreValidationService,
  IECVerificationService,
  DatabaseOperationsService,
  ExcelReportService,
  FileReaderService,
  processBulkUpload,
};

// Run main function
main();

