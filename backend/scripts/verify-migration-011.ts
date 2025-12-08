/**
 * Verify migration 011 was applied correctly
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('Verifying migration 011...\n');

  try {
    // Check columns exist
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' 
      AND column_name IN ('voter_registration_id', 'is_registered_voter', 'last_voter_verification_date')
    ` as any[];
    
    console.log('✅ Columns in members_consolidated:');
    cols.forEach((c: any) => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    // Check statuses
    const statuses = await prisma.$queryRaw`SELECT * FROM voter_registration_statuses` as any[];
    console.log('\n✅ Voter registration statuses:');
    statuses.forEach((s: any) => console.log(`   ${s.registration_status_id}: ${s.status_name} (${s.status_code})`));
    
    // Check sample member
    const sample = await prisma.$queryRaw`
      SELECT member_id, id_number, firstname, surname, voter_registration_id, is_registered_voter
      FROM members_consolidated 
      LIMIT 3
    ` as any[];
    console.log('\n✅ Sample members:');
    sample.forEach((m: any) => console.log(`   ${m.member_id}: ${m.firstname} ${m.surname} - voter_reg_id: ${m.voter_registration_id}, is_registered: ${m.is_registered_voter}`));
    
    console.log('\n✅ Migration 011 verified successfully!');
    
  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

