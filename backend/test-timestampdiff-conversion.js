/**
 * Test TIMESTAMPDIFF function conversion
 */

const { Pool } = require('pg');

async function testTimestampdiffConversion() {
  console.log('🔍 Testing TIMESTAMPDIFF function conversion...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Original failing query (should fail)
    console.log('\n1. Testing original MySQL TIMESTAMPDIFF query...');
    try {
      const originalQuery = `
        SELECT
          'Test Position' as position_name,
          AVG(TIMESTAMPDIFF(MONTH, '2023-01-01', '2024-01-01')) as average_tenure_months,
          1 as current_appointments
      `;
      await pool.query(originalQuery);
      console.log('❌ Original MySQL query should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Original MySQL query failed as expected:', error.message.substring(0, 50) + '...');
    }
    
    // Test 2: Test the converted PostgreSQL equivalents
    console.log('\n2. Testing PostgreSQL TIMESTAMPDIFF conversions...');
    
    const testQueries = [
      {
        name: 'TIMESTAMPDIFF MONTH conversion',
        query: `SELECT EXTRACT(EPOCH FROM ('2024-01-01'::timestamp - '2023-01-01'::timestamp)) / 2629746 as months_diff`
      },
      {
        name: 'TIMESTAMPDIFF YEAR conversion',
        query: `SELECT EXTRACT(YEAR FROM AGE('2024-01-01'::timestamp, '2023-01-01'::timestamp)) as years_diff`
      },
      {
        name: 'TIMESTAMPDIFF DAY conversion',
        query: `SELECT ('2024-01-01'::DATE - '2023-01-01'::DATE) as days_diff`
      },
      {
        name: 'TIMESTAMPDIFF HOUR conversion',
        query: `SELECT EXTRACT(EPOCH FROM ('2024-01-01 12:00:00'::timestamp - '2024-01-01 10:00:00'::timestamp)) / 3600 as hours_diff`
      }
    ];
    
    for (const test of testQueries) {
      try {
        const result = await pool.query(test.query);
        console.log(`✅ ${test.name}: Success - Result: ${JSON.stringify(result.rows[0])}`);
      } catch (error) {
        console.log(`❌ ${test.name}: Failed - ${error.message}`);
      }
    }
    
    // Test 3: Test the actual leadership analytics query structure
    console.log('\n3. Testing leadership analytics query structure...');
    
    // First check if leadership tables exist
    const tablesExistQuery = `
      SELECT 
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leadership_positions')) as positions_exists,
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leadership_appointments')) as appointments_exists
    `;
    
    const tablesResult = await pool.query(tablesExistQuery);
    console.log('Leadership tables exist:', tablesResult.rows[0]);
    
    if (tablesResult.rows[0].positions_exists && tablesResult.rows[0].appointments_exists) {
      // Test the converted leadership analytics query
      const leadershipQuery = `
        SELECT
          lp.position_name,
          AVG(EXTRACT(EPOCH FROM (COALESCE(la.end_date, CURRENT_TIMESTAMP) - la.start_date)) / 2629746) as average_tenure_months,
          COUNT(CASE WHEN la.appointment_status = 'Active' THEN 1 END) as current_appointments
        FROM leadership_positions lp
        LEFT JOIN leadership_appointments la ON lp.id = la.position_id
        WHERE lp.is_active = TRUE
        GROUP BY lp.id, lp.position_name
        ORDER BY average_tenure_months DESC
        LIMIT 5
      `;
      
      try {
        const result = await pool.query(leadershipQuery);
        console.log(`✅ Leadership analytics query: Success (${result.rows.length} rows)`);
        if (result.rows.length > 0) {
          console.log('Sample result:', result.rows[0]);
        }
      } catch (error) {
        console.log(`❌ Leadership analytics query: Failed - ${error.message}`);
      }
    } else {
      console.log('⚠️  Leadership tables do not exist, skipping leadership query test');
    }
    
    console.log('\n🎉 TIMESTAMPDIFF conversion testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testTimestampdiffConversion();
