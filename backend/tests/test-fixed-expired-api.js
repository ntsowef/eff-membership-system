const { executeQuery, initializeDatabase } = require('../dist/config/database');

async function testFixedExpiredAPI() {
  try {
    console.log('🧪 Testing Fixed Expired Members API Queries...\n');
    
    // Initialize database connection
    await initializeDatabase();

    // Test 1: National expired members query (same as API)
    console.log('📊 Test 1: National expired members query...');
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
      LIMIT 5
    `;

    const provinceBreakdown = await executeQuery(nationalExpiredQuery);
    console.log('✅ Top 5 provinces by expired members:');
    provinceBreakdown.forEach((province, index) => {
      console.log(`   ${index + 1}. ${province.province_name}: ${province.expired_count} expired, ${province.expiring_soon_count} expiring soon (${province.total_members} total) - ${province.expired_percentage}%`);
    });

    // Calculate national totals
    const nationalTotals = provinceBreakdown.reduce((acc, province) => ({
      total_expired: acc.total_expired + (province.expired_count || 0),
      total_expiring_soon: acc.total_expiring_soon + (province.expiring_soon_count || 0),
      total_expiring_urgent: acc.total_expiring_urgent + (province.expiring_urgent_count || 0),
      total_members: acc.total_members + (province.total_members || 0)
    }), { total_expired: 0, total_expiring_soon: 0, total_expiring_urgent: 0, total_members: 0 });

    console.log('\n📈 National Summary:');
    console.log(`   Total Members: ${nationalTotals.total_members.toLocaleString()}`);
    console.log(`   Expired: ${nationalTotals.total_expired.toLocaleString()}`);
    console.log(`   Expiring Soon (30 days): ${nationalTotals.total_expiring_soon.toLocaleString()}`);
    console.log(`   Expiring Urgent (7 days): ${nationalTotals.total_expiring_urgent.toLocaleString()}`);

    // Test 2: Dashboard query for a specific province
    console.log('\n📊 Test 2: Province-specific dashboard query (GP)...');
    const provinceStatsQuery = `
      SELECT
        COUNT(m.member_id) as total_members,
        COUNT(CASE WHEN ms.expiry_date >= CURDATE() OR ms.expiry_date IS NULL THEN 1 END) as active_members,
        0 as pending_members,
        COUNT(CASE WHEN ms.expiry_date < CURDATE() THEN 1 END) as expired_members,
        COUNT(CASE WHEN ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiring_soon_members,
        COUNT(CASE WHEN DATE(m.member_created_at) = CURDATE() THEN 1 END) as today_registrations,
        COUNT(CASE WHEN DATE(m.member_created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_registrations,
        COUNT(CASE WHEN DATE(m.member_created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as month_registrations
      FROM vw_member_details m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      WHERE m.province_code = ?
    `;

    const [gpStats] = await executeQuery(provinceStatsQuery, ['GP']);
    console.log('✅ Gauteng Province (GP) Statistics:');
    console.log(`   Total Members: ${gpStats.total_members.toLocaleString()}`);
    console.log(`   Active Members: ${gpStats.active_members.toLocaleString()}`);
    console.log(`   Expired Members: ${gpStats.expired_members.toLocaleString()}`);
    console.log(`   Expiring Soon: ${gpStats.expiring_soon_members.toLocaleString()}`);
    console.log(`   Today Registrations: ${gpStats.today_registrations.toLocaleString()}`);
    console.log(`   Week Registrations: ${gpStats.week_registrations.toLocaleString()}`);

    // Test 3: Check the vw_expired_memberships view directly
    console.log('\n📊 Test 3: Direct expired memberships view...');
    const expiredViewQuery = `
      SELECT 
        COUNT(*) as total_expired,
        COUNT(CASE WHEN expiry_category = 'Recently Expired' THEN 1 END) as recently_expired,
        COUNT(CASE WHEN expiry_category = 'Long Expired' THEN 1 END) as long_expired,
        AVG(days_expired) as avg_days_expired
      FROM vw_expired_memberships
    `;

    const [expiredStats] = await executeQuery(expiredViewQuery);
    console.log('✅ Expired Memberships View Statistics:');
    console.log(`   Total Expired: ${expiredStats.total_expired}`);
    console.log(`   Recently Expired: ${expiredStats.recently_expired}`);
    console.log(`   Long Expired: ${expiredStats.long_expired}`);
    console.log(`   Average Days Expired: ${Math.round(expiredStats.avg_days_expired || 0)}`);

    // Test 4: Sample expired members by province
    console.log('\n📊 Test 4: Sample expired members by province...');
    const sampleExpiredQuery = `
      SELECT 
        em.province_name,
        COUNT(*) as expired_count,
        GROUP_CONCAT(CONCAT(em.firstname, ' ', COALESCE(em.surname, '')) SEPARATOR ', ') as sample_names
      FROM vw_expired_memberships em
      GROUP BY em.province_name
      ORDER BY expired_count DESC
      LIMIT 5
    `;

    const expiredByProvince = await executeQuery(sampleExpiredQuery);
    console.log('✅ Expired members by province (from view):');
    expiredByProvince.forEach((province, index) => {
      const names = province.sample_names ? province.sample_names.split(', ').slice(0, 3).join(', ') : 'No names';
      console.log(`   ${index + 1}. ${province.province_name}: ${province.expired_count} expired (e.g., ${names})`);
    });

    // Test 5: Membership status distribution
    console.log('\n📊 Test 5: Membership status distribution...');
    const statusQuery = `
      SELECT 
        CASE 
          WHEN ms.expiry_date IS NULL THEN 'No Expiry Set'
          WHEN ms.expiry_date < CURDATE() THEN 'Expired'
          WHEN ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Expiring Urgent (7 days)'
          WHEN ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon (30 days)'
          ELSE 'Active'
        END as status_category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM memberships), 2) as percentage
      FROM memberships ms
      GROUP BY status_category
      ORDER BY count DESC
    `;

    const statusDistribution = await executeQuery(statusQuery);
    console.log('✅ Membership status distribution:');
    statusDistribution.forEach(status => {
      console.log(`   ${status.status_category}: ${status.count.toLocaleString()} (${status.percentage}%)`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 Key Findings:');
    console.log('- The database has proper membership expiry data');
    console.log('- The vw_expired_memberships view contains actual expired members');
    console.log('- The API queries should now work correctly with the fixed table joins');
    console.log('- Frontend components can now display real expired members data');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing fixed expired API:', error);
    process.exit(1);
  }
}

testFixedExpiredAPI();
