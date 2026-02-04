/**
 * Pre-Validation Service
 * 
 * Validates uploaded data before IEC verification and database insertion.
 * Performs:
 * 1. ID number validation and normalization
 * 2. Duplicate detection within uploaded file
 * 3. Existing member lookup in database
 * 4. Subscription type validation (New vs Renewal)
 * 5. Renewal date validation and classification
 * 
 * Ported from: backend/python/pre_validation_processor.py
 */

import { Pool } from 'pg';
import {
  BulkUploadRecord,
  InvalidIdRecord,
  DuplicateRecord,
  ExistingMemberRecord,
  ValidationResult,
  SubscriptionType,
  RenewalRecord,
  RenewalValidationError,
  SubscriptionTypeError,
  RenewalClassification
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
      renewal_records: [],
      renewal_validation_errors: [],
      subscription_type_errors: [],
      validation_stats: {
        total_records: records.length,
        valid_ids: 0,
        invalid_ids: 0,
        unique_records: 0,
        duplicates: 0,
        existing_members: 0,
        new_members: 0,
        renewals: 0,
        early_renewals: 0,
        expired_member_renewals: 0,
        renewal_validation_errors: 0,
        subscription_type_errors: 0
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

    const { existingMembers, newMembers, dbRecordsMap } = await this.checkExistingMembersWithExpiry(uniqueRecords);

    // ============================================================
    // STEP 4: VALIDATE SUBSCRIPTION TYPES AND CATEGORIZE RENEWALS
    // ============================================================
    console.log('📋 Step 4: Validating subscription types and categorizing renewals...');

    const {
      validNewMembers,
      renewalRecords,
      renewalErrors,
      subscriptionErrors
    } = this.validateSubscriptionTypesAndRenewals(newMembers, existingMembers, dbRecordsMap);

    // Update result with categorized records
    result.existing_members = existingMembers.filter(em =>
      !renewalRecords.some(r => r['ID Number'] === em['ID Number']) &&
      !subscriptionErrors.some(e => e.record['ID Number'] === em['ID Number'])
    );
    result.new_members = validNewMembers;
    result.valid_records = uniqueRecords;
    result.renewal_records = renewalRecords;
    result.renewal_validation_errors = renewalErrors;
    result.subscription_type_errors = subscriptionErrors;

    // Update stats
    result.validation_stats.existing_members = existingMembers.length;
    result.validation_stats.new_members = validNewMembers.length;
    result.validation_stats.renewals = renewalRecords.length;
    result.validation_stats.early_renewals = renewalRecords.filter(r => r.renewal_classification === 'early_renewal').length;
    result.validation_stats.expired_member_renewals = renewalRecords.filter(r => r.renewal_classification === 'expired_member_renewal').length;
    result.validation_stats.renewal_validation_errors = renewalErrors.length;
    result.validation_stats.subscription_type_errors = subscriptionErrors.length;

    console.log(`   ✅ New members (will be inserted): ${validNewMembers.length}`);
    console.log(`   ✅ Existing members (standard update): ${result.existing_members.length}`);
    console.log(`   🔄 Renewals (early): ${result.validation_stats.early_renewals}`);
    console.log(`   🔄 Renewals (expired): ${result.validation_stats.expired_member_renewals}`);
    console.log(`   ❌ Renewal validation errors: ${renewalErrors.length}`);
    console.log(`   ❌ Subscription type errors: ${subscriptionErrors.length}`);

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('✅ Pre-validation complete:');
    console.log(`   Total records: ${result.validation_stats.total_records}`);
    console.log(`   Valid for processing: ${uniqueRecords.length}`);
    console.log(`   Invalid IDs: ${result.validation_stats.invalid_ids}`);
    console.log(`   Duplicates removed: ${result.validation_stats.duplicates}`);
    console.log(`   Total renewals: ${result.validation_stats.renewals}`);

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
   * Check which members already exist in the database (with expiry date and status)
   * Extended version that fetches expiry_date and membership_status_id for renewal validation
   * Returns existing members, new members, and a map of DB records for renewal processing
   */
  private async checkExistingMembersWithExpiry(records: BulkUploadRecord[]): Promise<{
    existingMembers: ExistingMemberRecord[];
    newMembers: BulkUploadRecord[];
    dbRecordsMap: Map<string, any>;
  }> {
    const idNumbers = records.map(r => r['ID Number']);

    try {
      // Query database for existing members with expiry_date, membership_status_id, last_payment_date, and subscription_type_id
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
          m.updated_at,
          m.expiry_date,
          m.membership_status_id,
          m.last_payment_date,
          m.subscription_type_id
        FROM members_consolidated m
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
        WHERE m.id_number = ANY($1)
      `;

      const result = await this.pool.query(query, [idNumbers]);
      const existingRecords = result.rows;
      const existingIdSet = new Set(existingRecords.map((r: any) => r.id_number));

      // Create map for quick lookup during renewal processing
      const dbRecordsMap = new Map<string, any>();
      existingRecords.forEach((r: any) => dbRecordsMap.set(r.id_number, r));

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

      return { existingMembers, newMembers, dbRecordsMap };
    } catch (error) {
      console.error('❌ Error checking existing members with expiry:', error);
      throw error;
    }
  }

  /**
   * Validate subscription types for existing members and categorize renewals
   *
   * NEW BUSINESS LOGIC (2024):
   * - Do NOT use the "Subscription" column from Excel to determine new vs renewal
   * - Compare date_joined with last_payment_date:
   *   - If date_joined == last_payment_date → New Member
   *   - If date_joined < last_payment_date → Renewal
   * - Expiry date will be calculated as: last_payment_date + 2 years (in databaseOperationsService)
   *
   * @param newMembers - Members not found in database (will be inserted)
   * @param existingMembers - Members found in database (will be updated or renewed)
   * @param dbRecordsMap - Map of existing database records by ID number
   */
  private validateSubscriptionTypesAndRenewals(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    dbRecordsMap: Map<string, any>
  ): {
    validNewMembers: BulkUploadRecord[];
    renewalRecords: RenewalRecord[];
    renewalErrors: RenewalValidationError[];
    subscriptionErrors: SubscriptionTypeError[];
  } {
    const validNewMembers: BulkUploadRecord[] = [];
    const renewalRecords: RenewalRecord[] = [];
    const renewalErrors: RenewalValidationError[] = [];
    const subscriptionErrors: SubscriptionTypeError[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // Process new members - all will be inserted with subscription_type determined by dates
    for (const record of newMembers) {
      const dateJoined = this.parseDate(record['Date Joined']);
      // Handle both 'Last Payment' and 'Last Payment Date' column names
      const lastPaymentDate = this.parseDate(record['Last Payment'] || record['Last Payment Date']);

      // Log the classification based on date comparison
      const isRenewal = this.isRenewalBasedOnDates(dateJoined, lastPaymentDate);
      if (isRenewal) {
        console.log(`   ℹ️  ID ${record['ID Number']}: New to database but dates indicate renewal (date_joined < last_payment_date) - will insert with renewal subscription_type`);
      } else {
        console.log(`   ℹ️  ID ${record['ID Number']}: New member (date_joined >= last_payment_date or only date_joined provided)`);
      }

      // Validate that at least date_joined is provided
      if (!dateJoined) {
        console.log(`   ⚠️  ID ${record['ID Number']}: Missing date_joined - will still insert but cannot determine proper subscription type`);
      }

      validNewMembers.push(record);
    }

    // Process existing members - categorize as renewal based on date comparison
    for (const existingMember of existingMembers) {
      const dbRecord = dbRecordsMap.get(existingMember['ID Number']);
      const dateJoined = this.parseDate(existingMember['Date Joined']);
      // Handle both 'Last Payment' and 'Last Payment Date' column names
      const lastPaymentDate = this.parseDate(existingMember['Last Payment'] || existingMember['Last Payment Date']);

      // Determine if this is a renewal based on date comparison
      const isRenewal = this.isRenewalBasedOnDates(dateJoined, lastPaymentDate);
      const dbExpiryDate = dbRecord?.expiry_date ? new Date(dbRecord.expiry_date) : null;

      if (isRenewal) {
        // This is a RENEWAL - date_joined < last_payment_date
        console.log(`   🔄 ID ${existingMember['ID Number']}: Classified as RENEWAL (date_joined < last_payment_date)`);

        // Validate last_payment_date is required for renewals to calculate expiry
        if (!lastPaymentDate) {
          renewalErrors.push({
            record: existingMember,
            error_type: 'invalid_last_payment_date',
            error_message: 'Renewal requires a last_payment_date to calculate expiry_date',
            db_expiry_date: dbExpiryDate,
            excel_expiry_date: null
          });
          continue;
        }

        // Calculate expected expiry date (last_payment_date + 2 years)
        const calculatedExpiryDate = new Date(lastPaymentDate);
        calculatedExpiryDate.setFullYear(calculatedExpiryDate.getFullYear() + 2);

        // Determine renewal classification based on current DB expiry
        let renewalClassification: RenewalClassification;
        if (dbExpiryDate && dbExpiryDate > today) {
          renewalClassification = 'early_renewal';
        } else {
          renewalClassification = 'expired_member_renewal';
        }

        // Create valid renewal record
        renewalRecords.push({
          ...existingMember,
          subscription_type: 'Renewal',
          db_expiry_date: dbExpiryDate,
          db_membership_status_id: dbRecord?.membership_status_id || 0,
          excel_expiry_date: calculatedExpiryDate, // Use calculated expiry date
          renewal_classification: renewalClassification
        });
      } else {
        // This is a regular UPDATE (not a renewal) - date_joined == last_payment_date or only date_joined provided
        console.log(`   ℹ️  ID ${existingMember['ID Number']}: Classified as UPDATE (not a renewal) - date_joined >= last_payment_date`);
        // Member stays in existingMembers list for regular update
        // The databaseOperationsService will handle setting subscription_type_id = 6 (New)
      }
    }

    return {
      validNewMembers,
      renewalRecords,
      renewalErrors,
      subscriptionErrors
    };
  }

  /**
   * Determine if a record is a renewal based on date comparison
   *
   * Business Rule:
   * - If date_joined == last_payment_date (same day) → NEW member
   * - If date_joined < last_payment_date → RENEWAL
   * - If only date_joined provided (no last_payment_date) → NEW member
   * - If only last_payment_date provided (no date_joined) → Treat as NEW (edge case)
   *
   * @param dateJoined - Date the member joined
   * @param lastPaymentDate - Date of last payment
   * @returns true if renewal, false if new
   */
  private isRenewalBasedOnDates(dateJoined: Date | null, lastPaymentDate: Date | null): boolean {
    // If no dates provided, default to new member
    if (!dateJoined && !lastPaymentDate) {
      return false;
    }

    // If only date_joined provided, it's a new member
    if (dateJoined && !lastPaymentDate) {
      return false;
    }

    // If only last_payment_date provided (edge case), treat as new
    if (!dateJoined && lastPaymentDate) {
      return false;
    }

    // Both dates provided - compare them
    if (dateJoined && lastPaymentDate) {
      // Normalize dates to compare only date part (ignore time)
      const djNormalized = new Date(dateJoined.getFullYear(), dateJoined.getMonth(), dateJoined.getDate());
      const lpNormalized = new Date(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), lastPaymentDate.getDate());

      // If date_joined < last_payment_date → RENEWAL
      // If date_joined >= last_payment_date → NEW (same day or date_joined is later)
      return djNormalized.getTime() < lpNormalized.getTime();
    }

    return false;
  }

  /**
   * Parse date from various formats
   * 
   * @param value - Date value (Date, string, number, or null)
   * @returns Date or null
   */
  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Try to parse as string
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Try to parse as number (Excel serial date)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const days = Math.floor(value);
      const milliseconds = days * 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + milliseconds);
    }

    return null;
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
