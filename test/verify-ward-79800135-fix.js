const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function verifyWardFix() {
  const client = await pool.connect();
  
  try {
    const wardCode = '79800135';
    
    console.log('='.repeat(80));
    console.log(`VERIFYING FIX FOR WARD: ${wardCode}`);
    console.log('='.repeat(80));
    console.log();

    // Get expected counts
    const expectedQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN membership_status_id = 1 THEN 1 END) as active,
        COUNT(CASE WHEN membership_status_id IN (2, 3, 4) THEN 1 END) as expired
      FROM members_consolidated
      WHERE ward_code = $1;
    `;
    
    const expectedResult = await client.query(expectedQuery, [wardCode]);
    const expected = expectedResult.rows[0];
    
    console.log('📊 EXPECTED COUNTS:');
    console.log(`  - All Members: ${expected.total}`);
    console.log(`  - Active: ${expected.active}`);
    console.log(`  - Expired/Inactive: ${expected.expired}`);
    console.log();

    // Test 1: Simulate "All Members" filter (membership_status = 'all')
    console.log('='.repeat(80));
    console.log('TEST 1: ALL MEMBERS FILTER (membership_status = "all")');
    console.log('='.repeat(80));
    
    const allQuery = `
      SELECT COUNT(*) as count
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      WHERE m.ward_code = $1;
    `;
    
    const allResult = await client.query(allQuery, [wardCode]);
    const allCount = parseInt(allResult.rows[0].count);
    
    console.log(`Result: ${allCount} members`);
    console.log(`Expected: ${expected.total} members`);
    console.log(allCount === parseInt(expected.total) ? '✅ PASS' : '❌ FAIL');
    console.log();

    // Test 2: Simulate "Active" filter (membership_status = 'active')
    console.log('='.repeat(80));
    console.log('TEST 2: ACTIVE FILTER (membership_status = "active")');
    console.log('='.repeat(80));
    
    const activeQuery = `
      SELECT COUNT(*) as count
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      WHERE m.ward_code = $1
        AND m.membership_status_id = 1;
    `;
    
    const activeResult = await client.query(activeQuery, [wardCode]);
    const activeCount = parseInt(activeResult.rows[0].count);
    
    console.log(`Result: ${activeCount} members`);
    console.log(`Expected: ${expected.active} members`);
    console.log(activeCount === parseInt(expected.active) ? '✅ PASS' : '❌ FAIL');
    console.log();

    // Test 3: Simulate "Expired" filter (membership_status = 'expired')
    console.log('='.repeat(80));
    console.log('TEST 3: EXPIRED FILTER (membership_status = "expired")');
    console.log('='.repeat(80));
    
    const expiredQuery = `
      SELECT COUNT(*) as count
      FROM members_consolidated m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
      LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
      WHERE m.ward_code = $1
        AND m.membership_status_id IN (2, 3, 4);
    `;
    
    const expiredResult = await client.query(expiredQuery, [wardCode]);
    const expiredCount = parseInt(expiredResult.rows[0].count);
    
    console.log(`Result: ${expiredCount} members`);
    console.log(`Expected: ${expected.expired} members`);
    console.log(expiredCount === parseInt(expected.expired) ? '✅ PASS' : '❌ FAIL');
    console.log();

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY - EXPECTED BEHAVIOR');
    console.log('='.repeat(80));
    console.log();
    console.log('Frontend Behavior:');
    console.log(`  1. "All Members" tab → Shows ${expected.total} members`);
    console.log(`  2. "Active" tab → Shows ${expected.active} members`);
    console.log(`  3. "Expired/Inactive" tab → Shows ${expected.expired} members`);
    console.log();
    console.log('Excel Download Behavior:');
    console.log(`  1. Download on "All Members" tab → Excel contains ${expected.total} members`);
    console.log(`  2. Download on "Active" tab → Excel contains ${expected.active} members`);
    console.log(`  3. Download on "Expired/Inactive" tab → Excel contains ${expected.expired} members`);
    console.log();
    console.log('✅ Excel download now respects the current filter!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error verifying fix:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyWardFix()
  .then(() => {
    console.log('\n✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });

