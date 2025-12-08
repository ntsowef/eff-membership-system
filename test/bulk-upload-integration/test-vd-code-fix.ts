/**
 * Test VD Code Fix - Verify 8-digit codes work
 * 
 * This script tests that the 8-digit VD codes (22222222, 99999999) 
 * can be successfully inserted into the database
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function testVDCodeFix() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing VD Code Fix (8-digit codes)\n');
    
    // Test data with 8-digit VD codes
    const testIdNumber = '9999999999999'; // Test ID (will fail Luhn but that's OK for this test)
    const testVDCode8Digits = '99999999'; // 8 digits - should work
    
    console.log('📋 Test Configuration:');
    console.log(`   ID Number: ${testIdNumber}`);
    console.log(`   VD Code: ${testVDCode8Digits} (${testVDCode8Digits.length} digits)`);
    console.log('');
    
    // Step 1: Check if VD code exists in voting_districts table
    console.log('Step 1: Checking if VD code exists in voting_districts table...');
    const vdCheck = await client.query(
      'SELECT voting_district_code, voting_district_name FROM voting_districts WHERE voting_district_code = $1',
      [testVDCode8Digits]
    );
    
    if (vdCheck.rows.length > 0) {
      console.log(`✅ VD code ${testVDCode8Digits} EXISTS in database`);
      console.log(`   Name: ${vdCheck.rows[0].voting_district_name}`);
    } else {
      console.log(`❌ VD code ${testVDCode8Digits} NOT FOUND in database`);
      console.log('   This test will fail!');
      await client.release();
      return;
    }
    
    console.log('');
    
    // Step 2: Delete test record if it exists
    console.log('Step 2: Cleaning up any existing test record...');
    await client.query('DELETE FROM members_consolidated WHERE id_number = $1', [testIdNumber]);
    console.log('✅ Cleanup complete');
    console.log('');
    
    // Step 3: Try to insert a record with 8-digit VD code
    console.log('Step 3: Attempting to insert record with 8-digit VD code...');
    
    const insertQuery = `
      INSERT INTO members_consolidated (
        id_number,
        firstname,
        surname,
        voting_district_code,
        date_joined,
        membership_status_id
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 1)
      RETURNING member_id, id_number, voting_district_code
    `;
    
    const insertResult = await client.query(insertQuery, [
      testIdNumber,
      'Test',
      'User',
      testVDCode8Digits
    ]);
    
    console.log('✅ INSERT SUCCESSFUL!');
    console.log(`   Member ID: ${insertResult.rows[0].member_id}`);
    console.log(`   ID Number: ${insertResult.rows[0].id_number}`);
    console.log(`   VD Code: ${insertResult.rows[0].voting_district_code}`);
    console.log('');
    
    // Step 4: Verify the record was inserted correctly
    console.log('Step 4: Verifying inserted record...');
    const verifyResult = await client.query(
      'SELECT member_id, id_number, firstname, surname, voting_district_code FROM members_consolidated WHERE id_number = $1',
      [testIdNumber]
    );
    
    if (verifyResult.rows.length > 0) {
      const record = verifyResult.rows[0];
      console.log('✅ Record verified in database:');
      console.log(`   Member ID: ${record.member_id}`);
      console.log(`   Name: ${record.firstname} ${record.surname}`);
      console.log(`   VD Code: ${record.voting_district_code}`);
      
      if (record.voting_district_code === testVDCode8Digits) {
        console.log('');
        console.log('🎉 SUCCESS! 8-digit VD code fix is working correctly!');
      } else {
        console.log('');
        console.log(`⚠️  WARNING: VD code mismatch! Expected ${testVDCode8Digits}, got ${record.voting_district_code}`);
      }
    } else {
      console.log('❌ Record not found after insert!');
    }
    
    console.log('');
    
    // Step 5: Cleanup
    console.log('Step 5: Cleaning up test record...');
    await client.query('DELETE FROM members_consolidated WHERE id_number = $1', [testIdNumber]);
    console.log('✅ Cleanup complete');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ TEST FAILED!');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    if (error.detail) console.error(`   Detail: ${error.detail}`);
    if (error.constraint) console.error(`   Constraint: ${error.constraint}`);
  } finally {
    client.release();
    await pool.end();
  }
}

testVDCodeFix();

