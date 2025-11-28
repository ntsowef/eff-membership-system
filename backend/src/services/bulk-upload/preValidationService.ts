/**
 * Pre-Validation Service
 * 
 * Validates uploaded data before IEC verification and database insertion.
 * Performs:
 * 1. ID number validation and normalization
 * 2. Duplicate detection within uploaded file
 * 3. Existing member lookup in database
 * 
 * Ported from: backend/python/pre_validation_processor.py
 */

import { Pool } from 'pg';
import {
  BulkUploadRecord,
  InvalidIdRecord,
  DuplicateRecord,
  ExistingMemberRecord,
  ValidationResult
} from './types';
import {
  normalizeIdNumber,
  validateSaIdNumber,
  IdValidationResult
} from './idValidationService';

export class PreValidationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Perform comprehensive pre-validation on uploaded records
   * 
   * @param records - Array of records from Excel file
   * @returns ValidationResult with categorized records and statistics
   */
  async validateRecords(records: BulkUploadRecord[]): Promise<ValidationResult> {
    console.log(`\n🔍 PRE-VALIDATION: Starting validation for ${records.length} records...`);

    const result: ValidationResult = {
      valid_records: [],
      invalid_ids: [],
      duplicates: [],
      existing_members: [],
      new_members: [],
      validation_stats: {
        total_records: records.length,
        valid_ids: 0,
        invalid_ids: 0,
        unique_records: 0,
        duplicates: 0,
        existing_members: 0,
        new_members: 0
      }
    };

    // ============================================================
    // STEP 1: VALIDATE AND NORMALIZE ID NUMBERS
    // ============================================================
    console.log('📋 Step 1: Validating ID numbers...');
    
    const { validRecords, invalidIds } = this.validateIdNumbers(records);
    
    result.invalid_ids = invalidIds;
    result.validation_stats.valid_ids = validRecords.length;
    result.validation_stats.invalid_ids = invalidIds.length;

    console.log(`   ✅ Valid IDs: ${validRecords.length}`);
    console.log(`   ❌ Invalid IDs: ${invalidIds.length}`);

    if (validRecords.length === 0) {
      console.warn('⚠️  No valid records found after ID validation');
      return result;
    }

    // ============================================================
    // STEP 2: DETECT DUPLICATES WITHIN FILE
    // ============================================================
    console.log('📋 Step 2: Detecting duplicates...');
    
    const { uniqueRecords, duplicates } = this.detectDuplicates(validRecords);
    
    result.duplicates = duplicates;
    result.validation_stats.unique_records = uniqueRecords.length;
    result.validation_stats.duplicates = duplicates.length;

    console.log(`   ✅ Unique records: ${uniqueRecords.length}`);
    console.log(`   ⚠️  Duplicate IDs found: ${duplicates.length}`);

    // ============================================================
    // STEP 3: CHECK EXISTING MEMBERS IN DATABASE
    // ============================================================
    console.log('📋 Step 3: Checking for existing members in database...');
    
    const { existingMembers, newMembers } = await this.checkExistingMembers(uniqueRecords);
    
    result.existing_members = existingMembers;
    result.new_members = newMembers;
    result.valid_records = uniqueRecords;
    result.validation_stats.existing_members = existingMembers.length;
    result.validation_stats.new_members = newMembers.length;

    console.log(`   ✅ Existing members (will be updated): ${existingMembers.length}`);
    console.log(`   ✅ New members (will be inserted): ${newMembers.length}`);

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('✅ Pre-validation complete:');
    console.log(`   Total records: ${result.validation_stats.total_records}`);
    console.log(`   Valid for processing: ${uniqueRecords.length}`);
    console.log(`   Invalid IDs: ${result.validation_stats.invalid_ids}`);
    console.log(`   Duplicates removed: ${result.validation_stats.duplicates}`);

    return result;
  }

  /**
   * Validate and normalize ID numbers
   * Returns valid records with normalized IDs and invalid records with errors
   */
  private validateIdNumbers(records: BulkUploadRecord[]): {
    validRecords: BulkUploadRecord[];
    invalidIds: InvalidIdRecord[];
  } {
    const validRecords: BulkUploadRecord[] = [];
    const invalidIds: InvalidIdRecord[] = [];

    for (const record of records) {
      const idNum = record['ID Number'];
      
      // Normalize ID number
      const normalizedId = normalizeIdNumber(idNum);
      
      if (!normalizedId) {
        invalidIds.push({
          ...record,
          error_message: 'Invalid or missing ID number',
          validation_type: 'missing'
        });
        continue;
      }

      // Update record with normalized ID
      record['ID Number'] = normalizedId;
      
      // Validate ID number
      const validationResult: IdValidationResult = validateSaIdNumber(normalizedId);
      
      if (!validationResult.isValid) {
        invalidIds.push({
          ...record,
          error_message: validationResult.errorMessage || 'Invalid ID number',
          validation_type: validationResult.validationType || 'format'
        });
      } else {
        validRecords.push(record);
      }
    }

    return { validRecords, invalidIds };
  }

  /**
   * Detect duplicate ID numbers within the uploaded file
   * Keeps first occurrence, marks subsequent occurrences as duplicates
   */
  private detectDuplicates(records: BulkUploadRecord[]): {
    uniqueRecords: BulkUploadRecord[];
    duplicates: DuplicateRecord[];
  } {
    const idMap = new Map<string, BulkUploadRecord[]>();

    // Group records by ID number
    for (const record of records) {
      const idNumber = record['ID Number'];
      if (!idMap.has(idNumber)) {
        idMap.set(idNumber, []);
      }
      idMap.get(idNumber)!.push(record);
    }

    const uniqueRecords: BulkUploadRecord[] = [];
    const duplicates: DuplicateRecord[] = [];

    // Process each ID group
    for (const [idNumber, recordGroup] of idMap.entries()) {
      if (recordGroup.length === 1) {
        // No duplicates - add to unique records
        uniqueRecords.push(recordGroup[0]);
      } else {
        // Duplicates found - keep first, mark rest as duplicates
        uniqueRecords.push(recordGroup[0]);

        const allRowNumbers = recordGroup.map(r => r.row_number);
        const firstRow = allRowNumbers[0];

        // Add all occurrences (including first) to duplicates list for reporting
        for (const record of recordGroup) {
          duplicates.push({
            ...record,
            duplicate_count: recordGroup.length,
            first_occurrence_row: firstRow,
            all_row_numbers: allRowNumbers
          });
        }
      }
    }

    return { uniqueRecords, duplicates };
  }

  /**
   * Check which members already exist in the database
   * Returns existing members (for update) and new members (for insert)
   */
  private async checkExistingMembers(records: BulkUploadRecord[]): Promise<{
    existingMembers: ExistingMemberRecord[];
    newMembers: BulkUploadRecord[];
  }> {
    const idNumbers = records.map(r => r['ID Number']);

    try {
      // Query database for existing members
      const query = `
        SELECT
          m.id_number,
          m.member_id,
          m.firstname,
          m.surname,
          m.ward_code,
          w.ward_name,
          m.voting_district_code,
          vd.voting_district_name,
          m.created_at,
          m.updated_at
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
        WHERE m.id_number = ANY($1)
      `;

      const result = await this.pool.query(query, [idNumbers]);
      const existingRecords = result.rows;
      const existingIdSet = new Set(existingRecords.map((r: any) => r.id_number));

      const existingMembers: ExistingMemberRecord[] = [];
      const newMembers: BulkUploadRecord[] = [];

      // Categorize records
      for (const record of records) {
        const idNum = record['ID Number'];

        if (existingIdSet.has(idNum)) {
          // Find the database record
          const dbRecord = existingRecords.find((r: any) => r.id_number === idNum);

          if (dbRecord) {
            // Check if ward or VD changed
            const uploadWard = record.Ward?.toString() || '';
            const uploadVD = record['Voting District']?.toString() || '';
            const dbWard = dbRecord.ward_code || '';
            const dbVD = dbRecord.voting_district_code || '';

            existingMembers.push({
              ...record,
              existing_member_id: dbRecord.member_id,
              existing_name: `${dbRecord.firstname || ''} ${dbRecord.surname || ''}`.trim(),
              existing_ward: dbWard,
              existing_vd: dbVD,
              existing_created_at: dbRecord.created_at,
              existing_updated_at: dbRecord.updated_at,
              ward_changed: uploadWard !== dbWard && uploadWard !== '',
              vd_changed: uploadVD !== dbVD && uploadVD !== ''
            });
          }
        } else {
          newMembers.push(record);
        }
      }

      return { existingMembers, newMembers };
    } catch (error) {
      console.error('❌ Error checking existing members:', error);
      throw error;
    }
  }

  /**
   * Static method for validating records (for orchestrator)
   * Creates service instance and validates records
   */
  static async validateRecords(
    records: BulkUploadRecord[],
    pool: Pool
  ): Promise<ValidationResult> {
    const service = new PreValidationService(pool);
    return service.validateRecords(records);
  }
}
