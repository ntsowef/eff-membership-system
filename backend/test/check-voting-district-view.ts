import { Pool } from 'pg';

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function checkView() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 Checking vw_voting_district_compliance view definition...\n');
    
    // Get view definition
    const viewDefResult = await pool.query(`
      SELECT pg_get_viewdef('vw_voting_district_compliance', true) as view_definition
    `);
    
    const viewDef = viewDefResult.rows[0]?.view_definition || '';
    console.log('📋 Current View Definition:');
    console.log('='.repeat(80));
    console.log(viewDef);
    console.log('='.repeat(80));
    console.log();
    
    // Check if it uses old members table
    if (viewDef.includes('FROM members ') || viewDef.includes('JOIN members ')) {
      console.log('❌ PROBLEM FOUND: vw_voting_district_compliance uses OLD "members" table!');
      console.log('   This is the ROOT CAUSE of the slow query!');
      console.log('   The view does a sequential scan on 508,869 stale records.');
      console.log();
      console.log('🔧 SOLUTION: Update view to use members_consolidated');
    } else if (viewDef.includes('members_consolidated')) {
      console.log('✅ GOOD: View uses "members_consolidated" table');
    } else {
      console.log('⚠️  WARNING: Could not determine which members table is used');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkView();

