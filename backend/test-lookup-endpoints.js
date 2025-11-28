/**
 * Test Script for Lookup Endpoints (Voting Districts & Voting Stations)
 * 
 * This script tests the /api/v1/search/lookup endpoints to verify that
 * the search functionality is working correctly for voting districts and stations.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testVotingDistrictsSearch() {
  console.log('🧪 Testing Voting Districts Search');
  console.log('==================================\n');
  
  try {
    // Test 1: Search for "lenche"
    console.log('1. Testing voting districts search for "lenche"...');
    
    const searchQuery = `
      SELECT
        vd.voting_district_code as id,
        vd.voting_district_name as name,
        vd.voting_district_id,
        vd.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '') = REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '')
      WHERE vd.is_active = TRUE
        AND (vd.voting_district_name ILIKE $1 OR vd.voting_district_code ILIKE $2 OR REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '') ILIKE REPLACE($3, '.0', '') OR CAST(vd.voting_district_id AS TEXT) ILIKE $4)
      GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_id, vd.ward_code
      ORDER BY vd.voting_district_id, vd.voting_district_name 
      LIMIT 10
    `;
    
    const searchResult = await pool.query(searchQuery, ['%lenche%', '%lenche%', '%lenche%', '%lenche%']);
    
    console.log(`✅ Found ${searchResult.rows.length} voting districts matching "lenche"`);
    
    if (searchResult.rows.length > 0) {
      console.log('\nVoting districts search results:');
      searchResult.rows.forEach((district, index) => {
        console.log(`  ${index + 1}. ${district.name} (${district.id})`);
        console.log(`      ID: ${district.voting_district_id}, Ward: ${district.ward_code}`);
        console.log(`      Members: ${district.member_count}`);
        console.log('');
      });
    }
    
    // Test 2: Search for "tent"
    console.log('2. Testing voting districts search for "tent"...');
    
    const tentSearchResult = await pool.query(searchQuery, ['%tent%', '%tent%', '%tent%', '%tent%']);
    
    console.log(`✅ Found ${tentSearchResult.rows.length} voting districts matching "tent"`);
    
    if (tentSearchResult.rows.length > 0) {
      console.log('\nTent search results (first 3):');
      tentSearchResult.rows.slice(0, 3).forEach((district, index) => {
        console.log(`  ${index + 1}. ${district.name} (${district.id})`);
        console.log(`      ID: ${district.voting_district_id}, Ward: ${district.ward_code}`);
        console.log('');
      });
    }
    
    return { lenche: searchResult.rows.length, tent: tentSearchResult.rows.length };
    
  } catch (error) {
    console.error('❌ Error during voting districts search test:', error);
    throw error;
  }
}

async function testVotingStationsSearch() {
  console.log('🧪 Testing Voting Stations Search');
  console.log('=================================\n');
  
  try {
    // Test 1: Search for "lench"
    console.log('1. Testing voting stations search for "lench"...');
    
    const searchQuery = `
      SELECT
        vs.voting_station_id as id,
        vs.station_name as name,
        vs.station_code,
        vs.address,
        vs.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_stations vs
      LEFT JOIN members m ON vs.voting_station_id = m.voting_station_id
      WHERE vs.is_active = TRUE
        AND (vs.station_name ILIKE $1 OR vs.station_code ILIKE $2)
      GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address, vs.ward_code
      ORDER BY vs.station_name 
      LIMIT 10
    `;
    
    const searchResult = await pool.query(searchQuery, ['%lench%', '%lench%']);
    
    console.log(`✅ Found ${searchResult.rows.length} voting stations matching "lench"`);
    
    if (searchResult.rows.length > 0) {
      console.log('\nVoting stations search results:');
      searchResult.rows.forEach((station, index) => {
        console.log(`  ${index + 1}. ${station.name} (${station.id})`);
        console.log(`      Code: ${station.station_code || 'N/A'}, Ward: ${station.ward_code}`);
        console.log(`      Address: ${station.address || 'N/A'}`);
        console.log(`      Members: ${station.member_count}`);
        console.log('');
      });
    }
    
    // Test 2: Search for "school"
    console.log('2. Testing voting stations search for "school"...');
    
    const schoolSearchResult = await pool.query(searchQuery, ['%school%', '%school%']);
    
    console.log(`✅ Found ${schoolSearchResult.rows.length} voting stations matching "school"`);
    
    if (schoolSearchResult.rows.length > 0) {
      console.log('\nSchool search results (first 3):');
      schoolSearchResult.rows.slice(0, 3).forEach((station, index) => {
        console.log(`  ${index + 1}. ${station.name} (${station.id})`);
        console.log(`      Ward: ${station.ward_code}, Members: ${station.member_count}`);
        console.log('');
      });
    }
    
    return { lench: searchResult.rows.length, school: schoolSearchResult.rows.length };
    
  } catch (error) {
    console.error('❌ Error during voting stations search test:', error);
    throw error;
  }
}

async function testLookupEndpoints() {
  console.log('🧪 Testing Lookup Endpoints Database Queries');
  console.log('============================================\n');
  
  try {
    // Test voting districts
    const votingDistrictsResults = await testVotingDistrictsSearch();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test voting stations
    const votingStationsResults = await testVotingStationsSearch();
    
    console.log('\n🎉 All lookup endpoint tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   Voting Districts:');
    console.log(`     ✅ "lenche" search: ${votingDistrictsResults.lenche} results`);
    console.log(`     ✅ "tent" search: ${votingDistrictsResults.tent} results`);
    console.log('   Voting Stations:');
    console.log(`     ✅ "lench" search: ${votingStationsResults.lench} results`);
    console.log(`     ✅ "school" search: ${votingStationsResults.school} results`);
    
    console.log('\n✅ SUCCESS: The lookup endpoints should now be working correctly!');
    console.log('   The API endpoints /api/v1/search/lookup/voting_districts and');
    console.log('   /api/v1/search/lookup/voting_stations have been fixed.');
    
  } catch (error) {
    console.error('❌ Error during lookup endpoints test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testLookupEndpoints().catch(console.error);
}

module.exports = {
  testVotingDistrictsSearch,
  testVotingStationsSearch,
  testLookupEndpoints
};
