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
    console.log('🔧 Applying migration to fix vw_ward_compliance_summary...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'fix-ward-compliance-view-members-consolidated.sql');
    console.log('📁 Migration path:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🚀 Executing migration...\n');

    // Execute migration
    const result = await pool.query(migrationSQL);
    console.log('Migration result:', result);
    
    console.log('✅ Migration applied successfully!\n');
    
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
    
    if (duration > 2000) {
      console.log('⚠️  WARNING: Query still taking more than 2 seconds');
    } else if (duration > 1000) {
      console.log('✅ Query performance improved but could be better');
    } else {
      console.log('✅ Query performance is EXCELLENT!');
    }
    
    // Verify view is using members_consolidated
    console.log('\n🔍 Verifying view definition...\n');
    const viewDefResult = await pool.query(`
      SELECT pg_get_viewdef('vw_ward_compliance_summary', true) as view_definition
    `);
    
    const viewDef = viewDefResult.rows[0]?.view_definition || '';
    
    if (viewDef.includes('members_consolidated')) {
      console.log('✅ VERIFIED: View now uses members_consolidated table');
    } else if (viewDef.includes('FROM members ') || viewDef.includes('JOIN members ')) {
      console.log('❌ ERROR: View still uses old members table!');
    }
    
  } catch (error: any) {
    console.error('❌ Error applying migration:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

