const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testParameterMismatchFix() {
  console.log('🧪 Testing parameter mismatch fix...\n');

  try {
    // Test the original failing query scenarios
    console.log('1. Testing the empty trends query without parameters...');
    
    const emptyTrendsQuery = `SELECT NULL as trend_month LIMIT 0`;
    
    // This should work without parameters
    const result1 = await pool.query(emptyTrendsQuery, []);
    console.log('✅ Empty trends query executed successfully without parameters');
    console.log(`Result: ${result1.rows.length} rows returned (expected 0)`);

    // Test that it fails with parameters (to confirm the issue)
    console.log('\n2. Testing the same query with parameters (should fail)...');
    try {
      const result2 = await pool.query(emptyTrendsQuery, ['21507034']);
      console.log('❌ Query unexpectedly succeeded with parameters');
    } catch (error) {
      console.log('✅ Query correctly failed with parameters (as expected)');
      console.log(`Error: ${error.message}`);
    }

    // Test the ward info query that needs parameters
    console.log('\n3. Testing ward info query with parameters...');
    
    const wardInfoQuery = `
      SELECT
        ward_code,
        ward_name,
        municipality_code,
        municipality_name,
        district_name,
        province_name,
        active_members,
        expired_members,
        inactive_members,
        total_members,
        ward_standing,
        standing_level,
        active_percentage,
        target_achievement_percentage,
        members_needed_next_level,
        last_updated
      FROM vw_ward_membership_audit
      WHERE ward_code = $1
    `;

    // Use a valid ward code from our data
    const testWardCode = '21507034';
    const result3 = await pool.query(wardInfoQuery, [testWardCode]);
    console.log('✅ Ward info query executed successfully with parameters');
    console.log(`Result: ${result3.rows.length} rows returned`);
    
    if (result3.rows.length > 0) {
      const ward = result3.rows[0];
      console.log(`Ward found: ${ward.ward_name} (${ward.ward_code}) - ${ward.active_members} active members`);
    }

    // Test the municipality wards query that needs multiple parameters
    console.log('\n4. Testing municipality wards query with multiple parameters...');
    
    const municipalityWardsQuery = `
      SELECT
        ward_code,
        ward_name,
        active_members,
        ward_standing,
        target_achievement_percentage
      FROM vw_ward_membership_audit
      WHERE municipality_code = (
        SELECT municipality_code FROM vw_ward_membership_audit WHERE ward_code = $1
      )
      AND ward_code != $2
      ORDER BY active_members DESC
      LIMIT 10
    `;

    const result4 = await pool.query(municipalityWardsQuery, [testWardCode, testWardCode]);
    console.log('✅ Municipality wards query executed successfully with multiple parameters');
    console.log(`Result: ${result4.rows.length} comparison wards returned`);

    // Test the parallel execution pattern (simulating the fixed code)
    console.log('\n5. Testing parallel execution with correct parameter handling...');
    
    const [wardInfo, wardTrends, municipalityWards] = await Promise.all([
      pool.query(wardInfoQuery, [testWardCode]),
      pool.query(emptyTrendsQuery, []), // No parameters for empty trends query
      pool.query(municipalityWardsQuery, [testWardCode, testWardCode])
    ]);

    console.log('✅ All parallel queries executed successfully!');
    console.log(`Ward info: ${wardInfo.rows.length} rows`);
    console.log(`Ward trends: ${wardTrends.rows.length} rows (expected 0)`);
    console.log(`Municipality wards: ${municipalityWards.rows.length} rows`);

    // Test with different ward codes to ensure robustness
    console.log('\n6. Testing with different ward codes...');
    
    const testWardCodes = ['21507034', '21507035', '21507036'];
    
    for (const wardCode of testWardCodes) {
      try {
        const [info, trends, comparison] = await Promise.all([
          pool.query(wardInfoQuery, [wardCode]),
          pool.query(emptyTrendsQuery, []), // Always no parameters
          pool.query(municipalityWardsQuery, [wardCode, wardCode])
        ]);
        
        console.log(`✅ Ward ${wardCode}: ${info.rows.length} info, ${trends.rows.length} trends, ${comparison.rows.length} comparison`);
      } catch (error) {
        console.log(`⚠️  Ward ${wardCode}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testParameterMismatchFix().catch(console.error);
