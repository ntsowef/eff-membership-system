/**
 * Script to check the structure of members_consolidated table
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTable() {
  try {
    // Check if members_consolidated table exists and get its structure
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated'
      ORDER BY ordinal_position
    `);
    
    console.log('=== members_consolidated table structure ===');
    console.log(JSON.stringify(columns, null, 2));
    
    // Get count
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM members_consolidated`);
    console.log('\n=== Record count ===');
    console.log(count);
    
    // Check if voter_registration columns already exist
    const voterColumns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' 
      AND column_name IN ('voter_registration_id', 'is_registered_voter')
    `);
    console.log('\n=== Existing voter registration columns ===');
    console.log(voterColumns);
    
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();

