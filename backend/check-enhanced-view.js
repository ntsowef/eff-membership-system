const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkView() {
  try {
    console.log('🔍 Checking vw_enhanced_member_search view...\n');
    
    // Get view definition
    const viewDefQuery = `
      SELECT pg_get_viewdef('vw_enhanced_member_search'::regclass, true) as definition
    `;
    const viewDefResult = await pool.query(viewDefQuery);
    console.log('📋 View Definition:');
    console.log(viewDefResult.rows[0].definition);
    console.log('\n');
    
    // Count records in view
    const countQuery = 'SELECT COUNT(*) as count FROM vw_enhanced_member_search';
    const countResult = await pool.query(countQuery);
    console.log(`📊 Count in vw_enhanced_member_search: ${countResult.rows[0].count}`);
    
    // Count records in members table
    const membersCountQuery = 'SELECT COUNT(*) as count FROM members';
    const membersCountResult = await pool.query(membersCountQuery);
    console.log(`📊 Count in members table: ${membersCountResult.rows[0].count}`);
    
    // Count records in members_consolidated table
    const consolidatedCountQuery = 'SELECT COUNT(*) as count FROM members_consolidated';
    const consolidatedCountResult = await pool.query(consolidatedCountQuery);
    console.log(`📊 Count in members_consolidated table: ${consolidatedCountResult.rows[0].count}`);
    
    console.log('\n');
    if (viewDefResult.rows[0].definition.includes('FROM members ') || 
        viewDefResult.rows[0].definition.includes('FROM members\n')) {
      console.log('❌ View uses "members" table - needs to be updated to "members_consolidated"');
    } else if (viewDefResult.rows[0].definition.includes('FROM members_consolidated')) {
      console.log('✅ View already uses "members_consolidated" table');
    } else {
      console.log('⚠️  Could not determine which table the view uses');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkView();

