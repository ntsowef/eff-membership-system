/**
 * Verify Voter Registration Script
 * 
 * This script checks voter registration status by querying the IEC API
 * using a member's ID number. It determines:
 * - If the member is registered to vote (has valid VD code from IEC)
 * - If they have Special VD code (222222222) indicating not registered
 * 
 * Usage:
 *   npx ts-node scripts/verify-voter-registration.ts <id_number>
 *   npx ts-node scripts/verify-voter-registration.ts 0312050173086
 */

import { PrismaClient } from '@prisma/client';
import iecApiService from '../src/services/iecApiService';

const prisma = new PrismaClient();

// Special VD code for unregistered voters
const VD_CODE_NOT_REGISTERED = '222222222';

// Voter registration status IDs (matching migration)
const VOTER_REG_STATUS = {
  REGISTERED: 1,
  NOT_REGISTERED: 2,
  UNKNOWN: 3,
  VERIFICATION_FAILED: 4
};

interface VerificationResult {
  id_number: string;
  is_registered: boolean;
  voter_registration_id: number;
  voter_status: string;
  voting_district_code?: string;
  voting_station_name?: string;
  province_code?: string;
  municipality_code?: string;
  ward_code?: string;
  error?: string;
}

/**
 * Verify a single member's voter registration status
 */
async function verifyVoterRegistration(idNumber: string): Promise<VerificationResult> {
  console.log(`\n🔍 Verifying voter registration for ID: ${idNumber}`);
  console.log('='.repeat(60));

  try {
    // Call IEC API to get voter details
    const iecData = await iecApiService.verifyVoter(idNumber);

    if (!iecData) {
      console.log('❌ No data returned from IEC API');
      return {
        id_number: idNumber,
        is_registered: false,
        voter_registration_id: VOTER_REG_STATUS.VERIFICATION_FAILED,
        voter_status: 'Verification Failed - No data returned',
        error: 'IEC API returned no data'
      };
    }

    // Determine registration status based on IEC response
    const votingDistrictCode = iecData.voting_district_code;
    const isRegistered = iecData.is_registered && 
                         votingDistrictCode !== VD_CODE_NOT_REGISTERED &&
                         votingDistrictCode !== undefined;

    const voterRegistrationId = isRegistered 
      ? VOTER_REG_STATUS.REGISTERED 
      : VOTER_REG_STATUS.NOT_REGISTERED;

    const result: VerificationResult = {
      id_number: idNumber,
      is_registered: isRegistered,
      voter_registration_id: voterRegistrationId,
      voter_status: iecData.voter_status,
      voting_district_code: votingDistrictCode,
      voting_station_name: iecData.voting_station_name,
      province_code: iecData.province_code,
      municipality_code: iecData.municipality_code,
      ward_code: iecData.ward_code
    };

    // Display results
    console.log('\n📋 Verification Results:');
    console.log(`   ID Number: ${idNumber}`);
    console.log(`   IEC Registered: ${iecData.is_registered}`);
    console.log(`   Voter Status: ${iecData.voter_status}`);
    console.log(`   Voting District Code: ${votingDistrictCode || 'N/A'}`);
    console.log(`   Voting Station: ${iecData.voting_station_name || 'N/A'}`);
    console.log('\n📊 Mapping Results:');
    console.log(`   is_registered_voter: ${isRegistered}`);
    console.log(`   voter_registration_id: ${voterRegistrationId} (${isRegistered ? 'Registered' : 'Not Registered'})`);
    
    if (votingDistrictCode === VD_CODE_NOT_REGISTERED) {
      console.log(`   ⚠️  Special VD Code ${VD_CODE_NOT_REGISTERED} detected - Member not registered to vote`);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Error during verification:', error.message);
    return {
      id_number: idNumber,
      is_registered: false,
      voter_registration_id: VOTER_REG_STATUS.VERIFICATION_FAILED,
      voter_status: 'Verification Failed',
      error: error.message
    };
  }
}

/**
 * Check if member exists in members_consolidated and show current status
 */
async function checkMemberStatus(idNumber: string): Promise<void> {
  const member = await prisma.$queryRawUnsafe(`
    SELECT member_id, firstname, surname, voting_district_code, 
           voter_registration_id, is_registered_voter, last_voter_verification_date
    FROM members_consolidated 
    WHERE id_number = $1
    LIMIT 1
  `, idNumber) as any[];

  if (member.length > 0) {
    console.log('\n📁 Current Database Record:');
    console.log(`   Member ID: ${member[0].member_id}`);
    console.log(`   Name: ${member[0].firstname} ${member[0].surname}`);
    console.log(`   VD Code: ${member[0].voting_district_code || 'Not set'}`);
    console.log(`   voter_registration_id: ${member[0].voter_registration_id || 'Not set'}`);
    console.log(`   is_registered_voter: ${member[0].is_registered_voter ?? 'Not set'}`);
    console.log(`   Last Verified: ${member[0].last_voter_verification_date || 'Never'}`);
  } else {
    console.log('\n📁 Member not found in members_consolidated table');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx ts-node scripts/verify-voter-registration.ts <id_number>');
    console.log('Example: npx ts-node scripts/verify-voter-registration.ts 0312050173086');
    process.exit(1);
  }

  const idNumber = args[0];

  // Validate ID number format
  if (!/^\d{13}$/.test(idNumber)) {
    console.error('❌ Invalid ID number format. Must be 13 digits.');
    process.exit(1);
  }

  try {
    // Check current status in database
    await checkMemberStatus(idNumber);

    // Verify with IEC API
    const result = await verifyVoterRegistration(idNumber);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete');
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

