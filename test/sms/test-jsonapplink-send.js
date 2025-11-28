/**
 * JSON Applink SMS Test Script
 * 
 * Tests sending SMS using the JSON Applink API with correct credentials
 * 
 * API Details:
 * - URL: https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
 * - Authentication Code: EFFAPPLINK
 * - Affiliate Code: INT001-1161-001
 * - User: AppLink
 */

const axios = require('axios');

// Configuration
const config = {
  apiUrl: 'https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/',
  authCode: 'EFFAPPLINK',
  affiliateCode: 'INT001-1161-001',
  user: 'AppLink',
  testNumber: '+27796222802',
  testMessage: 'Test SMS from EFF Membership System via JSON Applink. This is a test message.'
};

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   JSON Applink SMS Test                                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   API URL: ${config.apiUrl}`);
console.log(`   Auth Code: ${config.authCode}`);
console.log(`   Affiliate Code: ${config.affiliateCode}`);
console.log(`   User: ${config.user}`);
console.log(`   Test Number: ${config.testNumber}`);
console.log('');

/**
 * Test 1: Basic JSON POST with Authentication Code
 */
async function test1_BasicJsonPost() {
  console.log('1️⃣  Test 1: Basic JSON POST with Authentication Code');
  console.log('   Format: Standard JSON with authCode field');
  console.log('');

  const payload = {
    authCode: config.authCode,
    affiliateCode: config.affiliateCode,
    user: config.user,
    msisdn: config.testNumber,
    message: config.testMessage,
    messageType: 'SMS'
  };

  try {
    console.log('   📤 Sending request...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('   ✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    return true;

  } catch (error) {
    console.log('   ❌ Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Message:', error.message);
    }
    console.log('');
    return false;
  }
}

/**
 * Test 2: With Authentication Header
 */
async function test2_WithAuthHeader() {
  console.log('2️⃣  Test 2: JSON POST with Authentication Header');
  console.log('   Format: Auth code in header');
  console.log('');

  const payload = {
    affiliateCode: config.affiliateCode,
    user: config.user,
    msisdn: config.testNumber,
    message: config.testMessage,
    messageType: 'SMS'
  };

  try {
    console.log('   📤 Sending request...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.authCode}`
      },
      timeout: 30000
    });

    console.log('   ✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    return true;

  } catch (error) {
    console.log('   ❌ Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Message:', error.message);
    }
    console.log('');
    return false;
  }
}

/**
 * Test 3: Alternative field names
 */
async function test3_AlternativeFields() {
  console.log('3️⃣  Test 3: Alternative field names');
  console.log('   Format: Using different field name variations');
  console.log('');

  const payload = {
    authentication_code: config.authCode,
    affiliate_code: config.affiliateCode,
    username: config.user,
    destination: config.testNumber,
    text: config.testMessage,
    type: 'SMS'
  };

  try {
    console.log('   📤 Sending request...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('   ✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    return true;

  } catch (error) {
    console.log('   ❌ Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Message:', error.message);
    }
    console.log('');
    return false;
  }
}

/**
 * Test 4: Minimal payload
 */
async function test4_MinimalPayload() {
  console.log('4️⃣  Test 4: Minimal payload');
  console.log('   Format: Only essential fields');
  console.log('');

  const payload = {
    authCode: config.authCode,
    msisdn: config.testNumber,
    message: config.testMessage
  };

  try {
    console.log('   📤 Sending request...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('   ✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    return true;

  } catch (error) {
    console.log('   ❌ Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Message:', error.message);
    }
    console.log('');
    return false;
  }
}

/**
 * Test 5: With additional metadata
 */
async function test5_WithMetadata() {
  console.log('5️⃣  Test 5: With additional metadata');
  console.log('   Format: Including optional fields');
  console.log('');

  const payload = {
    authCode: config.authCode,
    affiliateCode: config.affiliateCode,
    user: config.user,
    msisdn: config.testNumber,
    message: config.testMessage,
    messageType: 'SMS',
    reference: `TEST-${Date.now()}`,
    priority: 'normal',
    callback: 'https://your-domain.com/api/v1/sms-webhooks/delivery/json-applink'
  };

  try {
    console.log('   📤 Sending request...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(config.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('   ✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');
    return true;

  } catch (error) {
    console.log('   ❌ Error:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Message:', error.message);
    }
    console.log('');
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };

  results.test1 = await test1_BasicJsonPost();
  
  // Only continue if first test fails
  if (!results.test1) {
    results.test2 = await test2_WithAuthHeader();
    
    if (!results.test2) {
      results.test3 = await test3_AlternativeFields();
      
      if (!results.test3) {
        results.test4 = await test4_MinimalPayload();
        
        if (!results.test4) {
          results.test5 = await test5_WithMetadata();
        }
      }
    }
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  
  const successfulTests = Object.values(results).filter(r => r).length;
  
  if (successfulTests > 0) {
    console.log('✅ SUCCESS! SMS sent successfully!');
    console.log('');
    console.log('Working configuration:');
    if (results.test1) console.log('   ✅ Test 1: Basic JSON POST with authCode');
    if (results.test2) console.log('   ✅ Test 2: With Authentication Header');
    if (results.test3) console.log('   ✅ Test 3: Alternative field names');
    if (results.test4) console.log('   ✅ Test 4: Minimal payload');
    if (results.test5) console.log('   ✅ Test 5: With metadata');
    console.log('');
    console.log('📱 Check your phone (+27796222802) for the test SMS!');
  } else {
    console.log('❌ All tests failed');
    console.log('');
    console.log('Possible issues:');
    console.log('   1. Authentication code might be incorrect');
    console.log('   2. Affiliate code might be incorrect');
    console.log('   3. Account might not be activated');
    console.log('   4. API endpoint might have changed');
    console.log('   5. Network/firewall issues');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Verify credentials with JSON Applink support');
    console.log('   2. Check account status and credits');
    console.log('   3. Request API documentation');
    console.log('   4. Ask for a working code example');
  }
  
  console.log('');
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

