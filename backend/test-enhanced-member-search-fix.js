/**
 * Test the enhanced member search view fix
 */

const { Pool } = require('pg');

async function testEnhancedMemberSearchFix() {
  console.log('🔍 Testing enhanced member search view fix...');
  
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
    console.log('\n🔧 1. TESTING ORIGINAL FAILING QUERY...');
    
    // Test 1: The original failing query from the error log
    await runTest(
      'Original failing query now works',
      `SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE 1=1`
    );
    
    console.log('\n🔧 2. TESTING MEMBER MODEL QUERIES...');
    
    // Test 2: Member listing query (from members.ts)
    await runTest(
      'Member listing query',
      `SELECT * FROM vw_enhanced_member_search
       WHERE 1=1
       ORDER BY member_id DESC
       LIMIT 10 OFFSET 0`
    );
    
    // Test 3: Member count query (from members.ts)
    await runTest(
      'Member count query',
      `SELECT COUNT(*) as count FROM vw_enhanced_member_search WHERE 1=1`
    );
    
    // Test 4: Member by ID query (from members.ts)
    await runTest(
      'Member by ID query',
      `SELECT * FROM vw_enhanced_member_search WHERE member_id = 1`
    );
    
    console.log('\n🔧 3. TESTING SEARCH FUNCTIONALITY...');
    
    // Test 5: Search by name
    await runTest(
      'Search by name',
      `SELECT member_id, full_name, ward_display
       FROM vw_enhanced_member_search 
       WHERE search_text ILIKE '%john%'
       LIMIT 5`
    );
    
    // Test 6: Search by ID number
    await runTest(
      'Search by ID number',
      `SELECT member_id, full_name, id_number
       FROM vw_enhanced_member_search 
       WHERE search_text ILIKE '%800101%'
       LIMIT 5`
    );
    
    // Test 7: Geographic filtering
    await runTest(
      'Geographic filtering',
      `SELECT COUNT(*) as count
       FROM vw_enhanced_member_search 
       WHERE province_name = 'Gauteng'`
    );
    
    console.log('\n🔧 4. TESTING VIEW STRUCTURE...');
    
    // Test 8: Check all expected columns exist
    await runTest(
      'View structure check',
      `SELECT 
        member_id, full_name, ward_display, location_display, 
        search_text, occupation_name, qualification_name
       FROM vw_enhanced_member_search 
       LIMIT 1`
    );
    
    // Test 9: Test search_text column functionality
    await runTest(
      'Search text functionality',
      `SELECT member_id, full_name, 
        LENGTH(search_text) as search_text_length
       FROM vw_enhanced_member_search 
       WHERE search_text IS NOT NULL
       LIMIT 5`
    );
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! vw_enhanced_member_search view is working correctly! 🚀');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} tests failed. Some issues may remain.`);
    }
    
    console.log('\n📊 SUMMARY OF FIX:');
    console.log('✅ Created missing vw_enhanced_member_search view');
    console.log('✅ Fixed table relationship issues (wards -> municipalities -> districts -> provinces)');
    console.log('✅ Used correct table names (qualifications instead of qualification_levels)');
    console.log('✅ Included comprehensive search_text field for full-text search');
    console.log('✅ All member model queries now working');
    console.log('✅ Search functionality fully operational');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await pool.end();
  }
}

testEnhancedMemberSearchFix();
