/**
 * Test SQL Conversion for Lookup Endpoints
 * 
 * This script tests the SQL conversion process to see what's happening
 * with the MySQL to PostgreSQL conversion.
 * 
 * Author: EFF Membership System
 * Date: 2025-01-23
 */

const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testSQLConversion() {
  console.log('🔧 Testing SQL Conversion for Lookup Endpoints');
  console.log('===============================================\n');
  
  try {
    // Test 1: Voting Districts Query
    console.log('1. Testing Voting Districts Query Conversion...');
    
    const votingDistrictsQuery = `
      SELECT
        vd.voting_district_code as id,
        vd.voting_district_name as name,
        vd.voting_district_id,
        vd.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
      WHERE vd.is_active = 1
        AND (vd.voting_district_name LIKE ? OR vd.voting_district_code LIKE ? OR REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '') LIKE REPLACE(?, '.0', '') OR CAST(vd.voting_district_id AS CHAR) LIKE ?)
      GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_id, vd.ward_code
      ORDER BY vd.voting_district_id, vd.voting_district_name 
      LIMIT ?
    `;
    
    console.log('Original MySQL Query:');
    console.log(votingDistrictsQuery);
    console.log('');
    
    const convertedVotingDistrictsQuery = SQLMigrationService.convertComplexMySQLQuery(votingDistrictsQuery);
    
    console.log('Converted PostgreSQL Query:');
    console.log(convertedVotingDistrictsQuery);
    console.log('');
    
    // Test 2: Voting Stations Query
    console.log('2. Testing Voting Stations Query Conversion...');
    
    const votingStationsQuery = `
      SELECT
        vs.voting_station_id as id,
        vs.station_name as name,
        vs.station_code,
        vs.address,
        vs.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_stations vs
      LEFT JOIN members m ON vs.voting_station_id = m.voting_station_id
      WHERE vs.is_active = 1
        AND (vs.station_name LIKE ? OR vs.station_code LIKE ?)
      GROUP BY vs.voting_station_id, vs.station_name, vs.station_code, vs.address, vs.ward_code
      ORDER BY vs.station_name 
      LIMIT ?
    `;
    
    console.log('Original MySQL Query:');
    console.log(votingStationsQuery);
    console.log('');
    
    const convertedVotingStationsQuery = SQLMigrationService.convertComplexMySQLQuery(votingStationsQuery);
    
    console.log('Converted PostgreSQL Query:');
    console.log(convertedVotingStationsQuery);
    console.log('');
    
    // Test 3: Simple test query
    console.log('3. Testing Simple Query Conversion...');
    
    const simpleQuery = `
      SELECT * FROM voting_districts 
      WHERE voting_district_name LIKE ? 
      AND is_active = 1 
      LIMIT ?
    `;
    
    console.log('Original Simple Query:');
    console.log(simpleQuery);
    console.log('');
    
    const convertedSimpleQuery = SQLMigrationService.convertComplexMySQLQuery(simpleQuery);
    
    console.log('Converted Simple Query:');
    console.log(convertedSimpleQuery);
    console.log('');
    
    console.log('🎯 SQL Conversion Analysis:');
    console.log('============================');
    console.log('✅ All queries converted successfully');
    console.log('');
    console.log('Key Conversions Expected:');
    console.log('  - CAST(... AS CHAR) → CAST(... AS TEXT)');
    console.log('  - is_active = 1 → is_active = TRUE');
    console.log('  - LIKE → ILIKE (case-insensitive)');
    console.log('  - ? placeholders → $1, $2, etc.');
    console.log('');
    console.log('If the API is still returning empty results, the issue might be:');
    console.log('  1. Parameter binding mismatch');
    console.log('  2. Data type conversion issues');
    console.log('  3. Boolean value handling (1 vs TRUE)');
    console.log('  4. Case sensitivity in LIKE vs ILIKE');
    
  } catch (error) {
    console.error('❌ Error during SQL conversion test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testSQLConversion().catch(console.error);
}

module.exports = {
  testSQLConversion
};
