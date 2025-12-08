const { Pool } = require('pg');
require('dotenv').config();

async function checkViewDefinition() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'eff_membership_database',
  });

  try {
    console.log('🔍 Checking vw_member_details view definition...\n');

    // Get view definition
    const viewDefQuery = `
      SELECT pg_get_viewdef('vw_member_details', true) as view_definition;
    `;
    const viewDefResult = await pool.query(viewDefQuery);
    console.log('📋 View Definition:');
    console.log(viewDefResult.rows[0].view_definition);
    console.log('\n');

    // Count members in vw_member_details
    const countViewQuery = 'SELECT COUNT(*) as count FROM vw_member_details';
    const countViewResult = await pool.query(countViewQuery);
    console.log(`📊 Count in vw_member_details: ${countViewResult.rows[0].count}`);

    // Count members in members table
    const countMembersQuery = 'SELECT COUNT(*) as count FROM members';
    const countMembersResult = await pool.query(countMembersQuery);
    console.log(`📊 Count in members table: ${countMembersResult.rows[0].count}`);

    // Count members in members_consolidated table
    const countConsolidatedQuery = 'SELECT COUNT(*) as count FROM members_consolidated';
    const countConsolidatedResult = await pool.query(countConsolidatedQuery);
    console.log(`📊 Count in members_consolidated table: ${countConsolidatedResult.rows[0].count}`);

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkViewDefinition();

