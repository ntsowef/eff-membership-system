/**
 * Test voting districts column fix
 */

const { Pool } = require('pg');
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testVotingDistrictsFix() {
  console.log('🔧 Testing voting districts column fix...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Test the original problematic query
    console.log('\n1. Testing original problematic query (should work now)...');
    
    const originalQuery = `
      SELECT
        vd.voting_district_code as id,
        vd.voting_district_name as name,
        vd.voting_district_id,
        vd.ward_code,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '')
      WHERE vd.is_active = 1
      AND (vd.voting_district_name LIKE ? OR vd.voting_district_code LIKE ? OR REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '') LIKE REPLACE(?, '.0', '') OR CAST(vd.voting_district_id AS CHAR) LIKE ? )
      GROUP BY vd.voting_district_code, vd.voting_district_name, vd.voting_district_id, vd.ward_code
      ORDER BY vd.voting_district_id, vd.voting_district_name LIMIT ?
    `;
    
    console.log('Original MySQL query:');
    console.log(originalQuery);
    
    // Convert to PostgreSQL
    const convertedQuery = SQLMigrationService.convertComplexMySQLQuery(originalQuery);
    console.log('\nConverted PostgreSQL query:');
    console.log(convertedQuery);
    
    // Test execution with search term "lenc"
    const params = ['%lenc%', '%lenc%', '%lenc%', '%lenc%', 10];
    
    console.log('\nExecuting query with params:', params);
    
    const result = await pool.query(convertedQuery, params);
    
    console.log(`✅ Query executed successfully! Found ${result.rows.length} results`);
    
    if (result.rows.length > 0) {
      console.log('\nSample results:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.name} (${row.id}) - ${row.member_count} members`);
      });
    }
    
    // Test 2: Test voting stations query fix
    console.log('\n2. Testing voting stations query fix...');
    
    const stationQuery = `
      SELECT
        vs.voting_station_id,
        vs.station_name,
        vs.station_code,
        vs.address,
        vd.voting_district_name,
        vd.voting_district_id,
        w.ward_name,
        w.ward_number,
        mu.municipal_name,
        d.district_name,
        p.province_name
      FROM voting_stations vs
      LEFT JOIN voting_districts vd ON vs.voting_district_code = vd.voting_district_code
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      WHERE vs.voting_station_id = ?
      LIMIT 1
    `;
    
    const convertedStationQuery = SQLMigrationService.convertComplexMySQLQuery(stationQuery);
    console.log('Converted station query:');
    console.log(convertedStationQuery);
    
    // Test with first available voting station
    const stationTestQuery = 'SELECT voting_station_id FROM voting_stations WHERE is_active = true LIMIT 1';
    const stationTestResult = await pool.query(stationTestQuery);
    
    if (stationTestResult.rows.length > 0) {
      const testStationId = stationTestResult.rows[0].voting_station_id;
      console.log(`\nTesting with voting station ID: ${testStationId}`);
      
      const stationResult = await pool.query(convertedStationQuery, [testStationId]);
      
      if (stationResult.rows.length > 0) {
        console.log('✅ Station query executed successfully!');
        console.log('Station info:', {
          name: stationResult.rows[0].station_name,
          code: stationResult.rows[0].station_code,
          voting_district: stationResult.rows[0].voting_district_name,
          ward: stationResult.rows[0].ward_name,
          municipality: stationResult.rows[0].municipal_name
        });
      } else {
        console.log('ℹ️ No station info found (might be missing joins)');
      }
    } else {
      console.log('ℹ️ No active voting stations found for testing');
    }
    
    // Test 3: Test members by voting district query
    console.log('\n3. Testing members by voting district query...');
    
    const membersQuery = `
      SELECT
        m.member_id,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
        m.firstname,
        COALESCE(m.surname, '') as surname,
        m.voting_district_code,
        vd.voting_district_name,
        vd.voting_district_id
      FROM members m
      LEFT JOIN voting_districts vd ON REPLACE(CAST(m.voting_district_code AS CHAR), '.0', '') = REPLACE(CAST(vd.voting_district_code AS CHAR), '.0', '')
      WHERE m.voting_district_code IS NOT NULL
      LIMIT 5
    `;
    
    const convertedMembersQuery = SQLMigrationService.convertComplexMySQLQuery(membersQuery);
    console.log('Converted members query:');
    console.log(convertedMembersQuery);
    
    const membersResult = await pool.query(convertedMembersQuery);
    
    console.log(`✅ Members query executed successfully! Found ${membersResult.rows.length} results`);
    
    if (membersResult.rows.length > 0) {
      console.log('\nSample member results:');
      membersResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.firstname} ${row.surname} (${row.membership_number}) - VD: ${row.voting_district_name || 'Unknown'}`);
      });
    }
    
    console.log('\n🎯 VOTING DISTRICTS FIX TEST COMPLETE!');
    
    console.log('\n📊 SUMMARY:');
    console.log('✅ voting_district_code column: WORKING');
    console.log('✅ voting_district_name column: WORKING');
    console.log('✅ voting_district_id column: WORKING');
    console.log('✅ Query conversion: SUCCESSFUL');
    console.log('✅ Database execution: SUCCESSFUL');
    
    console.log('\n🔧 FIXES APPLIED:');
    console.log('1. Updated memberSearch.ts voting_districts query');
    console.log('2. Fixed voting stations JOIN relationship');
    console.log('3. Updated viewsService.ts column references');
    console.log('4. All vd.vd_code → vd.voting_district_code');
    console.log('5. All vd.vd_name → vd.voting_district_name');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testVotingDistrictsFix();
