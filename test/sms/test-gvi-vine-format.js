/**
 * GVI/Vine SMS API Test - Based on typical GVI API format
 * The API URL suggests this is a GVI/Vine system
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

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         GVI/Vine SMS API Test                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Configuration:');
console.log('API URL:', config.apiUrl);
console.log('Username:', config.username);
console.log('Password:', config.password.substring(0, 3) + '***');
console.log('API Key:', config.apiKey);
console.log('From:', config.fromNumber);
console.log('\n' + '='.repeat(60) + '\n');

const testPhoneNumber = '27796222802';
const testMessage = 'Test SMS from EFF System';

// Test 1: Username/Password only (no API key in payload)
async function test1() {
  console.log('🧪 TEST 1: Username & Password only');
  try {
    const payload = {
      username: config.username,
      password: config.password,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, password: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('Response Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<') || response.data.includes('success')) {
      console.log('✅ SUCCESS!');
      return true;
    }
    console.log('❌ Failed\n');
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 2: API Key as username, password as password
async function test2() {
  console.log('🧪 TEST 2: API Key as username');
  try {
    const payload = {
      username: config.apiKey,
      password: config.password,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, password: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('Response Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<') || response.data.includes('success')) {
      console.log('✅ SUCCESS!');
      return true;
    }
    console.log('❌ Failed\n');
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 3: Different field names (msisdn, text, etc.)
async function test3() {
  console.log('🧪 TEST 3: Alternative field names (msisdn, text)');
  try {
    const payload = {
      username: config.username,
      password: config.password,
      msisdn: testPhoneNumber,
      sender: config.fromNumber,
      text: testMessage,
    };

    console.log('Payload:', JSON.stringify({ ...payload, password: '***' }, null, 2));

    const response = await axios.post(config.apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('Response Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<') || response.data.includes('success')) {
      console.log('✅ SUCCESS!');
      return true;
    }
    console.log('❌ Failed\n');
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 4: URL parameters instead of JSON body
async function test4() {
  console.log('🧪 TEST 4: URL parameters (GET request)');
  try {
    const params = {
      username: config.username,
      password: config.password,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `${config.apiUrl}?${queryString}`;

    console.log('URL:', url.replace(config.password, '***'));

    const response = await axios.get(url, {
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('Response Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<') || response.data.includes('success')) {
      console.log('✅ SUCCESS!');
      return true;
    }
    console.log('❌ Failed\n');
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    return false;
  }
}

// Test 5: Form-encoded POST
async function test5() {
  console.log('🧪 TEST 5: Form-encoded POST');
  try {
    const params = new URLSearchParams({
      username: config.username,
      password: config.password,
      to: testPhoneNumber,
      from: config.fromNumber,
      message: testMessage,
    });

    console.log('Payload:', params.toString().replace(config.password, '***'));

    const response = await axios.post(config.apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('Response Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.data.includes('resultCode>0<') || response.data.includes('success')) {
      console.log('✅ SUCCESS!');
      return true;
    }
    console.log('❌ Failed\n');
    return false;
  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
    return false;
  }
}

// Run all tests
async function runTests() {
  const tests = [test1, test2, test3, test4, test5];
  
  for (const test of tests) {
    const success = await test();
    if (success) {
      console.log('\n✅ FOUND WORKING FORMAT!');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('❌ ALL TESTS FAILED');
  console.log('='.repeat(60));
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   1. Double-check credentials with JSON Applink/GVI support');
  console.log('   2. Ask for their official API documentation');
  console.log('   3. Request a working code sample from them');
  console.log('   4. Verify account is active and has credits');
  console.log('   5. Check if IP whitelisting is required');
  console.log('\n📧 Contact JSON Applink support with:');
  console.log('   - Your username: ' + config.username);
  console.log('   - API URL: ' + config.apiUrl);
  console.log('   - Error: "Invalid Authentication: Failed Authentication"');
  console.log('   - Request: Working code example or correct payload format');
}

runTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

