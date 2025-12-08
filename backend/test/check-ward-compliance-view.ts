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
    console.log('🔍 Checking vw_ward_compliance_summary view definition...\n');

    // Get view definition from PostgreSQL
    const viewDefResult = await pool.query(`
      SELECT pg_get_viewdef('vw_ward_compliance_summary', true) as view_definition
    `);

    const viewDef = viewDefResult.rows[0]?.view_definition || '';
    console.log('📋 Current View Definition:');
    console.log('='.repeat(80));
    console.log(viewDef);
    console.log('='.repeat(80));
    console.log();

    // Check if it uses old members table
    if (viewDef.includes('FROM members ') || viewDef.includes('JOIN members ')) {
      console.log('❌ PROBLEM FOUND: View uses OLD "members" table!');
      console.log('   This will cause slow queries because:');
      console.log('   1. The "members" table has 508,869 stale records');
      console.log('   2. It does NOT have the latest data');
      console.log('   3. It should use "members_consolidated" instead (626,759 records)');
      console.log();
      console.log('🔧 SOLUTION: Update view to use members_consolidated');
    } else if (viewDef.includes('members_consolidated')) {
      console.log('✅ GOOD: View uses "members_consolidated" table');
    } else {
      console.log('⚠️  WARNING: Could not determine which members table is used');
    }

    console.log();

    // Test query performance
    console.log('⏱️  Testing query performance for JHB004...\n');
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
      console.log('⚠️  WARNING: Query took more than 2 seconds - this is SLOW!');
    } else if (duration > 1000) {
      console.log('⚠️  Query is acceptable but could be faster');
    } else {
      console.log('✅ Query performance is good');
    }

    // Show sample ward data
    if (wardsResult.rows.length > 0) {
      console.log('\n📋 Sample ward data (first ward):');
      console.log(JSON.stringify(wardsResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkView();

