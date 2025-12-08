const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function runMigration() {
  try {
    console.log('🔧 Running migration to fix vw_enhanced_member_search view...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'fix-vw-enhanced-member-search-use-consolidated.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');
    
    // Verify the counts
    console.log('📊 Verifying counts...\n');
    
    const viewCountQuery = 'SELECT COUNT(*) as count FROM vw_enhanced_member_search';
    const viewCountResult = await pool.query(viewCountQuery);
    console.log(`📊 Count in vw_enhanced_member_search: ${viewCountResult.rows[0].count}`);
    
    const consolidatedCountQuery = 'SELECT COUNT(*) as count FROM members_consolidated';
    const consolidatedCountResult = await pool.query(consolidatedCountQuery);
    console.log(`📊 Count in members_consolidated: ${consolidatedCountResult.rows[0].count}`);
    
    if (viewCountResult.rows[0].count === consolidatedCountResult.rows[0].count) {
      console.log('\n✅ SUCCESS! Counts match - view is now using members_consolidated table');
    } else {
      console.log('\n⚠️  WARNING: Counts do not match');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

runMigration();

