/**
 * Run Criterion 1 Update Migrations
 * This script runs the migrations to update Criterion 1 logic
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
});

async function runMigration(filePath: string, description: string) {
  console.log(`\n🔄 Running migration: ${description}`);
  console.log(`📄 File: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ Migration completed successfully: ${description}`);
  } catch (error: any) {
    console.error(`❌ Migration failed: ${description}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Criterion 1 migrations...\n');
  
  try {
    // Migration 1: Add exception tracking fields
    await runMigration(
      path.join(__dirname, '../migrations/add-criterion-1-exception-tracking.sql'),
      'Add Criterion 1 exception tracking fields'
    );
    
    // Migration 2: Update materialized view with new logic
    await runMigration(
      path.join(__dirname, '../migrations/update-criterion-1-logic.sql'),
      'Update Criterion 1 logic in materialized view'
    );
    
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added exception tracking fields to wards table');
    console.log('  - Updated materialized view with new Criterion 1 logic');
    console.log('  - New rules:');
    console.log('    • <= 3 VDs: Must have ALL VDs compliant (no exceptions)');
    console.log('    • >= 4 VDs + >= 200 members: Pass (allow exception)');
    console.log('    • >= 4 VDs + 190-199 members + all VDs compliant: Pass (exception)');
    
  } catch (error) {
    console.error('\n❌ Migration process failed');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

