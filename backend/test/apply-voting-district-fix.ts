import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function applyMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 Applying migration to fix vw_voting_district_compliance...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'fix-voting-district-compliance-view.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...\n');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Now we need to recreate vw_ward_compliance_summary since it depends on vw_voting_district_compliance
    console.log('🔧 Recreating vw_ward_compliance_summary (CASCADE dependency)...\n');
    
    const wardCompliancePath = path.join(__dirname, '..', 'migrations', 'fix-ward-compliance-view-members-consolidated.sql');
    const wardComplianceSQL = fs.readFileSync(wardCompliancePath, 'utf8');
    
    await pool.query(wardComplianceSQL);
    
    console.log('✅ vw_ward_compliance_summary recreated successfully!\n');
    
    // Test query performance AFTER fix
    console.log('⏱️  Testing query performance for JHB004 AFTER fix...\n');
    const startTime = Date.now();
    
    const wardsResult = await pool.query(
      'SELECT * FROM vw_ward_compliance_summary WHERE municipality_code = $1',
      ['JHB004']
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`📊 Returned ${wardsResult.rows.length} wards`);
    console.log();
    
    if (duration > 2000) {
      console.log('⚠️  WARNING: Query still taking more than 2 seconds');
      console.log('   Expected: < 1000ms');
      console.log(`   Actual: ${duration}ms`);
    } else if (duration > 1000) {
      console.log('✅ Query performance improved significantly!');
      console.log(`   Before: ~13,600ms`);
      console.log(`   After: ${duration}ms`);
      console.log(`   Improvement: ${Math.round((13600 - duration) / 13600 * 100)}% faster`);
    } else {
      console.log('🎉 Query performance is EXCELLENT!');
      console.log(`   Before: ~13,600ms`);
      console.log(`   After: ${duration}ms`);
      console.log(`   Improvement: ${Math.round((13600 - duration) / 13600 * 100)}% faster`);
    }
    
  } catch (error: any) {
    console.error('❌ Error applying migration:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

