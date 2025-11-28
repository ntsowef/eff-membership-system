/**
 * Test expired members data types to identify string concatenation issues
 */

const { Pool } = require('pg');

async function testExpiredMembersDataTypes() {
  console.log('🔍 Testing expired members data types...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check the exact query used in the expired members endpoint
    console.log('\n1. Testing expired members statistics query (from /statistics/expired-members)...');
    
    // This is the exact query from the backend (lines 364-375)
    const nationalExpiredQuery = `
      SELECT
        p.province_code,
        p.province_name,
        COUNT(CASE WHEN ms.expiry_date < CURDATE() THEN 1 END) as expired_count,
        COUNT(CASE WHEN ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_count,
        COUNT(CASE WHEN ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as expiring_urgent_count,
        COUNT(m.member_id) as total_members,
        ROUND(COUNT(CASE WHEN ms.expiry_date < CURDATE() THEN 1 END) * 100.0 / NULLIF(COUNT(m.member_id), 0), 2) as expired_percentage
      FROM provinces p
      LEFT JOIN vw_member_details m ON p.province_code = m.province_code
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      GROUP BY p.province_code, p.province_name
      ORDER BY expired_count DESC
      LIMIT 3
    `;
    
    const result = await pool.query(nationalExpiredQuery);
    console.log('Raw database results (first 3 provinces):');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.province_name}:`);
      console.log(`     expired_count: "${row.expired_count}" (type: ${typeof row.expired_count})`);
      console.log(`     expiring_soon_count: "${row.expiring_soon_count}" (type: ${typeof row.expiring_soon_count})`);
      console.log(`     expiring_urgent_count: "${row.expiring_urgent_count}" (type: ${typeof row.expiring_urgent_count})`);
      console.log(`     total_members: "${row.total_members}" (type: ${typeof row.total_members})`);
    });
    
    // Test 2: Simulate the national summary calculation
    console.log('\n2. Simulating national summary calculation...');
    
    // Calculate totals (this is what the backend does)
    let totalExpired = 0;
    let totalExpiringSoon = 0;
    let totalExpiringUrgent = 0;
    let totalMembers = 0;
    
    result.rows.forEach(row => {
      totalExpired += row.expired_count;
      totalExpiringSoon += row.expiring_soon_count;
      totalExpiringUrgent += row.expiring_urgent_count;
      totalMembers += row.total_members;
    });
    
    console.log('National summary (BROKEN - string concatenation):');
    console.log(`  total_expired: "${totalExpired}" (type: ${typeof totalExpired})`);
    console.log(`  total_expiring_soon: "${totalExpiringSoon}" (type: ${typeof totalExpiringSoon})`);
    console.log(`  total_expiring_urgent: "${totalExpiringUrgent}" (type: ${typeof totalExpiringUrgent})`);
    console.log(`  total_members: "${totalMembers}" (type: ${typeof totalMembers})`);
    
    // Test 3: Simulate the problematic frontend calculation
    console.log('\n3. Simulating problematic frontend calculation...');
    
    // This is what happens in ExpiredMembersSection.tsx line 214:
    // (national_summary.total_members - national_summary.total_expired - national_summary.total_expiring_soon)
    
    const activeMembers_BROKEN = totalMembers - totalExpired - totalExpiringSoon;
    console.log('BROKEN calculation (string subtraction):');
    console.log(`  Result: "${activeMembers_BROKEN}"`);
    console.log(`  Type: ${typeof activeMembers_BROKEN}`);
    console.log(`  Length: ${activeMembers_BROKEN.toString().length}`);
    
    // Test 4: Simulate the correct calculation
    console.log('\n4. Simulating correct calculation...');
    
    let totalExpired_FIXED = 0;
    let totalExpiringSoon_FIXED = 0;
    let totalExpiringUrgent_FIXED = 0;
    let totalMembers_FIXED = 0;
    
    result.rows.forEach(row => {
      totalExpired_FIXED += parseInt(row.expired_count, 10) || 0;
      totalExpiringSoon_FIXED += parseInt(row.expiring_soon_count, 10) || 0;
      totalExpiringUrgent_FIXED += parseInt(row.expiring_urgent_count, 10) || 0;
      totalMembers_FIXED += parseInt(row.total_members, 10) || 0;
    });
    
    const activeMembers_FIXED = totalMembers_FIXED - totalExpired_FIXED - totalExpiringSoon_FIXED;
    console.log('FIXED calculation (numeric subtraction):');
    console.log(`  total_members: ${totalMembers_FIXED}`);
    console.log(`  total_expired: ${totalExpired_FIXED}`);
    console.log(`  total_expiring_soon: ${totalExpiringSoon_FIXED}`);
    console.log(`  active_members: ${activeMembers_FIXED}`);
    console.log(`  Type: ${typeof activeMembers_FIXED}`);
    
    // Test 5: Test the province breakdown calculation (line 237-240)
    console.log('\n5. Testing province breakdown calculation...');
    
    const firstProvince = result.rows[0];
    if (firstProvince) {
      console.log(`Testing ${firstProvince.province_name}:`);
      
      // This is the calculation from line 240: (b.expired_count + b.expiring_soon_count)
      const totalAtRisk_BROKEN = firstProvince.expired_count + firstProvince.expiring_soon_count;
      const totalAtRisk_FIXED = parseInt(firstProvince.expired_count, 10) + parseInt(firstProvince.expiring_soon_count, 10);
      
      console.log(`  totalAtRisk BROKEN: "${totalAtRisk_BROKEN}" (${typeof totalAtRisk_BROKEN})`);
      console.log(`  totalAtRisk FIXED: ${totalAtRisk_FIXED} (${typeof totalAtRisk_FIXED})`);
      
      // Test percentage calculation (line 241-243)
      const riskPercentage_BROKEN = firstProvince.total_members > 0 
        ? (totalAtRisk_BROKEN / firstProvince.total_members) * 100 
        : 0;
      const riskPercentage_FIXED = parseInt(firstProvince.total_members, 10) > 0 
        ? (totalAtRisk_FIXED / parseInt(firstProvince.total_members, 10)) * 100 
        : 0;
        
      console.log(`  riskPercentage BROKEN: ${riskPercentage_BROKEN}% (${typeof riskPercentage_BROKEN})`);
      console.log(`  riskPercentage FIXED: ${riskPercentage_FIXED}% (${typeof riskPercentage_FIXED})`);
    }
    
    console.log('\n🎯 ANALYSIS COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log('- PostgreSQL COUNT() returns strings, not numbers');
    console.log('- Frontend arithmetic operations cause string concatenation');
    console.log('- This explains numbers like "1,005,437,850,646,900,600,000,000,000,000"');
    console.log('- Fix: Convert all numeric values using parseInt() before calculations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testExpiredMembersDataTypes();
