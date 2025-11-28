/**
 * JSON Applink SMS Test Script V2 - Alternative Formats
 * Tests different authentication and payload formats
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.postgres') });

const config = {
  apiUrl: process.env.JSON_APPLINK_API_URL || '',
  apiKey: process.env.JSON_APPLINK_API_KEY || '',
  username: process.env.JSON_APPLINK_USERNAME || '',
  password: process.env.JSON_APPLINK_PASSWORD || '',
  fromNumber: process.env.JSON_APPLINK_FROM_NUMBER || 'EFF',
};

console.log('Configuration:');
console.log('API URL:', config.apiUrl);
console.log('API Key:', config.apiKey);
console.log('Username:', config.username);
console.log('Password:', config.password.substring(0, 3) + '***');
console.log('From:', config.fromNumber);
console.log('\n' + '='.repeat(60) + '\n');

const testPhoneNumber = '27796222802';
const testMessage = 'Test SMS from EFF System';

// Test Format 1: Original format
async function testFormat1() {
  console.log('🧪 TEST FORMAT 1: Standard JSON with all fields');
  try {
    const payload = {
      username: config.username,
      password: config.password,
      api_key: config.apiKey,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, password: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Failed');
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Test Format 2: With apikey instead of api_key
async function testFormat2() {
  console.log('\n🧪 TEST FORMAT 2: Using "apikey" field');
  try {
    const payload = {
      username: config.username,
      password: config.password,
      apikey: config.apiKey,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, password: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Failed');
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Test Format 3: With Authorization header
async function testFormat3() {
  console.log('\n🧪 TEST FORMAT 3: Using Authorization header');
  try {
    const payload = {
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    const authString = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Auth: Basic', authString.substring(0, 10) + '***');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'X-API-Key': config.apiKey,
      },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Failed');
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Test Format 4: URL encoded form data
async function testFormat4() {
  console.log('\n🧪 TEST FORMAT 4: URL encoded form data');
  try {
    const params = new URLSearchParams({
      username: config.username,
      password: config.password,
      api_key: config.apiKey,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    });

    console.log('Payload:', params.toString().replace(config.password, '***'));

    const response = await axios.post(config.apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Failed');
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Test Format 5: Different field names
async function testFormat5() {
  console.log('\n🧪 TEST FORMAT 5: Alternative field names');
  try {
    const payload = {
      user: config.username,
      pass: config.password,
      key: config.apiKey,
      recipient: testPhoneNumber,
      sender: config.fromNumber,
      text: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, pass: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Failed');
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    JSON Applink SMS API - Format Testing                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const tests = [
    testFormat1,
    testFormat2,
    testFormat3,
    testFormat4,
    testFormat5,
  ];

  for (const test of tests) {
    const success = await test();
    if (success) {
      console.log('\n✅ FOUND WORKING FORMAT! Test completed successfully.');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }

  console.log('\n❌ All formats failed. Please check:');
  console.log('   1. API credentials are correct');
  console.log('   2. Account is active and has credits');
  console.log('   3. Contact JSON Applink support for correct API format');
  console.log('   4. Check API documentation');
}

runAllTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

