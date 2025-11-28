const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function testGrowthQuery() {
  console.log('🔍 Testing Growth Query Fix');
  console.log('===========================\n');
  
  try {
    // Test the fixed PostgreSQL growth query
    console.log('1️⃣ Testing fixed PostgreSQL growth query...\n');
    
    const growthQuery = `
      SELECT 
        COUNT(CASE WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as members_this_month,
        COUNT(CASE WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month') AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month') THEN 1 END) as members_last_month
      FROM members
    `;
    
    const result = await pool.query(growthQuery);
    console.log('✅ Growth query successful:');
    console.log(`   Members this month: ${result.rows[0].members_this_month}`);
    console.log(`   Members last month: ${result.rows[0].members_last_month}`);
    
    // Test the complete system statistics query
    console.log('\n2️⃣ Testing complete system statistics...\n');
    
    // Totals query
    const totalsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM members) as members,
        (SELECT COUNT(*) FROM memberships) as memberships,
        (SELECT COUNT(*) FROM memberships ms JOIN membership_statuses mst ON ms.status_id = mst.status_id WHERE mst.is_active = TRUE) as active_memberships,
        (SELECT COUNT(*) FROM provinces) as provinces,
        (SELECT COUNT(*) FROM districts) as districts,
        (SELECT COUNT(*) FROM municipalities) as municipalities,
        (SELECT COUNT(*) FROM wards) as wards,
        (SELECT COUNT(*) FROM voting_stations WHERE is_active = TRUE) as voting_stations
    `;
    
    const totalsResult = await pool.query(totalsQuery);
    console.log('✅ Totals query successful:');
    console.log(`   Members: ${totalsResult.rows[0].members}`);
    console.log(`   Memberships: ${totalsResult.rows[0].memberships}`);
    console.log(`   Active memberships: ${totalsResult.rows[0].active_memberships}`);
    
    // Top wards query
    const topWardsQuery = `
      SELECT 
        w.ward_code,
        w.ward_name,
        m.municipality_name,
        COUNT(mem.member_id) as member_count
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN members mem ON w.ward_code = mem.ward_code
      GROUP BY w.ward_code, w.ward_name, m.municipality_name
      HAVING COUNT(mem.member_id) > 0
      ORDER BY member_count DESC
      LIMIT 10
    `;
    
    const topWardsResult = await pool.query(topWardsQuery);
    console.log(`✅ Top wards query successful: Found ${topWardsResult.rows.length} wards`);
    
    // Calculate growth rate
    const growth = result.rows[0];
    const growthRate = growth.members_last_month > 0 
      ? Math.round(((growth.members_this_month - growth.members_last_month) / growth.members_last_month) * 100)
      : 0;
    
    console.log('\n3️⃣ Complete system statistics result:\n');
    
    const systemStats = {
      totals: totalsResult.rows[0],
      growth: {
        members_this_month: growth.members_this_month,
        members_last_month: growth.members_last_month,
        growth_rate: growthRate
      },
      top_wards: topWardsResult.rows
    };
    
    console.log('📊 SYSTEM STATISTICS:');
    console.log('=====================');
    console.log('Totals:', JSON.stringify(systemStats.totals, null, 2));
    console.log('Growth:', JSON.stringify(systemStats.growth, null, 2));
    console.log(`Top Wards: ${systemStats.top_wards.length} wards found`);
    
    console.log('\n🎉 ALL QUERIES SUCCESSFUL!');
    console.log('==========================');
    console.log('✅ PostgreSQL growth query working');
    console.log('✅ System statistics complete');
    console.log('✅ Ready for statistics endpoint');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testGrowthQuery()
    .then(() => {
      console.log('\n✅ Growth query testing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Growth query testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGrowthQuery };
