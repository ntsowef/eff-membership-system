/**
 * Test membership expiration data types to identify string concatenation issues
 */

const { Pool } = require('pg');

async function testMembershipExpirationDataTypes() {
  console.log('🔍 Testing membership expiration data types...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check expired members statistics query
    console.log('\n1. Testing expired members statistics query...');
    
    const expiredStatsQuery = `
      SELECT
        COUNT(DISTINCT m.member_id) as total_members,
        COUNT(DISTINCT CASE WHEN m.membership_status = 'Expired' THEN m.member_id END) as total_expired,
        COUNT(DISTINCT CASE WHEN m.membership_status = 'Expiring Soon' THEN m.member_id END) as total_expiring_soon,
        COUNT(DISTINCT CASE WHEN m.membership_status = 'Urgent' THEN m.member_id END) as total_expiring_urgent
      FROM vw_member_details m
    `;
    
    const result = await pool.query(expiredStatsQuery);
    const stats = result.rows[0];
    
    console.log('Raw database results:');
    console.log(`  total_members: "${stats.total_members}" (type: ${typeof stats.total_members})`);
    console.log(`  total_expired: "${stats.total_expired}" (type: ${typeof stats.total_expired})`);
    console.log(`  total_expiring_soon: "${stats.total_expiring_soon}" (type: ${typeof stats.total_expiring_soon})`);
    console.log(`  total_expiring_urgent: "${stats.total_expiring_urgent}" (type: ${typeof stats.total_expiring_urgent})`);
    
    // Test 2: Simulate the problematic frontend calculation
    console.log('\n2. Simulating problematic frontend calculation...');
    
    // This is what happens in ExpiredMembersSection.tsx line 214:
    // (national_summary.total_members - national_summary.total_expired - national_summary.total_expiring_soon)
    
    const activeMembers_BROKEN = stats.total_members - stats.total_expired - stats.total_expiring_soon;
    console.log('BROKEN calculation (string subtraction):');
    console.log(`  Result: "${activeMembers_BROKEN}"`);
    console.log(`  Type: ${typeof activeMembers_BROKEN}`);
    console.log(`  Length: ${activeMembers_BROKEN.toString().length}`);
    
    // Test 3: Simulate the correct calculation
    console.log('\n3. Simulating correct calculation...');
    
    const totalMembers = parseInt(stats.total_members, 10) || 0;
    const totalExpired = parseInt(stats.total_expired, 10) || 0;
    const totalExpiringSoon = parseInt(stats.total_expiring_soon, 10) || 0;
    
    const activeMembers_FIXED = totalMembers - totalExpired - totalExpiringSoon;
    console.log('FIXED calculation (numeric subtraction):');
    console.log(`  total_members: ${totalMembers}`);
    console.log(`  total_expired: ${totalExpired}`);
    console.log(`  total_expiring_soon: ${totalExpiringSoon}`);
    console.log(`  active_members: ${activeMembers_FIXED}`);
    console.log(`  Type: ${typeof activeMembers_FIXED}`);
    
    // Test 4: Check percentage calculations
    console.log('\n4. Testing percentage calculations...');
    
    const expiredPercentage_BROKEN = totalMembers > 0 ? (stats.total_expired / stats.total_members) * 100 : 0;
    const expiredPercentage_FIXED = totalMembers > 0 ? (totalExpired / totalMembers) * 100 : 0;
    
    console.log('Percentage calculations:');
    console.log(`  BROKEN: ${expiredPercentage_BROKEN}% (${typeof expiredPercentage_BROKEN})`);
    console.log(`  FIXED: ${expiredPercentage_FIXED}% (${typeof expiredPercentage_FIXED})`);
    
    // Test 5: Test province breakdown calculations
    console.log('\n5. Testing province breakdown calculations...');
    
    const provinceQuery = `
      SELECT
        p.province_code,
        p.province_name,
        COUNT(DISTINCT m.member_id) as total_members,
        COUNT(DISTINCT CASE WHEN m.membership_status = 'Expired' THEN m.member_id END) as expired_count,
        COUNT(DISTINCT CASE WHEN m.membership_status = 'Expiring Soon' THEN m.member_id END) as expiring_soon_count
      FROM provinces p
      LEFT JOIN vw_member_details m ON p.province_code = m.province_code
      GROUP BY p.province_code, p.province_name
      ORDER BY total_members DESC
      LIMIT 3
    `;
    
    const provinceResult = await pool.query(provinceQuery);
    console.log('Province breakdown (first 3):');
    provinceResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.province_name}:`);
      console.log(`     total_members: "${row.total_members}" (${typeof row.total_members})`);
      console.log(`     expired_count: "${row.expired_count}" (${typeof row.expired_count})`);
      console.log(`     expiring_soon_count: "${row.expiring_soon_count}" (${typeof row.expiring_soon_count})`);
      
      // Test the problematic calculation that happens in the frontend
      const totalAtRisk_BROKEN = row.expired_count + row.expiring_soon_count;
      const totalAtRisk_FIXED = parseInt(row.expired_count, 10) + parseInt(row.expiring_soon_count, 10);
      
      console.log(`     totalAtRisk BROKEN: "${totalAtRisk_BROKEN}" (${typeof totalAtRisk_BROKEN})`);
      console.log(`     totalAtRisk FIXED: ${totalAtRisk_FIXED} (${typeof totalAtRisk_FIXED})`);
    });
    
    console.log('\n🎯 ANALYSIS COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log('- PostgreSQL returns COUNT() results as strings');
    console.log('- Frontend arithmetic operations cause string concatenation');
    console.log('- This explains the huge numbers like "1,005,437,850,646,900,600,000,000,000,000"');
    console.log('- Fix: Convert all numeric values using parseInt() before calculations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testMembershipExpirationDataTypes();
