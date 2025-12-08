import { Pool } from 'pg';
import {
  BulkUploadRecord,
  ExistingMemberRecord,
  IECVerificationResult,
  DatabaseOperationResult,
  DatabaseOperationsBatchResult
} from './types';
import { LookupService } from './lookupService';

/**
 * Database Operations Service for Bulk Upload
 *
 * Handles member insert/update operations with:
 * - Transaction management
 * - Metro-to-subregion mapping
 * - Membership status handling (Good Standing = 1)
 * - ON CONFLICT DO UPDATE logic
 * - Batch processing with execute_values equivalent
 * - All 35 fields matching Python implementation
 */
export class DatabaseOperationsService {
  private pool: Pool;
  private lookupService: LookupService;

  constructor(pool: Pool, lookupService: LookupService) {
    this.pool = pool;
    this.lookupService = lookupService;
  }

  /**
   * Process all records (insert new, update existing)
   * 
   * @param newMembers - New members to insert
   * @param existingMembers - Existing members to update
   * @param iecResults - IEC verification results
   * @returns Database operations batch result
   */
  async processRecords(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    iecResults: Map<string, IECVerificationResult>
  ): Promise<DatabaseOperationsBatchResult> {
    console.log(`\n💾 DATABASE OPERATIONS: Processing ${newMembers.length + existingMembers.length} records`);

    const successfulOperations: DatabaseOperationResult[] = [];
    const failedOperations: DatabaseOperationResult[] = [];

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Process new members (inserts)
      console.log(`   Processing ${newMembers.length} new members...`);
      for (let i = 0; i < newMembers.length; i++) {
        const record = newMembers[i];
        const savepointName = `sp_insert_${i}`;

        try {
          // Get IEC result or create default (DO NOT SKIP - matching Python behavior)
          // Python script inserts ALL records even without IEC verification
          let iecResult = iecResults.get(record['ID Number']);
          if (!iecResult) {
            // Create default IEC result for records without verification
            // Matches Python: records without IEC verification still get inserted
            console.log(`   ⚠️ ${record['ID Number']}: No IEC result, using default (will insert with special VD code)`);
            iecResult = {
              id_number: record['ID Number'],
              is_registered: false,
              voter_status: 'Not Verified',
              verification_date: new Date(),
              // No geographic codes - will be derived from ward_code in insertMember
            };
          }

          // Create savepoint before each insert so failures don't abort transaction
          await client.query(`SAVEPOINT ${savepointName}`);

          const memberId = await this.insertMember(client, record, iecResult);

          // Release savepoint on success
          await client.query(`RELEASE SAVEPOINT ${savepointName}`);

          console.log(`   ✅ Inserted ${record['ID Number']} -> member_id: ${memberId}`);
          successfulOperations.push({
            id_number: record['ID Number'],
            success: true,
            operation: 'insert',
            member_id: memberId
          });
        } catch (error: any) {
          // Rollback to savepoint to recover from failed insert
          try {
            await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          } catch (rollbackError) {
            // Savepoint might not exist if error occurred before it was created
          }

          // Detailed error logging
          console.error(`   ❌ Failed to insert ${record['ID Number']}:`);
          console.error(`      Error: ${error.message}`);
          console.error(`      Code: ${error.code || 'N/A'}`);
          console.error(`      Detail: ${error.detail || 'N/A'}`);
          console.error(`      Constraint: ${error.constraint || 'N/A'}`);

          // Create detailed error message
          let detailedError = error.message;
          if (error.code) detailedError += ` (Code: ${error.code})`;
          if (error.detail) detailedError += ` - ${error.detail}`;
          if (error.constraint) detailedError += ` [Constraint: ${error.constraint}]`;

          failedOperations.push({
            id_number: record['ID Number'],
            success: false,
            operation: 'insert',
            error: detailedError
          });
        }
      }

      // Process existing members (updates)
      console.log(`   Processing ${existingMembers.length} existing members...`);
      for (let i = 0; i < existingMembers.length; i++) {
        const record = existingMembers[i];
        const savepointName = `sp_update_${i}`;

        try {
          // Get IEC result or create default (DO NOT SKIP - matching Python behavior)
          let iecResult = iecResults.get(record['ID Number']);
          if (!iecResult) {
            // Create default IEC result for records without verification
            console.log(`   ⚠️ ${record['ID Number']}: No IEC result, using default for update`);
            iecResult = {
              id_number: record['ID Number'],
              is_registered: false,
              voter_status: 'Not Verified',
              verification_date: new Date(),
            };
          }

          // Create savepoint before each update so failures don't abort transaction
          await client.query(`SAVEPOINT ${savepointName}`);

          const updated = await this.updateMember(client, record, iecResult);

          // Release savepoint on success
          await client.query(`RELEASE SAVEPOINT ${savepointName}`);

          if (updated) {
            successfulOperations.push({
              id_number: record['ID Number'],
              success: true,
              operation: 'update',
              member_id: record.existing_member_id
            });
          } else {
            failedOperations.push({
              id_number: record['ID Number'],
              success: false,
              operation: 'update',
              error: 'Update returned 0 rows'
            });
          }
        } catch (error: any) {
          // Rollback to savepoint to recover from failed update
          try {
            await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          } catch (rollbackError) {
            // Savepoint might not exist if error occurred before it was created
          }

          console.error(`   ❌ Failed to update ${record['ID Number']}:`, error.message);
          failedOperations.push({
            id_number: record['ID Number'],
            success: false,
            operation: 'update',
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
      console.log(`   ✅ Committed ${successfulOperations.length} operations`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Transaction rolled back:`, error.message);
      throw error;
    } finally {
      client.release();
    }

    const inserts = successfulOperations.filter(op => op.operation === 'insert').length;
    const updates = successfulOperations.filter(op => op.operation === 'update').length;
    const skipped = failedOperations.filter(op => op.operation === 'skip').length;

    return {
      successful_operations: successfulOperations,
      failed_operations: failedOperations,
      operation_stats: {
        total_records: newMembers.length + existingMembers.length,
        inserts,
        updates,
        skipped,
        failures: failedOperations.length - skipped
      }
    };
  }

  /**
   * Insert new member into database with all 35 fields
   * Matches Python implementation: bulk_insert_members_consolidated_with_id_mapping
   *
   * @param client - Database client
   * @param record - Record to insert
   * @param iecResult - IEC verification result
   * @returns Member ID
   */
  private async insertMember(
    client: any,
    record: BulkUploadRecord,
    iecResult: IECVerificationResult
  ): Promise<number> {
    // Extract name fields
    const firstname = (record.Name || record.Firstname || '').substring(0, 50);
    const surname = (record.Surname || '').substring(0, 50) || null;

    // Extract date of birth from ID number
    const dateOfBirth = this.extractDateOfBirth(record['ID Number']);
    const age = this.calculateAge(dateOfBirth);

    // Lookup IDs using LookupService
    const genderId = this.lookupService.getGenderId(record.Gender);
    const raceId = this.lookupService.getRaceId(record.Race);
    const citizenshipId = this.lookupService.getCitizenshipId(record.Citizenship);
    const languageId = this.lookupService.getLanguageId(record.Language);
    const occupationId = this.lookupService.getOccupationId(record.Occupation);
    const qualificationId = this.lookupService.getQualificationId(record.Qualification);
    const voterStatusId = this.lookupService.getVoterStatusId(record.Status);

    // Geographic codes - file ward code vs IEC ward code
    // File ward code is what's in the upload file (the target ward)
    // IEC ward code is where the voter is actually registered according to IEC
    const fileWardCode = record.Ward ? String(record.Ward).trim() : null;
    const iecWardCode = iecResult.ward_code ? String(iecResult.ward_code).trim() : null;

    // Use file ward code as the primary ward for this member
    const wardCode = fileWardCode || iecWardCode || '';

    // Get geographic codes from ward code (matching Python: get_geographic_codes_from_ward)
    const geoCodes = this.lookupService.getGeographicCodesFromWard(wardCode);

    // Map voting district code with special code handling (matching Python: assign_vd_based_on_iec_status)
    // CRITICAL: Pass both file ward and IEC ward to determine DIFFERENT_WARD status
    const votingDistrictCode = this.lookupService.mapVotingDistrictCode(
      iecResult.is_registered,
      iecResult.voting_district_code,
      iecResult.voter_status,
      fileWardCode,  // Ward from upload file
      iecWardCode    // Ward from IEC API
    );

    // voter_district_code stores the raw IEC VD code (distinct from voting_district_code which may have special codes)
    const voterDistrictCode = iecResult.voting_district_code || null;
    const votingStationId = null; // Not available in current data

    // Contact information
    const residentialAddress = record['Residential Address'] || null;
    const cellNumber = record['Cell Number'] || null;
    const email = record.Email || null;

    // Membership type
    const membershipType = 'Regular'; // Default

    // Geographic names - prioritize lookup from ward, fallback to IEC results, then record
    const provinceName = geoCodes.province_name || record.Province || null;
    const provinceCode = geoCodes.province_code || iecResult.province_code || null;
    const districtName = geoCodes.district_name || record.District || null;
    const districtCode = geoCodes.district_code || iecResult.district_code || null;
    const municipalityName = geoCodes.municipality_name || record.Municipality || null;
    const municipalityCode = geoCodes.municipality_code || iecResult.municipality_code || null;

    // Membership dates
    const dateJoined = this.parseDate(record['Date Joined']);
    const lastPaymentDate = this.parseDate(record['Last Payment']);
    const expiryDate = this.parseDate(record['Expiry Date']);

    // Subscription and payment
    const subscriptionTypeId = this.lookupService.getSubscriptionTypeId(record.Subscription);
    const membershipAmount = this.parseAmount(record['Memebership Amount'] || record['Membership Amount']) || 0;
    const membershipStatusId = 1; // Good Standing
    const paymentMethod = null; // Not available in current data
    const paymentReference = null; // Not available in current data
    const paymentStatus = 'Pending'; // Default

    // Voter registration tracking (migration 011)
    const voterRegStatus = this.lookupService.getVoterRegistrationStatus(votingDistrictCode);
    const voterRegistrationId = voterRegStatus.voterRegistrationId;
    const isRegisteredVoter = voterRegStatus.isRegisteredVoter;
    const lastVoterVerificationDate = new Date(); // Current timestamp when processing

    // Build INSERT query with all 38 fields (35 original + 3 voter registration tracking)
    // Matches Python: INSERT INTO members_consolidated (38 fields) VALUES %s
    const query = `
      INSERT INTO members_consolidated (
        id_number, firstname, surname, date_of_birth, age, gender_id, race_id,
        citizenship_id, language_id, ward_code, voter_district_code, voting_district_code,
        voting_station_id, residential_address, cell_number, email, occupation_id,
        qualification_id, voter_status_id, membership_type,
        province_name, province_code, district_name, district_code,
        municipality_name, municipality_code,
        date_joined, last_payment_date, expiry_date, subscription_type_id,
        membership_amount, membership_status_id, payment_method, payment_reference, payment_status,
        voter_registration_id, is_registered_voter, last_voter_verification_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::VARCHAR, $11::VARCHAR, $12::VARCHAR,
        $13, $14, $15::VARCHAR, $16, $17, $18, $19, $20,
        $21, $22::VARCHAR, $23, $24::VARCHAR, $25, $26::VARCHAR,
        $27, $28, $29, $30, $31, $32, $33, $34, $35,
        $36, $37, $38
      )
      RETURNING member_id
    `;

    // Build params array matching the 38 fields
    const params = [
      record['ID Number'],                    // $1: id_number
      firstname,                              // $2: firstname
      surname,                                // $3: surname
      dateOfBirth,                            // $4: date_of_birth
      age,                                    // $5: age
      genderId,                               // $6: gender_id
      raceId,                                 // $7: race_id
      citizenshipId,                          // $8: citizenship_id
      languageId,                             // $9: language_id
      wardCode,                               // $10: ward_code (VARCHAR cast)
      voterDistrictCode,                      // $11: voter_district_code (VARCHAR cast)
      votingDistrictCode,                     // $12: voting_district_code (VARCHAR cast)
      votingStationId,                        // $13: voting_station_id
      residentialAddress,                     // $14: residential_address
      cellNumber,                             // $15: cell_number (VARCHAR cast)
      email,                                  // $16: email
      occupationId,                           // $17: occupation_id
      qualificationId,                        // $18: qualification_id
      voterStatusId,                          // $19: voter_status_id
      membershipType,                         // $20: membership_type
      provinceName,                           // $21: province_name
      provinceCode,                           // $22: province_code (VARCHAR cast)
      districtName,                           // $23: district_name
      districtCode,                           // $24: district_code (VARCHAR cast)
      municipalityName,                       // $25: municipality_name
      municipalityCode,                       // $26: municipality_code (VARCHAR cast)
      dateJoined,                             // $27: date_joined
      lastPaymentDate,                        // $28: last_payment_date
      expiryDate,                             // $29: expiry_date
      subscriptionTypeId,                     // $30: subscription_type_id
      membershipAmount,                       // $31: membership_amount
      membershipStatusId,                     // $32: membership_status_id
      paymentMethod,                          // $33: payment_method
      paymentReference,                       // $34: payment_reference
      paymentStatus,                          // $35: payment_status
      // Voter registration tracking fields (migration 011)
      voterRegistrationId,                    // $36: voter_registration_id
      isRegisteredVoter,                      // $37: is_registered_voter
      lastVoterVerificationDate               // $38: last_voter_verification_date
    ];

    // Log the values being inserted for debugging
    console.log(`      Inserting ${record['ID Number']}:`);
    console.log(`        File Ward: ${fileWardCode}, IEC Ward: ${iecWardCode} → Using Ward: ${wardCode}`);
    console.log(`        VD Code: ${votingDistrictCode}, IEC VD: ${voterDistrictCode}`);
    console.log(`        Province: ${provinceCode} (${provinceName})`);
    console.log(`        District: ${districtCode} (${districtName})`);
    console.log(`        Municipality: ${municipalityCode} (${municipalityName})`);
    console.log(`        Gender: ${genderId}, Race: ${raceId}, Citizenship: ${citizenshipId}`);
    console.log(`        Voter Status: ${voterStatusId}, IEC Registered: ${iecResult.is_registered}`);
    console.log(`        Voter Registration: id=${voterRegistrationId}, isRegistered=${isRegisteredVoter}`);

    const result = await client.query(query, params);
    return result.rows[0].member_id;
  }

  /**
   * Update existing member in database with all updatable fields
   * Matches Python implementation: ON CONFLICT DO UPDATE SET pattern
   *
   * @param client - Database client
   * @param record - Record to update
   * @param iecResult - IEC verification result
   * @returns True if updated
   */
  private async updateMember(
    client: any,
    record: ExistingMemberRecord,
    iecResult: IECVerificationResult
  ): Promise<boolean> {
    // Extract name fields
    const firstname = (record.Name || record.Firstname || '').substring(0, 50) || null;
    const surname = (record.Surname || '').substring(0, 50) || null;

    // Extract date of birth and age
    const dateOfBirth = this.extractDateOfBirth(record['ID Number']);
    const age = this.calculateAge(dateOfBirth);

    // Lookup IDs
    const genderId = this.lookupService.getGenderId(record.Gender);
    const raceId = this.lookupService.getRaceId(record.Race);
    const citizenshipId = this.lookupService.getCitizenshipId(record.Citizenship);
    const languageId = this.lookupService.getLanguageId(record.Language);
    const occupationId = this.lookupService.getOccupationId(record.Occupation);
    const qualificationId = this.lookupService.getQualificationId(record.Qualification);
    const voterStatusId = this.lookupService.getVoterStatusId(record.Status);

    // Geographic codes
    const wardCode = String(record.Ward || iecResult.ward_code || '');
    const votingDistrictCode = iecResult.voting_district_code || null;

    // Contact information
    const residentialAddress = record['Residential Address'] || null;
    const cellNumber = record['Cell Number'] || null;
    const email = record.Email || null;

    // Geographic names
    const provinceName = record.Province || null;
    const provinceCode = iecResult.province_code || null;
    const municipalityName = record.Municipality || null;
    const municipalityCode = iecResult.municipality_code || null;

    // Membership dates
    const dateJoined = this.parseDate(record['Date Joined']);
    const lastPaymentDate = this.parseDate(record['Last Payment']);
    const expiryDate = this.parseDate(record['Expiry Date']);

    // Subscription and payment
    const subscriptionTypeId = this.lookupService.getSubscriptionTypeId(record.Subscription);
    const membershipAmount = this.parseAmount(record['Memebership Amount'] || record['Membership Amount']);

    // Voter registration tracking (migration 011)
    const voterRegStatus = this.lookupService.getVoterRegistrationStatus(votingDistrictCode);
    const voterRegistrationId = voterRegStatus.voterRegistrationId;
    const isRegisteredVoter = voterRegStatus.isRegisteredVoter;
    const lastVoterVerificationDate = new Date(); // Current timestamp when processing

    // Build UPDATE query with COALESCE pattern
    // Only updates non-null values, preserving existing data
    // Includes 3 voter registration tracking fields (migration 011)
    const query = `
      UPDATE members_consolidated
      SET
        firstname = COALESCE($1, firstname),
        surname = COALESCE($2, surname),
        date_of_birth = COALESCE($3, date_of_birth),
        age = COALESCE($4, age),
        gender_id = COALESCE($5, gender_id),
        race_id = COALESCE($6, race_id),
        citizenship_id = COALESCE($7, citizenship_id),
        language_id = COALESCE($8, language_id),
        ward_code = COALESCE($9, ward_code),
        voting_district_code = COALESCE($10, voting_district_code),
        residential_address = COALESCE($11, residential_address),
        cell_number = COALESCE($12, cell_number),
        email = COALESCE($13, email),
        occupation_id = COALESCE($14, occupation_id),
        qualification_id = COALESCE($15, qualification_id),
        voter_status_id = COALESCE($16, voter_status_id),
        province_name = COALESCE($17, province_name),
        province_code = COALESCE($18, province_code),
        municipality_name = COALESCE($19, municipality_name),
        municipality_code = COALESCE($20, municipality_code),
        date_joined = COALESCE($21, date_joined),
        last_payment_date = COALESCE($22, last_payment_date),
        expiry_date = COALESCE($23, expiry_date),
        subscription_type_id = COALESCE($24, subscription_type_id),
        membership_amount = COALESCE($25, membership_amount),
        voter_registration_id = COALESCE($26, voter_registration_id),
        is_registered_voter = COALESCE($27, is_registered_voter),
        last_voter_verification_date = COALESCE($28, last_voter_verification_date),
        updated_at = NOW()
      WHERE member_id = $29
    `;

    const params = [
      firstname,                    // $1
      surname,                      // $2
      dateOfBirth,                  // $3
      age,                          // $4
      genderId,                     // $5
      raceId,                       // $6
      citizenshipId,                // $7
      languageId,                   // $8
      wardCode,                     // $9
      votingDistrictCode,           // $10
      residentialAddress,           // $11
      cellNumber,                   // $12
      email,                        // $13
      occupationId,                 // $14
      qualificationId,              // $15
      voterStatusId,                // $16
      provinceName,                 // $17
      provinceCode,                 // $18
      municipalityName,             // $19
      municipalityCode,             // $20
      dateJoined,                   // $21
      lastPaymentDate,              // $22
      expiryDate,                   // $23
      subscriptionTypeId,           // $24
      membershipAmount,             // $25
      // Voter registration tracking fields (migration 011)
      voterRegistrationId,          // $26
      isRegisteredVoter,            // $27
      lastVoterVerificationDate,    // $28
      record.existing_member_id     // $29
    ];

    const result = await client.query(query, params);
    return result.rowCount! > 0;
  }

  /**
   * Extract date of birth from South African ID number
   * Format: YYMMDD... (first 6 digits)
   *
   * @param idNumber - South African ID number
   * @returns Date of birth or null
   */
  private extractDateOfBirth(idNumber: string): Date | null {
    if (!idNumber || idNumber.length < 6) return null;

    try {
      const yearStr = idNumber.substring(0, 2);
      const monthStr = idNumber.substring(2, 4);
      const dayStr = idNumber.substring(4, 6);

      let year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      // Determine century: < 25 = 2000s, >= 25 = 1900s
      year = year < 25 ? 2000 + year : 1900 + year;

      const dob = new Date(year, month - 1, day);

      // Validate date
      if (isNaN(dob.getTime())) return null;
      if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
        return null;
      }

      return dob;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate age from date of birth
   *
   * @param dateOfBirth - Date of birth
   * @returns Age in years or null
   */
  private calculateAge(dateOfBirth: Date | null): number | null {
    if (!dateOfBirth) return null;

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  /**
   * Parse membership amount from string
   * Handles formats like "R10.00", "10.00", "10"
   *
   * @param value - Amount value
   * @returns Numeric amount or null
   */
  private parseAmount(value: any): number | null {
    if (!value) return null;
    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
      // Remove currency symbols and whitespace
      const cleaned = value.replace(/[R$,\s]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
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
   * Static method for processing records batch (for orchestrator)
   * Creates service instance and processes records
   */
  static async processRecordsBatch(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    iecResults: Map<string, IECVerificationResult>,
    pool: Pool
  ): Promise<DatabaseOperationsBatchResult> {
    const lookupService = new LookupService(pool);
    await lookupService.initialize();

    const service = new DatabaseOperationsService(pool, lookupService);
    return service.processRecords(newMembers, existingMembers, iecResults);
  }
}

