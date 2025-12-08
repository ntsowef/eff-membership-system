/**
 * Run migration 011 - Add voter registration tracking
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('Running migration 011_add_voter_registration_tracking...\n');

  try {
    // Create voter_registration_statuses table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS voter_registration_statuses (
        registration_status_id SERIAL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL UNIQUE,
        status_code VARCHAR(10) UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created voter_registration_statuses table');

    // Insert default statuses
    await prisma.$executeRawUnsafe(`
      INSERT INTO voter_registration_statuses (registration_status_id, status_name, status_code, description) 
      VALUES 
        (1, 'Registered', 'REG', 'Member is registered to vote with a valid VD code from IEC'),
        (2, 'Not Registered', 'NOTREG', 'Member is not registered to vote with IEC'),
        (3, 'Unknown', 'UNKNOWN', 'Voter registration status has not been verified'),
        (4, 'Verification Failed', 'FAILED', 'IEC API verification failed - status unknown')
      ON CONFLICT (registration_status_id) DO NOTHING
    `);
    console.log('✅ Inserted default voter registration statuses');

    // Add columns to members_consolidated
    await prisma.$executeRawUnsafe(`
      ALTER TABLE members_consolidated 
      ADD COLUMN IF NOT EXISTS voter_registration_id INTEGER DEFAULT 3
    `);
    console.log('✅ Added voter_registration_id column');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE members_consolidated 
      ADD COLUMN IF NOT EXISTS is_registered_voter BOOLEAN DEFAULT NULL
    `);
    console.log('✅ Added is_registered_voter column');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE members_consolidated 
      ADD COLUMN IF NOT EXISTS last_voter_verification_date TIMESTAMP DEFAULT NULL
    `);
    console.log('✅ Added last_voter_verification_date column');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_members_consolidated_voter_registration_id 
      ON members_consolidated(voter_registration_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_members_consolidated_is_registered_voter 
      ON members_consolidated(is_registered_voter)
    `);
    console.log('✅ Created indexes');

    // Verify
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' 
      AND column_name IN ('voter_registration_id', 'is_registered_voter', 'last_voter_verification_date')
    ` as any[];
    console.log('\n📋 New columns in members_consolidated:');
    cols.forEach((c: any) => console.log(`   - ${c.column_name}: ${c.data_type}`));

    const statuses = await prisma.$queryRaw`SELECT * FROM voter_registration_statuses` as any[];
    console.log('\n📋 Voter registration statuses:');
    statuses.forEach((s: any) => console.log(`   ${s.registration_status_id}: ${s.status_name} (${s.status_code})`));

    console.log('\n✅ Migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

