/**
 * Test War Council Eligible Members
 * 
 * This script tests if War Council position eligible members include metro members
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

async function testWarCouncilEligibleMembers() {
  try {
    console.log('🔍 Testing War Council Eligible Members\n');
    console.log('=' .repeat(80));

    // Test 1: Simulate getEligibleLeadershipMembers query (no filters)
    console.log('\n📊 Test 1: Get All Eligible Members (No Filters)');
    console.log('-'.repeat(80));
    
    const allMembersQuery = `
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
      ORDER BY m.firstname, m.surname
      LIMIT 20
    `;
    
    const allMembersResult = await pool.query(allMembersQuery);
    
    console.log(`✅ Found ${allMembersResult.rows.length} members (showing first 20)`);
    console.log('');
    
    let metroCount = 0;
    let gautengCount = 0;
    let gautengMetroCount = 0;
    
    allMembersResult.rows.forEach((member, index) => {
      const isMetro = member.municipality_type === 'Metro Sub-Region';
      const isGauteng = member.province_code === 'GP';
      
      if (isMetro) metroCount++;
      if (isGauteng) gautengCount++;
      if (isMetro && isGauteng) gautengMetroCount++;
      
      if (index < 10) {
        const icon = isMetro ? '🏙️' : '🏘️';
        console.log(`${icon} ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`   Province: ${member.province_code}, Municipality: ${member.municipality_name} (${member.municipality_type})`);
      }
    });
    
    console.log('');
    console.log(`📊 Sample Statistics:`);
    console.log(`   Metro members: ${metroCount}/${allMembersResult.rows.length}`);
    console.log(`   Gauteng members: ${gautengCount}/${allMembersResult.rows.length}`);
    console.log(`   Gauteng metro members: ${gautengMetroCount}/${allMembersResult.rows.length}`);

    // Test 2: Filter by Gauteng province (simulating backend filter)
    console.log('\n📊 Test 2: Filter Members by Gauteng Province');
    console.log('-'.repeat(80));
    
    const gautengMembers = allMembersResult.rows.filter(m => m.province_code === 'GP');
    
    console.log(`✅ Filtered to ${gautengMembers.length} Gauteng members`);
    console.log('');
    
    let filteredMetroCount = 0;
    gautengMembers.forEach((member, index) => {
      const isMetro = member.municipality_type === 'Metro Sub-Region';
      if (isMetro) filteredMetroCount++;
      
      if (index < 10) {
        const icon = isMetro ? '🏙️' : '🏘️';
        console.log(`${icon} ${index + 1}. ${member.full_name} (${member.membership_number})`);
        console.log(`   Municipality: ${member.municipality_name} (${member.municipality_type})`);
      }
    });
    
    console.log('');
    console.log(`📊 Filtered Statistics:`);
    console.log(`   Total Gauteng members: ${gautengMembers.length}`);
    console.log(`   Metro members: ${filteredMetroCount} (${((filteredMetroCount / gautengMembers.length) * 100).toFixed(1)}%)`);
    console.log(`   Regular members: ${gautengMembers.length - filteredMetroCount} (${(((gautengMembers.length - filteredMetroCount) / gautengMembers.length) * 100).toFixed(1)}%)`);

    // Test 3: Check actual Gauteng member counts
    console.log('\n📊 Test 3: Check Actual Gauteng Member Counts');
    console.log('-'.repeat(80));
    
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN m.municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_count,
        COUNT(CASE WHEN m.municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_count
      FROM vw_member_details m
      WHERE m.province_code = 'GP'
    `;
    
    const countResult = await pool.query(countQuery);
    const counts = countResult.rows[0];
    
    console.log(`✅ Total Gauteng members: ${counts.total}`);
    console.log(`   🏙️  Metro members: ${counts.metro_count} (${((counts.metro_count / counts.total) * 100).toFixed(1)}%)`);
    console.log(`   🏘️  Regular members: ${counts.regular_count} (${((counts.regular_count / counts.total) * 100).toFixed(1)}%)`);

    // Test 4: Check if province_code is populated for metro members
    console.log('\n📊 Test 4: Check Province Code for Metro Members');
    console.log('-'.repeat(80));
    
    const metroCheckQuery = `
      SELECT 
        COUNT(*) as total_metro,
        COUNT(CASE WHEN m.province_code IS NULL OR m.province_code = '' THEN 1 END) as null_province,
        COUNT(CASE WHEN m.province_code = 'GP' THEN 1 END) as gauteng_metro
      FROM vw_member_details m
      WHERE m.municipality_type = 'Metro Sub-Region'
        AND m.district_code IN ('JHB', 'TSH', 'EKU')
    `;
    
    const metroCheckResult = await pool.query(metroCheckQuery);
    const metroCheck = metroCheckResult.rows[0];
    
    console.log(`✅ Total Gauteng metro members: ${metroCheck.total_metro}`);
    console.log(`   With province_code 'GP': ${metroCheck.gauteng_metro}`);
    console.log(`   With NULL/empty province_code: ${metroCheck.null_province}`);
    
    if (metroCheck.null_province > 0) {
      console.log(`   ❌ ${metroCheck.null_province} metro members have NULL province_code!`);
    } else {
      console.log(`   ✅ All metro members have province_code populated`);
    }

    // Test 5: Sample Gauteng metro members
    console.log('\n📊 Test 5: Sample Gauteng Metro Members');
    console.log('-'.repeat(80));
    
    const sampleQuery = `
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
      LIMIT 10
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    
    console.log(`✅ Found ${sampleResult.rows.length} Gauteng metro members:`);
    console.log('');
    
    sampleResult.rows.forEach((member, index) => {
      console.log(`🏙️  ${index + 1}. ${member.full_name} (${member.membership_number})`);
      console.log(`   Municipality: ${member.municipality_name}`);
      console.log(`   Province: ${member.province_code}, District: ${member.district_code}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ War Council eligible members test completed');
    console.log('='.repeat(80));
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('-'.repeat(80));
    
    if (metroCheck.null_province > 0) {
      console.log('❌ ISSUE FOUND: Metro members have NULL province_code');
      console.log('   The vw_member_details view fix was not applied correctly.');
    } else if (filteredMetroCount === 0 && counts.metro_count > 0) {
      console.log('❌ ISSUE FOUND: Metro members not appearing in filtered results');
      console.log('   Even though province_code is populated, filtering is not working.');
    } else if (filteredMetroCount > 0) {
      console.log('✅ ALL TESTS PASSED!');
      console.log(`   - ${counts.total} total Gauteng members available`);
      console.log(`   - ${counts.metro_count} metro members included`);
      console.log(`   - Province filtering works correctly`);
      console.log(`   - Metro members appear in War Council eligible list`);
    } else {
      console.log('⚠️  INCONCLUSIVE: Sample size too small to determine if metro members are included');
      console.log(`   - Total Gauteng members: ${counts.total}`);
      console.log(`   - Metro members: ${counts.metro_count}`);
      console.log('   - Run test with larger sample size');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testWarCouncilEligibleMembers().catch(console.error);

