/**
 * Test geographic data types and member count calculations
 */

const { Pool } = require('pg');

async function testGeographicDataTypes() {
  console.log('🔍 Testing geographic data types and member count calculations...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check the exact query used in the province stats endpoint
    console.log('\n1. Testing province stats query (from /members/stats/provinces)...');
    
    const provinceQuery = `
      SELECT
        p.province_code,
        p.province_name,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as member_count
      FROM provinces p
      LEFT JOIN vw_member_details m ON p.province_code = m.province_code
      GROUP BY p.province_code, p.province_name
      ORDER BY member_count DESC
    `;
    
    const provinceResult = await pool.query(provinceQuery);
    console.log('Province query results:');
    provinceResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.province_name}: ${row.member_count} (type: ${typeof row.member_count})`);
    });
    
    // Test 2: Check if member_count values are strings or numbers
    console.log('\n2. Analyzing member_count data types...');
    const firstRow = provinceResult.rows[0];
    if (firstRow) {
      console.log('First row member_count:', {
        value: firstRow.member_count,
        type: typeof firstRow.member_count,
        isString: typeof firstRow.member_count === 'string',
        isNumber: typeof firstRow.member_count === 'number',
        parsed: parseInt(firstRow.member_count),
        parsedType: typeof parseInt(firstRow.member_count)
      });
    }
    
    // Test 3: Simulate the frontend calculation
    console.log('\n3. Simulating frontend totalMembers calculation...');
    
    const mockCurrentData = provinceResult.rows.map(row => ({
      name: row.province_name,
      value: row.member_count, // This is what gets summed
      code: row.province_code
    }));
    
    console.log('Mock current data (first 3 items):');
    mockCurrentData.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}: ${item.value} (type: ${typeof item.value})`);
    });
    
    // Test the problematic calculation
    const totalMembersWrong = mockCurrentData.reduce((sum, item) => sum + item.value, 0);
    console.log('\nProblematic calculation (sum + item.value):');
    console.log('Result:', totalMembersWrong);
    console.log('Type:', typeof totalMembersWrong);
    console.log('Length:', totalMembersWrong.toString().length);
    
    // Test the correct calculation
    const totalMembersCorrect = mockCurrentData.reduce((sum, item) => sum + parseInt(item.value), 0);
    console.log('\nCorrect calculation (sum + parseInt(item.value)):');
    console.log('Result:', totalMembersCorrect);
    console.log('Type:', typeof totalMembersCorrect);
    
    // Test 4: Check if PostgreSQL is returning strings instead of numbers
    console.log('\n4. Testing PostgreSQL data type behavior...');
    
    const typeTestQuery = `
      SELECT 
        COUNT(DISTINCT m.member_id) as count_result,
        COALESCE(COUNT(DISTINCT m.member_id), 0) as coalesce_result,
        pg_typeof(COUNT(DISTINCT m.member_id)) as count_type,
        pg_typeof(COALESCE(COUNT(DISTINCT m.member_id), 0)) as coalesce_type
      FROM vw_member_details m
      LIMIT 1
    `;
    
    const typeResult = await pool.query(typeTestQuery);
    console.log('PostgreSQL type test:', typeResult.rows[0]);
    
    // Test 5: Check the actual member count
    console.log('\n5. Checking actual total member count...');
    
    const totalQuery = `SELECT COUNT(DISTINCT member_id) as total FROM vw_member_details`;
    const totalResult = await pool.query(totalQuery);
    console.log('Actual total members:', totalResult.rows[0].total);
    console.log('Type:', typeof totalResult.rows[0].total);
    
    console.log('\n🎯 ANALYSIS COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log('- If member_count values are strings, they will concatenate instead of add');
    console.log('- This would explain the long number: "01005437850646910100041284687000"');
    console.log('- The fix is to ensure numeric conversion in the frontend calculation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testGeographicDataTypes();
