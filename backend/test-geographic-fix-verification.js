/**
 * Test to verify the geographic distribution fix
 */

const { Pool } = require('pg');

async function testGeographicFix() {
  console.log('🔧 Testing geographic distribution fix...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Get the same data that the frontend would receive
    console.log('\n1. Fetching province data (simulating API response)...');
    
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
    
    const result = await pool.query(provinceQuery);
    console.log('Raw database results:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.province_name}: "${row.member_count}" (type: ${typeof row.member_count})`);
    });
    
    // Simulate the OLD frontend calculation (problematic)
    console.log('\n2. Simulating OLD frontend calculation (problematic)...');
    
    const oldCurrentData = result.rows.map(row => ({
      name: row.province_name,
      value: row.member_count, // String value - causes concatenation
      code: row.province_code
    }));
    
    const oldTotalMembers = oldCurrentData.reduce((sum, item) => sum + item.value, 0);
    console.log('OLD calculation result:', oldTotalMembers);
    console.log('OLD result type:', typeof oldTotalMembers);
    console.log('OLD result length:', oldTotalMembers.toString().length);
    
    // Simulate the NEW frontend calculation (fixed)
    console.log('\n3. Simulating NEW frontend calculation (fixed)...');
    
    const newCurrentData = result.rows.map(row => ({
      name: row.province_name,
      value: parseInt(row.member_count, 10) || 0, // Numeric conversion
      code: row.province_code
    }));
    
    const newTotalMembers = newCurrentData.reduce((sum, item) => {
      const numericValue = typeof item.value === 'string' ? parseInt(item.value, 10) : item.value;
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);
    
    console.log('NEW calculation result:', newTotalMembers);
    console.log('NEW result type:', typeof newTotalMembers);
    console.log('NEW result formatted:', newTotalMembers.toLocaleString());
    
    // Verify against actual total
    console.log('\n4. Verification against actual total...');
    
    const totalQuery = `SELECT COUNT(DISTINCT member_id) as total FROM vw_member_details`;
    const totalResult = await pool.query(totalQuery);
    const actualTotal = parseInt(totalResult.rows[0].total, 10);
    
    console.log('Actual database total:', actualTotal);
    console.log('NEW calculation matches:', newTotalMembers === actualTotal ? '✅ YES' : '❌ NO');
    
    // Test individual province data
    console.log('\n5. Testing individual province data conversion...');
    
    newCurrentData.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}:`);
      console.log(`     Value: ${item.value} (type: ${typeof item.value})`);
      console.log(`     Is number: ${typeof item.value === 'number' ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 FIX VERIFICATION COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log(`- OLD (broken): "${oldTotalMembers}" (${typeof oldTotalMembers})`);
    console.log(`- NEW (fixed): ${newTotalMembers} (${typeof newTotalMembers})`);
    console.log(`- Actual total: ${actualTotal}`);
    console.log(`- Fix works: ${newTotalMembers === actualTotal ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testGeographicFix();
