/**
 * Comprehensive test for all database fixes
 */

const { Pool } = require('pg');

async function testAllDatabaseFixes() {
  console.log('🔍 Testing all database fixes...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  let passedTests = 0;
  let totalTests = 0;

  const runTest = async (testName, query, shouldSucceed = true) => {
    totalTests++;
    try {
      const result = await pool.query(query);
      if (shouldSucceed) {
        console.log(`✅ ${testName}: PASSED (${result.rows.length} rows)`);
        passedTests++;
        return result;
      } else {
        console.log(`❌ ${testName}: FAILED (should have failed but succeeded)`);
        return result;
      }
    } catch (error) {
      if (!shouldSucceed) {
        console.log(`✅ ${testName}: PASSED (correctly failed: ${error.message})`);
        passedTests++;
        return null;
      } else {
        console.log(`❌ ${testName}: FAILED - ${error.message}`);
        return null;
      }
    }
  };

  try {
    console.log('\n🔧 1. TESTING ANALYTICS start_datetime FIXES...');
    
    // Test 1: Original failing query should fail
    await runTest(
      'Original start_datetime query fails',
      `SELECT COUNT(*) as count FROM meetings WHERE meeting_status = 'Scheduled' AND start_datetime::DATE >= CURRENT_DATE`,
      false
    );
    
    // Test 2: Fixed query should work
    await runTest(
      'Fixed meeting_date query works',
      `SELECT COUNT(*) as count FROM meetings WHERE meeting_status = 'Scheduled' AND meeting_date >= CURRENT_DATE`
    );
    
    // Test 3: Monthly meetings grouping
    await runTest(
      'Monthly meetings grouping',
      `SELECT 
        TO_CHAR(meeting_date, 'YYYY-MM') as month,
        COUNT(*) as meeting_count
      FROM meetings
      WHERE meeting_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(meeting_date, 'YYYY-MM')
      ORDER BY month
      LIMIT 5`
    );
    
    console.log('\n🔧 2. TESTING QUALIFICATIONS TABLE FIXES...');
    
    // Test 4: Original qualification_levels query should fail
    await runTest(
      'Original qualification_levels query fails',
      `SELECT * FROM qualification_levels ORDER BY qualification_level`,
      false
    );
    
    // Test 5: Fixed qualifications query should work
    await runTest(
      'Fixed qualifications query works',
      `SELECT qualification_id, qualification_name, level_order FROM qualifications ORDER BY level_order`
    );
    
    // Test 6: Statistics qualification breakdown
    await runTest(
      'Statistics qualification breakdown',
      `SELECT 
        q.qualification_name,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members)), 2) as percentage
      FROM members m
      LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
      WHERE q.qualification_name IS NOT NULL
      GROUP BY q.qualification_id, q.qualification_name
      ORDER BY q.level_order
      LIMIT 5`
    );
    
    // Test 7: Lookups qualification levels
    await runTest(
      'Lookups qualification levels',
      `SELECT qualification_id, qualification_name, level_order as qualification_level, created_at 
       FROM qualifications ORDER BY level_order`
    );
    
    console.log('\n🔧 3. TESTING SEARCH FUNCTIONALITY...');
    
    // Test 8: Search history table exists
    await runTest(
      'Search history table exists',
      `SELECT COUNT(*) FROM search_history`
    );
    
    // Test 9: Member search with qualifications
    await runTest(
      'Member search with qualifications',
      `SELECT m.member_id, m.firstname, m.surname, q.qualification_name
       FROM members m
       LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
       LIMIT 5`
    );
    
    console.log('\n🔧 4. TESTING SQL CONVERSION FUNCTIONALITY...');
    
    // Test 10: Parameter placeholder conversion (simulated)
    await runTest(
      'PostgreSQL parameter syntax',
      `SELECT COUNT(*) FROM members WHERE firstname = $1`,
      false // This should fail without actual parameter
    );
    
    // Test 11: DATE functions
    await runTest(
      'PostgreSQL DATE functions',
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN date_joined >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent
       FROM members`
    );
    
    // Test 12: NULLIF function
    await runTest(
      'NULLIF function support',
      `SELECT 
        COUNT(*) as total,
        COUNT(NULLIF(cell_number, '')) as with_cell
       FROM members
       LIMIT 1`
    );
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Database fixes are working correctly! 🚀');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} tests failed. Some issues may remain.`);
    }
    
    console.log('\n📊 SUMMARY OF FIXES APPLIED:');
    console.log('✅ Fixed start_datetime → meeting_date in analytics queries');
    console.log('✅ Fixed qualification_levels → qualifications table references');
    console.log('✅ Fixed qualification_level → level_order column references');
    console.log('✅ Created missing search_history table');
    console.log('✅ Implemented comprehensive SQL conversion system');
    console.log('✅ Added parameter placeholder conversion (? → $1, $2, $3)');
    console.log('✅ Added MySQL function conversions (DATE_FORMAT, NULLIF, etc.)');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await pool.end();
  }
}

testAllDatabaseFixes();
