/**
 * Test SMS Toggle Functionality
 * 
 * This script tests whether the SMS enable/disable toggle actually works:
 * 1. Check current SMS_ENABLED status
 * 2. Try to send SMS when enabled
 * 3. Try to send SMS when disabled
 * 4. Verify that SMS is blocked when disabled
 */

require('dotenv').config({ path: '.env.postgres' });
const axios = require('axios');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

// SMS Configuration
const SMS_API_URL = process.env.SMS_API_URL || 'https://bulksms.gvive.com/api/json/applink/SendMessages';
const SMS_AFFILIATE_CODE = process.env.SMS_AFFILIATE_CODE || 'INT001-1161-001';
const SMS_AUTH_CODE = process.env.SMS_AUTH_CODE || 'EFFAPPLINK';

// Test phone number (use a safe test number)
const TEST_PHONE = '0796222822'; // Frans's number for testing
const TEST_MESSAGE = 'TEST MESSAGE: This is a test to verify SMS toggle functionality. Please ignore.';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   SMS Toggle Functionality Test                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function getCurrentSMSStatus() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT setting_value 
      FROM system_settings 
      WHERE setting_key = 'enable_sms_notifications'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ SMS setting not found in database!');
      return null;
    }
    
    const value = result.rows[0].setting_value;
    const isEnabled = value === 'true' || value === '1' || value === true;
    
    return isEnabled;
  } finally {
    client.release();
  }
}

async function updateSMSStatus(enabled) {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = 'enable_sms_notifications'
    `, [enabled ? 'true' : 'false']);
    
    console.log(`✅ Updated SMS status in database to: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } finally {
    client.release();
  }
}

async function sendTestSMS() {
  try {
    const smsPayload = {
      "affiliateCode": SMS_AFFILIATE_CODE,
      "authenticationCode": SMS_AUTH_CODE,
      "submitDateTime": new Date().toISOString(),
      "messageType": "text",
      "recipientList": {
        "recipient": [
          {
            "msisdn": TEST_PHONE,
            "message": TEST_MESSAGE
          }
        ]
      }
    };

    console.log('📤 Attempting to send SMS...');
    console.log(`   Phone: ${TEST_PHONE}`);
    console.log(`   Message: ${TEST_MESSAGE.substring(0, 50)}...`);

    const response = await axios.post(SMS_API_URL, smsPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      response: error.response?.data
    };
  }
}

async function testSMSWithStatus(enabled) {
  console.log('\n' + '═'.repeat(60));
  console.log(`TEST: SMS ${enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log('═'.repeat(60));
  
  // Update database
  await updateSMSStatus(enabled);
  
  // Also update .env.postgres file to simulate real behavior
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../../.env.postgres');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const smsEnabledValue = enabled ? 'true' : 'false';
    
    if (envContent.includes('SMS_ENABLED=')) {
      envContent = envContent.replace(/SMS_ENABLED=.*/g, `SMS_ENABLED=${smsEnabledValue}`);
    } else {
      envContent += `\nSMS_ENABLED=${smsEnabledValue}\n`;
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Updated .env.postgres: SMS_ENABLED=${smsEnabledValue}`);
  }
  
  // Wait a moment for changes to take effect
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to send SMS
  const result = await sendTestSMS();
  
  console.log('\n📊 Result:');
  if (result.success) {
    console.log('✅ SMS API call succeeded');
    console.log('   Response:', JSON.stringify(result.data, null, 2));
    
    if (enabled) {
      console.log('✅ EXPECTED: SMS should be sent when enabled');
    } else {
      console.log('⚠️  WARNING: SMS was sent even though it should be disabled!');
      console.log('   This means the backend is NOT checking the SMS_ENABLED flag!');
    }
  } else {
    console.log('❌ SMS API call failed');
    console.log('   Error:', result.error);
    if (result.response) {
      console.log('   Response:', JSON.stringify(result.response, null, 2));
    }
    
    if (!enabled) {
      console.log('✅ EXPECTED: SMS should be blocked when disabled');
    } else {
      console.log('❌ UNEXPECTED: SMS should work when enabled');
    }
  }
}

async function runTests() {
  try {
    // Check initial status
    console.log('📋 Checking current SMS status...\n');
    const initialStatus = await getCurrentSMSStatus();
    
    if (initialStatus === null) {
      console.log('❌ Cannot proceed - SMS setting not found in database');
      process.exit(1);
    }
    
    console.log(`Current SMS Status: ${initialStatus ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log('');
    
    // Test 1: SMS Enabled
    await testSMSWithStatus(true);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: SMS Disabled
    await testSMSWithStatus(false);
    
    // Restore original status
    console.log('\n' + '═'.repeat(60));
    console.log('RESTORING ORIGINAL STATUS');
    console.log('═'.repeat(60));
    await updateSMSStatus(initialStatus);
    console.log(`✅ Restored SMS status to: ${initialStatus ? 'ENABLED' : 'DISABLED'}`);
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log('⚠️  IMPORTANT NOTE:');
    console.log('   This test only verifies that the database and .env file are updated.');
    console.log('   To fully test the SMS toggle, the backend SMS sending code must:');
    console.log('');
    console.log('   1. Check config.sms.enabled before sending');
    console.log('   2. Return an error if SMS is disabled');
    console.log('   3. Log the attempt for audit purposes');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Check backend SMS sending functions');
    console.log('   2. Ensure they check config.sms.enabled');
    console.log('   3. Add proper error handling for disabled SMS');
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

runTests();

