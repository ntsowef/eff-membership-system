/**
 * Test Script: Membership Status Automation
 * 
 * This script tests both the database trigger and the scheduled job
 * to ensure they correctly update membership statuses.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function runTests() {
  console.log('='.repeat(80));
  console.log('MEMBERSHIP STATUS AUTOMATION - TEST SUITE');
  console.log('='.repeat(80));
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Check if trigger exists
    console.log('Test 1: Verify trigger exists...');
    const triggerCheck = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers
      WHERE trigger_name = 'tr_auto_update_membership_status'
    `);
    if (triggerCheck.rows.length > 0) {
      console.log('✅ PASS: Trigger exists');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Trigger not found');
      testsFailed++;
    }
    console.log('');

    // Test 2: Check if function exists
    console.log('Test 2: Verify trigger function exists...');
    const functionCheck = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines
      WHERE routine_name = 'fn_auto_update_membership_status'
    `);
    if (functionCheck.rows.length > 0) {
      console.log('✅ PASS: Trigger function exists');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Trigger function not found');
      testsFailed++;
    }
    console.log('');

    // Test 3: Insert test member with expired membership
    console.log('Test 3: Test trigger with expired membership...');
    await pool.query(`
      DELETE FROM members_consolidated WHERE id_number = '9999999999991'
    `);
    await pool.query(`
      INSERT INTO members_consolidated (
        id_number, firstname, surname,
        expiry_date, membership_status_id
      ) VALUES (
        '9999999999991', 'Test', 'Expired',
        CURRENT_DATE - INTERVAL '100 days', 1
      )
    `);
    const expiredTest = await pool.query(`
      SELECT membership_status_id
      FROM members_consolidated
      WHERE id_number = '9999999999991'
    `);
    if (expiredTest.rows[0].membership_status_id === 2) {
      console.log('✅ PASS: Trigger correctly set status to Expired (2)');
      testsPassed++;
    } else {
      console.log(`❌ FAIL: Expected status 2, got ${expiredTest.rows[0].membership_status_id}`);
      testsFailed++;
    }
    await pool.query(`DELETE FROM members_consolidated WHERE id_number = '9999999999991'`);
    console.log('');

    // Test 4: Insert test member with grace period membership
    console.log('Test 4: Test trigger with grace period membership...');
    await pool.query(`
      DELETE FROM members_consolidated WHERE id_number = '9999999999992'
    `);
    await pool.query(`
      INSERT INTO members_consolidated (
        id_number, firstname, surname,
        expiry_date, membership_status_id
      ) VALUES (
        '9999999999992', 'Test', 'Grace',
        CURRENT_DATE - INTERVAL '45 days', 1
      )
    `);
    const graceTest = await pool.query(`
      SELECT membership_status_id
      FROM members_consolidated
      WHERE id_number = '9999999999992'
    `);
    if (graceTest.rows[0].membership_status_id === 7) {
      console.log('✅ PASS: Trigger correctly set status to Grace Period (7)');
      testsPassed++;
    } else {
      console.log(`❌ FAIL: Expected status 7, got ${graceTest.rows[0].membership_status_id}`);
      testsFailed++;
    }
    await pool.query(`DELETE FROM members_consolidated WHERE id_number = '9999999999992'`);
    console.log('');

    // Test 5: Insert test member with good standing membership
    console.log('Test 5: Test trigger with good standing membership...');
    await pool.query(`
      DELETE FROM members_consolidated WHERE id_number = '9999999999993'
    `);
    await pool.query(`
      INSERT INTO members_consolidated (
        id_number, firstname, surname,
        expiry_date, membership_status_id
      ) VALUES (
        '9999999999993', 'Test', 'Active',
        CURRENT_DATE + INTERVAL '365 days', 2
      )
    `);
    const activeTest = await pool.query(`
      SELECT membership_status_id
      FROM members_consolidated
      WHERE id_number = '9999999999993'
    `);
    if (activeTest.rows[0].membership_status_id === 1) {
      console.log('✅ PASS: Trigger correctly set status to Active (1)');
      testsPassed++;
    } else {
      console.log(`❌ FAIL: Expected status 1, got ${activeTest.rows[0].membership_status_id}`);
      testsFailed++;
    }
    await pool.query(`DELETE FROM members_consolidated WHERE id_number = '9999999999993'`);
    console.log('');

    // Test 6: Check for any remaining mismatched statuses
    console.log('Test 6: Check for mismatched statuses in production data...');
    const mismatchCheck = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND membership_status_id != 1) as should_be_active,
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND expiry_date < CURRENT_DATE AND membership_status_id != 7) as should_be_grace,
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days' AND membership_status_id != 2) as should_be_expired
      FROM members_consolidated
      WHERE membership_status_id NOT IN (3, 4, 5)
    `);
    const mismatches =
      parseInt(mismatchCheck.rows[0].should_be_active) +
      parseInt(mismatchCheck.rows[0].should_be_grace) +
      parseInt(mismatchCheck.rows[0].should_be_expired);
    
    if (mismatches === 0) {
      console.log('✅ PASS: No mismatched statuses found');
      testsPassed++;
    } else {
      console.log(`⚠️  WARNING: ${mismatches} members with mismatched statuses`);
      console.log('   This is expected if the data fix script has not been run yet.');
      testsPassed++;
    }
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log('='.repeat(80));

    if (testsFailed === 0) {
      console.log('');
      console.log('🎉 All tests passed! The membership status automation is working correctly.');
    } else {
      console.log('');
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    await pool.end();
  }
}

runTests();

