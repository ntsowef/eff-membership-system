/**
 * Test script to verify voting districts for a specific ward
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function testVotingDistricts() {
  const wardCode = '19100100';
  
  try {
    console.log(`🔍 Testing voting districts for ward: ${wardCode}\n`);
    
    // Test 1: Check if ward exists
    console.log('Test 1: Checking if ward exists...');
    const wardQuery = `
      SELECT w.ward_code, w.ward_name, m.municipality_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.ward_code = $1
    `;
    const wardResult = await pool.query(wardQuery, [wardCode]);

    if (wardResult.rows.length === 0) {
      console.log('❌ Ward not found!');
      await pool.end();
      return;
    }

    console.log('✅ Ward found:', wardResult.rows[0].ward_name, '-', wardResult.rows[0].municipality_name);
    console.log('');
    
    // Test 2: Check voting_districts_with_members view
    console.log('Test 2: Checking voting_districts_with_members view...');
    const viewQuery = `
      SELECT
        voting_district_code,
        voting_district_name,
        voting_district_number,
        member_count
      FROM voting_districts_with_members
      WHERE ward_code = $1
      ORDER BY member_count DESC
    `;
    const viewResult = await pool.query(viewQuery, [wardCode]);
    console.log(`✅ Found ${viewResult.rows.length} voting districts in view`);
    
    if (viewResult.rows.length > 0) {
      console.log('\nTop 5 voting districts:');
      viewResult.rows.slice(0, 5).forEach((vd, index) => {
        console.log(`  ${index + 1}. ${vd.voting_district_name} (${vd.voting_district_code}): ${vd.member_count} members`);
      });
    }
    console.log('');
    
    // Test 3: Check special voting districts
    console.log('Test 3: Checking special voting districts...');
    const specialQuery = `
      SELECT
        voting_district_code,
        CASE
          WHEN voting_district_code = '33333333' THEN 'International Voter'
          WHEN voting_district_code = '99999999' THEN 'Not Registered Voter'
          WHEN voting_district_code = '22222222' THEN 'Registered in Different Ward'
          WHEN voting_district_code = '11111111' THEN 'Deceased'
          ELSE 'Unknown Special District'
        END as voting_district_name,
        COUNT(*) as member_count
      FROM members
      WHERE ward_code = $1
        AND voting_district_code IN ('33333333', '99999999', '22222222', '11111111')
      GROUP BY voting_district_code
      HAVING COUNT(*) > 0
      ORDER BY member_count DESC
    `;
    const specialResult = await pool.query(specialQuery, [wardCode]);
    console.log(`✅ Found ${specialResult.rows.length} special voting districts`);
    
    if (specialResult.rows.length > 0) {
      console.log('\nSpecial voting districts:');
      specialResult.rows.forEach((vd, index) => {
        console.log(`  ${index + 1}. ${vd.voting_district_name} (${vd.voting_district_code}): ${vd.member_count} members`);
      });
    }
    console.log('');
    
    // Test 4: Total members in ward
    console.log('Test 4: Checking total members in ward...');
    const totalQuery = 'SELECT COUNT(*) as total FROM members WHERE ward_code = $1';
    const totalResult = await pool.query(totalQuery, [wardCode]);
    console.log(`✅ Total members in ward: ${totalResult.rows[0].total}`);
    console.log('');
    
    // Test 5: Simulate the API endpoint query
    console.log('Test 5: Simulating API endpoint query...');
    const regularVotingDistrictsQuery = `
      SELECT
        vd.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_number,
        vd.member_count,
        'regular' as district_type
      FROM voting_districts_with_members vd
      WHERE vd.ward_code = $1
    `;
    
    const specialVotingDistrictsQuery = `
      SELECT
        m.voting_district_code,
        CASE
          WHEN m.voting_district_code = '33333333' THEN 'International Voter'
          WHEN m.voting_district_code = '99999999' THEN 'Not Registered Voter'
          WHEN m.voting_district_code = '22222222' THEN 'Registered in Different Ward'
          WHEN m.voting_district_code = '11111111' THEN 'Deceased'
          ELSE 'Unknown Special District'
        END as voting_district_name,
        NULL as voting_district_number,
        COUNT(*) as member_count,
        'special' as district_type
      FROM members m
      WHERE m.ward_code = $1
        AND m.voting_district_code IN ('33333333', '99999999', '22222222', '11111111')
      GROUP BY m.voting_district_code
      HAVING COUNT(*) > 0
    `;
    
    const [regularDistricts, specialDistricts] = await Promise.all([
      pool.query(regularVotingDistrictsQuery, [wardCode]),
      pool.query(specialVotingDistrictsQuery, [wardCode])
    ]);
    
    const allDistricts = [...regularDistricts.rows, ...specialDistricts.rows];
    
    // Sort by member count descending
    allDistricts.sort((a, b) => {
      if (b.member_count !== a.member_count) {
        return b.member_count - a.member_count;
      }
      if (a.district_type === 'regular' && b.district_type === 'special') return -1;
      if (a.district_type === 'special' && b.district_type === 'regular') return 1;
      return 0;
    });
    
    console.log(`✅ API would return ${allDistricts.length} voting districts`);
    console.log('\nTop 10 results (as API would return):');
    allDistricts.slice(0, 10).forEach((vd, index) => {
      console.log(`  ${index + 1}. [${vd.district_type}] ${vd.voting_district_name} (${vd.voting_district_code}): ${vd.member_count} members`);
    });
    
    console.log('\n🎉 All tests passed! The voting districts data is available.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the tests
testVotingDistricts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

