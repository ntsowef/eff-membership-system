import { Pool } from 'pg';
import {
  BulkUploadRecord,
  ExistingMemberRecord,
  IECVerificationResult,
  DatabaseOperationResult,
  DatabaseOperationsBatchResult,
  RenewalRecord,
  RenewalClassification
} from './types';
import { LookupService } from './lookupService';
import { MembershipStatusService } from './membershipStatusService';

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

  private static readonly RECORD_CONCURRENCY = 10;

  /**
   * Process all records (insert new, update existing, process renewals)
   * 
   * @param newMembers - New members to insert
   * @param existingMembers - Existing members to update (standard update)
   * @param renewalRecords - Existing members with 'Renewal' subscription (renewal-specific update)
   * @param iecResults - IEC verification results
   * @returns Database operations batch result
   */
  async processRecords(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    iecResults: Map<string, IECVerificationResult>,
    renewalRecords: RenewalRecord[] = []
  ): Promise<DatabaseOperationsBatchResult> {
    const totalRecords = newMembers.length + existingMembers.length + renewalRecords.length;
    console.log(`\n💾 DATABASE OPERATIONS: Processing ${totalRecords} records in parallel (concurrency: ${DatabaseOperationsService.RECORD_CONCURRENCY})`);
    console.log(`   📊 Breakdown: ${newMembers.length} inserts, ${existingMembers.length} updates, ${renewalRecords.length} renewals`);

    const successfulOperations: DatabaseOperationResult[] = [];
    const failedOperations: DatabaseOperationResult[] = [];

    /**
     * Helper to process a single record with its own client and transaction
     */
    const processItem = async (type: 'insert' | 'update' | 'renewal', record: any) => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        let iecResult = iecResults.get(record['ID Number']);
        if (!iecResult) {
          iecResult = {
            id_number: record['ID Number'],
            is_registered: false,
            voter_status: 'Not Verified',
            verification_date: new Date(),
          };
        }

        let memberId: number | null = null;
        let renewalClassification: RenewalClassification | undefined;
        let previousExpiryDate: Date | null = null;
        let newExpiryDate: Date | null = null;

        // Check if this person is deceased (IEC voter_status contains 'DECEASED')
        const isDeceased = (iecResult.voter_status?.toUpperCase() || '').includes('DECEASED');

        if (type === 'insert') {
          // SKIP new member inserts for deceased voters - they cannot be new members
          if (isDeceased) {
            await client.query('ROLLBACK');
            // Record as skipped operation (not an error, just a business rule)
            // Note: Don't call client.release() here - the finally block will handle it
            successfulOperations.push({
              id_number: record['ID Number'],
              success: true,
              operation: 'skip',
              error: 'Deceased voter - cannot be added as new member',
              record
            });
            return; // Exit early - finally block will release the client
          }
          memberId = await this.insertMember(client, record, iecResult);
        } else if (type === 'update') {
          // For existing members who are deceased, we still update them but set status to Inactive
          const updated = await this.updateMember(client, record, iecResult);
          if (updated) {
            memberId = (record as ExistingMemberRecord).existing_member_id;
          }
        } else if (type === 'renewal') {
          const renewalRecord = record as RenewalRecord;
          const result = await this.processRenewal(client, renewalRecord);
          memberId = result.memberId;
          renewalClassification = renewalRecord.renewal_classification;
          previousExpiryDate = renewalRecord.db_expiry_date;
          newExpiryDate = renewalRecord.excel_expiry_date;
        }

        await client.query('COMMIT');

        if ((type === 'update' || type === 'renewal') && !memberId) {
          failedOperations.push({
            id_number: record['ID Number'],
            success: false,
            operation: type,
            error: `${type === 'renewal' ? 'Renewal' : 'Update'} returned 0 rows`,
            record
          });
        } else {
          const opResult: DatabaseOperationResult = {
            id_number: record['ID Number'],
            success: true,
            operation: type,
            member_id: memberId!,
            record
          };

          // Add renewal-specific fields
          if (type === 'renewal') {
            opResult.renewal_classification = renewalClassification;
            opResult.previous_expiry_date = previousExpiryDate;
            opResult.new_expiry_date = newExpiryDate;
          }

          successfulOperations.push(opResult);
        }
      } catch (error: any) {
        await client.query('ROLLBACK');

        // Detailed error message
        let detailedError = error.message;
        if (error.code) detailedError += ` (Code: ${error.code})`;
        if (error.detail) detailedError += ` - ${error.detail}`;

        failedOperations.push({
          id_number: record['ID Number'],
          success: false,
          operation: type,
          error: detailedError,
          record
        });
      } finally {
        client.release();
      }
    };

    // Process in chunks to control concurrency
    const allItems = [
      ...newMembers.map(m => ({ type: 'insert' as const, record: m })),
      ...existingMembers.map(m => ({ type: 'update' as const, record: m })),
      ...renewalRecords.map(m => ({ type: 'renewal' as const, record: m }))
    ];

    for (let i = 0; i < allItems.length; i += DatabaseOperationsService.RECORD_CONCURRENCY) {
      const chunk = allItems.slice(i, i + DatabaseOperationsService.RECORD_CONCURRENCY);
      await Promise.all(chunk.map(item => processItem(item.type, item.record)));

      if (i > 0 && i % 100 === 0) {
        console.log(`   Processed ${i}/${allItems.length} records...`);
      }
    }

    const inserts = successfulOperations.filter(op => op.operation === 'insert').length;
    const updates = successfulOperations.filter(op => op.operation === 'update').length;
    const renewals = successfulOperations.filter(op => op.operation === 'renewal').length;
    const earlyRenewals = successfulOperations.filter(op => op.operation === 'renewal' && op.renewal_classification === 'early_renewal').length;
    const expiredMemberRenewals = successfulOperations.filter(op => op.operation === 'renewal' && op.renewal_classification === 'expired_member_renewal').length;
    const skipped = successfulOperations.filter(op => op.operation === 'skip').length;

    console.log(`   ✅ Completed: ${inserts} inserts, ${updates} updates, ${renewals} renewals (${earlyRenewals} early, ${expiredMemberRenewals} expired), ${skipped} skipped (deceased)`);

    return {
      successful_operations: successfulOperations,
      failed_operations: failedOperations,
      operation_stats: {
        total_records: totalRecords,
        inserts,
        updates,
        skipped,
        failures: failedOperations.length,
        renewals,
        early_renewals: earlyRenewals,
        expired_member_renewals: expiredMemberRenewals
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

    // NEW BUSINESS LOGIC: Calculate expiry_date as last_payment_date + 2 years
    // Do NOT use the Expiry Date column from Excel
    let expiryDate: Date | null = null;
    if (lastPaymentDate) {
      expiryDate = new Date(lastPaymentDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      console.log(`      Calculated expiry_date: ${expiryDate.toISOString().split('T')[0]} (last_payment_date + 2 years)`);
    } else if (dateJoined) {
      // Fallback: if no last_payment_date, use date_joined + 2 years
      expiryDate = new Date(dateJoined);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      console.log(`      Calculated expiry_date: ${expiryDate.toISOString().split('T')[0]} (date_joined + 2 years, no last_payment_date)`);
    }

    // NEW BUSINESS LOGIC: Determine subscription_type_id based on date comparison
    // subscription_type_id = 6 (New) if date_joined == last_payment_date or only date_joined provided
    // subscription_type_id = 7 (Renewal) if date_joined < last_payment_date
    const isRenewal = this.isRenewalBasedOnDates(dateJoined, lastPaymentDate);
    const subscriptionTypeId = isRenewal ? 7 : 6; // 7 = Renewal, 6 = New
    console.log(`      Subscription type: ${isRenewal ? 'Renewal (7)' : 'New (6)'} based on date comparison`);

    const membershipAmount = this.parseAmount(record['Memebership Amount'] || record['Membership Amount']) || 0;

    // Membership status handling
    // Priority: 1) Deceased (VD 11111111) -> Inactive, 2) Active for all valid records
    // NEW BUSINESS LOGIC: Always set to Active (1) for new/renewal records unless deceased
    let membershipStatusId = 1; // Default: Active/Good Standing for new members
    if (votingDistrictCode === '11111111') {
      membershipStatusId = 6; // Inactive - Deceased
    }
    // Note: We now always set Active (1) regardless of expiry date, since we're calculating expiry as +2 years
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

    // NEW BUSINESS LOGIC: Calculate expiry_date as last_payment_date + 2 years
    // Do NOT use the Expiry Date column from Excel
    let expiryDate: Date | null = null;
    if (lastPaymentDate) {
      expiryDate = new Date(lastPaymentDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      console.log(`   📊 ID ${record['ID Number']}: Calculated expiry_date: ${expiryDate.toISOString().split('T')[0]} (last_payment_date + 2 years)`);
    } else if (dateJoined) {
      // Fallback: if no last_payment_date, use date_joined + 2 years
      expiryDate = new Date(dateJoined);
      expiryDate.setFullYear(expiryDate.getFullYear() + 2);
      console.log(`   📊 ID ${record['ID Number']}: Calculated expiry_date: ${expiryDate.toISOString().split('T')[0]} (date_joined + 2 years, no last_payment_date)`);
    }

    // NEW BUSINESS LOGIC: Determine subscription_type_id based on date comparison
    // subscription_type_id = 6 (New) if date_joined == last_payment_date or only date_joined provided
    // subscription_type_id = 7 (Renewal) if date_joined < last_payment_date
    const isRenewal = this.isRenewalBasedOnDates(dateJoined, lastPaymentDate);
    const subscriptionTypeId = isRenewal ? 7 : 6; // 7 = Renewal, 6 = New
    console.log(`   📊 ID ${record['ID Number']}: Subscription type: ${isRenewal ? 'Renewal (7)' : 'New (6)'} based on date comparison`);

    const membershipAmount = this.parseAmount(record['Memebership Amount'] || record['Membership Amount']);

    // Membership status handling
    // Priority: 1) Deceased (VD 11111111) -> Inactive, 2) Active for all valid records
    // NEW BUSINESS LOGIC: Always set to Active (1) for update records unless deceased
    let membershipStatusId: number | null = 1; // Default: Active/Good Standing
    if (votingDistrictCode === '11111111') {
      // Deceased member - set to Inactive
      membershipStatusId = 6;
    }
    console.log(`   📊 ID ${record['ID Number']}: Setting membership_status_id to ${membershipStatusId} (${membershipStatusId === 1 ? 'Active' : 'Inactive - Deceased'})`);
    // Note: We now always set Active (1) regardless of expiry date, since we're calculating expiry as +2 years

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
        membership_status_id = COALESCE($26, membership_status_id),
        voter_registration_id = COALESCE($27, voter_registration_id),
        is_registered_voter = COALESCE($28, is_registered_voter),
        last_voter_verification_date = COALESCE($29, last_voter_verification_date),
        updated_at = NOW()
      WHERE member_id = $30
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
      membershipStatusId,           // $26
      // Voter registration tracking fields (migration 011)
      voterRegistrationId,          // $27
      isRegisteredVoter,            // $28
      lastVoterVerificationDate,    // $29
      record.existing_member_id     // $30
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
   * Process a membership renewal
   *
   * Only updates renewal-specific fields:
   * - expiry_date (calculated as last_payment_date + 2 years)
   * - last_payment_date
   * - membership_status_id (set to 1 = Active/Good Standing)
   * - subscription_type_id (set to 7 = Renewal)
   * - membership_amount (if provided)
   * - updated_at
   *
   * Preserves all personal details (name, contact info, ward assignment, IEC data)
   *
   * @param client - Database client
   * @param record - Renewal record with validated expiry dates
   * @returns Object with memberId and success status
   */
  private async processRenewal(
    client: any,
    record: RenewalRecord
  ): Promise<{ memberId: number | null; updated: boolean }> {
    const memberId = record.existing_member_id;

    // Parse renewal-specific fields
    const lastPaymentDate = this.parseDate(record['Last Payment']);
    const membershipAmount = this.parseAmount(record['Memebership Amount'] || record['Membership Amount']);

    // NEW BUSINESS LOGIC: Calculate expiry_date as last_payment_date + 2 years
    // Do NOT use the excel_expiry_date value
    let newExpiryDate: Date | null = null;
    if (lastPaymentDate) {
      newExpiryDate = new Date(lastPaymentDate);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 2);
    } else {
      // Fallback to the pre-calculated value from preValidationService if no last_payment_date in record
      newExpiryDate = record.excel_expiry_date;
    }

    // Always set membership_status_id to 1 (Active/Good Standing) for renewals
    const membershipStatusId = 1;

    // Always set subscription_type_id to 7 (Renewal) for renewal records
    const subscriptionTypeId = 7;

    console.log(`      Processing renewal for member ${memberId}:`);
    console.log(`      Previous expiry: ${record.db_expiry_date?.toISOString().split('T')[0] || 'N/A'}`);
    console.log(`      New expiry: ${newExpiryDate?.toISOString().split('T')[0] || 'N/A'} (calculated: last_payment_date + 2 years)`);
    console.log(`      Classification: ${record.renewal_classification}`);
    console.log(`      Setting subscription_type_id: ${subscriptionTypeId} (Renewal)`);
    console.log(`      Setting membership_status_id: ${membershipStatusId} (Active)`);

    // Build UPDATE query for renewal-specific fields only
    // Now includes subscription_type_id to mark as renewal
    const query = `
      UPDATE members_consolidated
      SET
        expiry_date = $1,
        last_payment_date = COALESCE($2, last_payment_date),
        membership_status_id = $3,
        membership_amount = COALESCE($4, membership_amount),
        subscription_type_id = $5,
        updated_at = NOW()
      WHERE member_id = $6
    `;

    const params = [
      newExpiryDate,          // $1: expiry_date
      lastPaymentDate,        // $2: last_payment_date
      membershipStatusId,     // $3: membership_status_id
      membershipAmount,       // $4: membership_amount
      subscriptionTypeId,     // $5: subscription_type_id (7 = Renewal)
      memberId                // $6: member_id
    ];

    const result = await client.query(query, params);
    const updated = result.rowCount! > 0;

    if (updated) {
      console.log(`       Renewal processed successfully`);
    } else {
      console.log(`       Renewal failed: member not found`);
    }

    return { memberId: updated ? memberId : null, updated };
  }

  /**
   * Static method for processing records batch (for orchestrator)
   * Creates service instance and processes records
   */
  static async processRecordsBatch(
    newMembers: BulkUploadRecord[],
    existingMembers: ExistingMemberRecord[],
    iecResults: Map<string, IECVerificationResult>,
    pool: Pool,
    renewalRecords: RenewalRecord[] = []
  ): Promise<DatabaseOperationsBatchResult> {
    const lookupService = new LookupService(pool);
    await lookupService.initialize();

    const service = new DatabaseOperationsService(pool, lookupService);
    return service.processRecords(newMembers, existingMembers, iecResults, renewalRecords);
  }
}

