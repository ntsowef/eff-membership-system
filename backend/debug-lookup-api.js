/**
 * Debug Script for Lookup API Issues
 * 
 * This script tests the exact same query that the API should be running
 * to identify where the disconnect is happening.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { executeQuery } = require('./dist/config/database');

async function debugLookupAPI() {
  console.log('🔍 Debugging Lookup API Issues');
  console.log('==============================\n');
  
  try {
    // Test the exact query that the API should be running for voting_districts
    console.log('1. Testing voting districts query with executeQuery function...');
    
    const search = 'lenche';
    const limit = 10;
    let paramIndex = 1;
    
    let query = `
      SELECT
        vd.voting_district_code as id,
        vd.voting_district_name as name,
        vd.voting_district_id,
        vd.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '') = REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '')
      WHERE vd.is_active = TRUE
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (vd.voting_district_name ILIKE $${paramIndex} OR vd.voting_district_code ILIKE $${paramIndex + 1} OR REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '') ILIKE REPLACE($${paramIndex + 2}, '.0', '') OR CAST(vd.voting_district_id AS TEXT) ILIKE $${paramIndex + 3})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 4;
    }
    
    query += ' GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_id, vd.ward_code';
    query += ` ORDER BY vd.voting_district_id, vd.voting_district_name LIMIT $${paramIndex}`;
    params.push(limit);
    
    console.log('Query:', query);
    console.log('Params:', params);
    console.log('');
    
    const results = await executeQuery(query, params);
    
    console.log(`✅ executeQuery returned ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\nResults from executeQuery:');
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.id})`);
        console.log(`      ID: ${result.voting_district_id}, Ward: ${result.ward_code}`);
        console.log(`      Members: ${result.member_count}`);
        console.log('');
      });
    } else {
      console.log('❌ No results returned from executeQuery - this is the problem!');
    }
    
    // Test 2: Test voting stations query
    console.log('\n2. Testing voting stations query with executeQuery function...');
    
    const stationSearch = 'lench';
    paramIndex = 1;
    
    let stationQuery = `
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
    `;
    
    const stationParams = [];
    
    if (stationSearch) {
      stationQuery += ` AND (vs.station_name ILIKE $${paramIndex} OR vs.station_code ILIKE $${paramIndex + 1})`;
      stationParams.push(`%${stationSearch}%`, `%${stationSearch}%`);
      paramIndex += 2;
    }
    
    stationQuery += ' GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address, vs.ward_code';
    stationQuery += ` ORDER BY vs.station_name LIMIT $${paramIndex}`;
    stationParams.push(limit);
    
    console.log('Station Query:', stationQuery);
    console.log('Station Params:', stationParams);
    console.log('');
    
    const stationResults = await executeQuery(stationQuery, stationParams);
    
    console.log(`✅ executeQuery returned ${stationResults.length} station results`);
    
    if (stationResults.length > 0) {
      console.log('\nStation results from executeQuery:');
      stationResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.id})`);
        console.log(`      Code: ${result.station_code || 'N/A'}, Ward: ${result.ward_code}`);
        console.log(`      Members: ${result.member_count}`);
        console.log('');
      });
    } else {
      console.log('❌ No station results returned from executeQuery');
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log(`   Voting Districts: ${results.length} results`);
    console.log(`   Voting Stations: ${stationResults.length} results`);
    
    if (results.length === 0 && stationResults.length === 0) {
      console.log('\n❌ ISSUE IDENTIFIED: executeQuery is not returning results');
      console.log('   This suggests there might be an issue with:');
      console.log('   1. Database connection in the executeQuery function');
      console.log('   2. Query parameter binding');
      console.log('   3. Database table structure differences');
      console.log('   4. Transaction isolation or connection pooling issues');
    } else {
      console.log('\n✅ executeQuery is working correctly');
      console.log('   The issue might be elsewhere in the API chain');
    }
    
  } catch (error) {
    console.error('❌ Error during debug test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug test
if (require.main === module) {
  debugLookupAPI().catch(console.error);
}

module.exports = {
  debugLookupAPI
};
