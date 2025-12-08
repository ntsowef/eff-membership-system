/**
 * Bulk Update Voter Registration Status
 *
 * Updates voter_registration_id based on existing voting_district_code:
 * - voter_registration_id = 1 (Registered) - ALL members EXCEPT those with VD '999999999'
 *   (includes VD '222222222' which are registered voters with IEC but recorded differently)
 * - voter_registration_id = 2 (Not Registered) - ONLY members with VD '999999999'
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function bulkUpdateVoterRegistration() {
  console.log('======================================================================');
  console.log('🗳️  BULK UPDATE VOTER REGISTRATION STATUS');
  console.log('======================================================================\n');

  try {
    // First, analyze the current data
    console.log('📊 Analyzing current VD codes...\n');

    // Check VD code '999999999' (Not Registered)
    const notRegResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM members_consolidated
      WHERE voting_district_code = '999999999'
    ` as any[];
    const notRegisteredCount = notRegResult[0].count;
    console.log(`❌ Members with VD '999999999' (Not Registered): ${notRegisteredCount.toLocaleString()} members`);

    // Check VD code '222222222' (Registered - special IEC registration)
    const specialRegResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM members_consolidated
      WHERE voting_district_code = '222222222'
    ` as any[];
    const specialRegisteredCount = specialRegResult[0].count;
    console.log(`✅ Members with VD '222222222' (Registered with IEC): ${specialRegisteredCount.toLocaleString()} members`);

    // Count all other members (Registered)
    const otherResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM members_consolidated
      WHERE voting_district_code != '999999999'
      OR voting_district_code IS NULL
    ` as any[];
    const registeredCount = otherResult[0].count;
    console.log(`✅ Total members to mark as Registered: ${registeredCount.toLocaleString()} members\n`);

    // Get total
    const totalResult = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM members_consolidated` as any[];
    const total = totalResult[0].count;

    console.log(`📋 Summary:`);
    console.log(`   Total members: ${total.toLocaleString()}`);
    console.log(`   Will set voter_registration_id = 1 (Registered): ${registeredCount.toLocaleString()}`);
    console.log(`   Will set voter_registration_id = 2 (Not Registered): ${notRegisteredCount.toLocaleString()}\n`);

    console.log('🔄 Updating voter registration status...\n');

    // Update NOT REGISTERED voters (ONLY VD '999999999')
    const notRegisteredUpdate = await prisma.$executeRaw`
      UPDATE members_consolidated
      SET voter_registration_id = 2,
          is_registered_voter = false,
          last_voter_verification_date = NOW()
      WHERE voting_district_code = '999999999'
    `;
    console.log(`✅ Updated ${notRegisteredUpdate.toLocaleString()} members to Not Registered (voter_registration_id = 2)`);

    // Update REGISTERED voters (ALL others including '222222222')
    const registeredUpdate = await prisma.$executeRaw`
      UPDATE members_consolidated
      SET voter_registration_id = 1,
          is_registered_voter = true,
          last_voter_verification_date = NOW()
      WHERE voting_district_code != '999999999'
      OR voting_district_code IS NULL
    `;
    console.log(`✅ Updated ${registeredUpdate.toLocaleString()} members to Registered (voter_registration_id = 1)`);

    // Verify the update
    console.log('\n📊 Verification...');
    const verification = await prisma.$queryRaw`
      SELECT voter_registration_id, COUNT(*)::int as count 
      FROM members_consolidated 
      GROUP BY voter_registration_id
      ORDER BY voter_registration_id
    ` as any[];
    
    console.log('\n✅ Final voter registration status distribution:');
    verification.forEach((row: any) => {
      const statusName = row.voter_registration_id === 1 ? 'Registered' : 
                         row.voter_registration_id === 2 ? 'Not Registered' : 
                         row.voter_registration_id === 3 ? 'Unknown' : 'Other';
      console.log(`   ${row.voter_registration_id} (${statusName}): ${row.count.toLocaleString()} members`);
    });

    console.log('\n======================================================================');
    console.log('✅ BULK UPDATE COMPLETED SUCCESSFULLY!');
    console.log('======================================================================');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bulkUpdateVoterRegistration();

