/**
 * Test Leadership Province Filter
 * 
 * This script tests if leadership assignment search properly includes metro members
 * when filtering by province
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function testLeadershipProvinceFilter() {
  try {
    console.log('🔍 Testing Leadership Province Filter\n');
    console.log('=' .repeat(80));

    // Test 1: Get Gauteng province ID
    console.log('\n📊 Test 1: Get Gauteng Province ID');
    console.log('-'.repeat(80));

    const provinceQuery = `
      SELECT province_id, province_code, province_name
      FROM provinces
      WHERE province_code = 'GP'
    `;

    const provinceResult = await pool.query(provinceQuery);

    if (provinceResult.rows.length === 0) {
      console.log('❌ Gauteng province not found');
      return;
    }

    const province = provinceResult.rows[0];
    console.log(`✅ Found province: ${province.province_name} (${province.province_code})`);
    console.log(`   Province ID: ${province.province_id}`);

    // Test 2: Check vw_member_details for Gauteng members
    console.log('\n📊 Test 2: Check vw_member_details for Gauteng members');
    console.log('-'.repeat(80));
    
    const viewQuery = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_members,
        COUNT(CASE WHEN municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_members
      FROM vw_member_details
      WHERE province_code = 'GP'
    `;
    
    const viewResult = await pool.query(viewQuery);
    const viewStats = viewResult.rows[0];
    
    console.log(`✅ Total members in vw_member_details: ${viewStats.total_members}`);
    console.log(`   🏙️  Metro members: ${viewStats.metro_members}`);
    console.log(`   🏘️  Regular members: ${viewStats.regular_members}`);

    // Test 3: Test the actual leadership query (simulating getEligibleLeadershipMembers)
    console.log('\n📊 Test 3: Test Leadership Query (Province Filter)');
    console.log('-'.repeat(80));
    
    const leadershipQuery = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname as first_name,
        COALESCE(m.surname, '') as last_name,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        COALESCE(m.province_code, '') as province_code,
        COALESCE(m.province_name, 'Unknown') as province_name,
        COALESCE(m.district_code, '') as district_code,
        COALESCE(m.municipality_name, 'Unknown') as municipality_name,
        COALESCE(m.municipality_type, '') as municipality_type
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
        AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = $1)
      ORDER BY m.firstname, m.surname
      LIMIT 10
    `;

    const leadershipResult = await pool.query(leadershipQuery, [province.province_id]);
    
    console.log(`✅ Found ${leadershipResult.rows.length} members (showing first 10)`);
    console.log('');
    
    leadershipResult.rows.forEach((member, index) => {
      const isMetro = member.municipality_type === 'Metro Sub-Region' ? '🏙️' : '🏘️';
      console.log(`${isMetro} ${index + 1}. ${member.full_name} (${member.membership_number})`);
      console.log(`   Municipality: ${member.municipality_name} (${member.municipality_type})`);
      console.log(`   District: ${member.district_code}`);
    });

    // Test 4: Count total members with province filter
    console.log('\n📊 Test 4: Count Total Members with Province Filter');
    console.log('-'.repeat(80));
    
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN m.municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_count,
        COUNT(CASE WHEN m.municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_count
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
        AND m.province_code = (SELECT province_code FROM provinces WHERE province_id = $1)
    `;

    const countResult = await pool.query(countQuery, [province.province_id]);
    const counts = countResult.rows[0];
    
    console.log(`✅ Total members: ${counts.total}`);
    console.log(`   🏙️  Metro members: ${counts.metro_count} (${((counts.metro_count / counts.total) * 100).toFixed(1)}%)`);
    console.log(`   🏘️  Regular members: ${counts.regular_count} (${((counts.regular_count / counts.total) * 100).toFixed(1)}%)`);

    // Test 5: Check if any metro members have NULL province_code
    console.log('\n📊 Test 5: Check for NULL province_code in Metro Members');
    console.log('-'.repeat(80));
    
    const nullCheckQuery = `
      SELECT COUNT(*) as null_count
      FROM vw_member_details m
      WHERE m.municipality_type = 'Metro Sub-Region'
        AND (m.province_code IS NULL OR m.province_code = '')
    `;
    
    const nullCheckResult = await pool.query(nullCheckQuery);
    const nullCount = nullCheckResult.rows[0].null_count;
    
    if (nullCount > 0) {
      console.log(`❌ Found ${nullCount} metro members with NULL province_code`);
      console.log('   This is the problem! Metro members are missing province codes.');
    } else {
      console.log('✅ All metro members have province_code populated');
    }

    // Test 6: Sample metro members
    console.log('\n📊 Test 6: Sample Metro Members from Gauteng');
    console.log('-'.repeat(80));
    
    const metroSampleQuery = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.province_code,
        m.district_code,
        m.municipality_name,
        m.municipality_type
      FROM vw_member_details m
      WHERE m.municipality_type = 'Metro Sub-Region'
        AND m.province_code = 'GP'
      LIMIT 5
    `;
    
    const metroSampleResult = await pool.query(metroSampleQuery);
    
    console.log(`✅ Found ${metroSampleResult.rows.length} metro members:`);
    console.log('');
    
    metroSampleResult.rows.forEach((member, index) => {
      console.log(`🏙️  ${index + 1}. ${member.full_name} (${member.membership_number})`);
      console.log(`   Municipality: ${member.municipality_name}`);
      console.log(`   Province: ${member.province_code}, District: ${member.district_code}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Leadership province filter test completed');
    console.log('='.repeat(80));
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('-'.repeat(80));
    if (nullCount > 0) {
      console.log('❌ ISSUE FOUND: Metro members have NULL province_code in vw_member_details');
      console.log('   This means the view fix was not applied correctly.');
      console.log('   Run: node backend/apply-metro-fix.js');
    } else if (counts.metro_count === 0) {
      console.log('❌ ISSUE FOUND: No metro members returned with province filter');
      console.log('   Even though province_code is populated, the query is not returning metro members.');
    } else {
      console.log('✅ ALL TESTS PASSED!');
      console.log(`   - ${counts.total} total members available for leadership in Gauteng`);
      console.log(`   - ${counts.metro_count} metro members included`);
      console.log(`   - Province filtering works correctly`);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testLeadershipProvinceFilter().catch(console.error);

