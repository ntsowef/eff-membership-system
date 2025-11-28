/**
 * SMS Webhook Endpoint Test
 * 
 * Tests the JSON Applink webhook endpoint to verify it can receive
 * and process delivery status callbacks
 * 
 * Endpoint: POST http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  webhookUrl: 'http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink',
  testWebhookUrl: 'http://localhost:8000/api/v1/sms-webhooks/test/json-applink'
};

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   SMS Webhook Endpoint Test                                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   Webhook URL: ${config.webhookUrl}`);
console.log(`   Test Webhook URL: ${config.testWebhookUrl}`);
console.log('');

/**
 * Test 1: Delivery Success Webhook
 */
async function test1_DeliverySuccess() {
  console.log('1️⃣  Test 1: Delivery Success Webhook');
  console.log('   Simulating successful SMS delivery callback');
  console.log('');

  const payload = {
    reference: `eff_${Date.now()}_test123`,
    message_id: `msg_${Date.now()}`,
    tracking_id: `track_${Date.now()}`,
    status: 'delivered',
    delivery_status: 'delivered',
    delivered_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    msisdn: '+27796222802',
    cost: 0.15,
    price: 0.15
  };

  return sendWebhook(config.webhookUrl, payload, 'Delivery Success');
}

/**
 * Test 2: Delivery Failed Webhook
 */
async function test2_DeliveryFailed() {
  console.log('2️⃣  Test 2: Delivery Failed Webhook');
  console.log('   Simulating failed SMS delivery callback');
  console.log('');

  const payload = {
    reference: `eff_${Date.now()}_test456`,
    message_id: `msg_${Date.now()}`,
    tracking_id: `track_${Date.now()}`,
    status: 'failed',
    delivery_status: 'failed',
    error_code: 'INVALID_NUMBER',
    error_message: 'Invalid phone number format',
    failure_code: 'INVALID_NUMBER',
    failure_reason: 'Invalid phone number format',
    timestamp: new Date().toISOString(),
    msisdn: '+27796222802',
    cost: 0
  };

  return sendWebhook(config.webhookUrl, payload, 'Delivery Failed');
}

/**
 * Test 3: Delivery Pending Webhook
 */
async function test3_DeliveryPending() {
  console.log('3️⃣  Test 3: Delivery Pending Webhook');
  console.log('   Simulating pending SMS delivery callback');
  console.log('');

  const payload = {
    reference: `eff_${Date.now()}_test789`,
    message_id: `msg_${Date.now()}`,
    tracking_id: `track_${Date.now()}`,
    status: 'pending',
    delivery_status: 'pending',
    timestamp: new Date().toISOString(),
    msisdn: '+27796222802'
  };

  return sendWebhook(config.webhookUrl, payload, 'Delivery Pending');
}

/**
 * Test 4: Test Webhook Endpoint (No Auth Required)
 */
async function test4_TestEndpoint() {
  console.log('4️⃣  Test 4: Test Webhook Endpoint');
  console.log('   Testing the dedicated test webhook endpoint');
  console.log('');

  const payload = {
    message_id: `test_${Date.now()}`,
    status: 'delivered',
    custom_data: 'This is a test webhook'
  };

  return sendWebhook(config.testWebhookUrl, payload, 'Test Endpoint');
}

/**
 * Test 5: Minimal Payload
 */
async function test5_MinimalPayload() {
  console.log('5️⃣  Test 5: Minimal Payload');
  console.log('   Testing with minimal required fields');
  console.log('');

  const payload = {
    message_id: `msg_${Date.now()}`,
    status: 'delivered'
  };

  return sendWebhook(config.webhookUrl, payload, 'Minimal Payload');
}

/**
 * Helper function to send webhook
 */
function sendWebhook(url, payload, testName) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const payloadString = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 8000,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'Accept': 'application/json',
        'User-Agent': 'JSON-Applink-Webhook/1.0'
      }
    };

    console.log('   📤 Sending webhook...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const req = http.request(options, (res) => {
      console.log(`   ✅ Response received:`);
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log('');

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('   📥 Response Body:');
        console.log(data);
        console.log('');

        try {
          const jsonData = JSON.parse(data);
          console.log('   📊 Parsed JSON:');
          console.log(JSON.stringify(jsonData, null, 2));
          console.log('');

          if (res.statusCode === 200 && jsonData.success) {
            console.log('   ═'.repeat(30));
            console.log(`   ✅ ${testName} - SUCCESS!`);
            console.log('   ═'.repeat(30));
            console.log('');
            resolve(true);
          } else {
            console.log('   ═'.repeat(30));
            console.log(`   ⚠️  ${testName} - Unexpected Response`);
            console.log('   ═'.repeat(30));
            console.log('');
            resolve(false);
          }
        } catch (e) {
          console.log('   📄 Response is not JSON:');
          console.log(data);
          console.log('');
          
          if (res.statusCode === 200) {
            console.log('   ═'.repeat(30));
            console.log(`   ✅ ${testName} - SUCCESS (200 OK)`);
            console.log('   ═'.repeat(30));
            console.log('');
            resolve(true);
          } else {
            console.log('   ═'.repeat(30));
            console.log(`   ❌ ${testName} - FAILED`);
            console.log('   ═'.repeat(30));
            console.log('');
            resolve(false);
          }
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ═'.repeat(30));
      console.log(`   ❌ ${testName} - ERROR`);
      console.log('   ═'.repeat(30));
      console.log('');
      console.log('   Error details:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log('');
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Backend server is not running!');
        console.log('   Start the backend with: cd backend && npm run dev');
      }
      console.log('');
      
      resolve(false);
    });

    req.write(payloadString);
    req.end();
  });
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

  results.test1 = await test1_DeliverySuccess();
  results.test2 = await test2_DeliveryFailed();
  results.test3 = await test3_DeliveryPending();
  results.test4 = await test4_TestEndpoint();
  results.test5 = await test5_MinimalPayload();

  // Summary
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  
  const successfulTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`Tests Passed: ${successfulTests}/${totalTests}`);
  console.log('');
  
  if (results.test1) console.log('   ✅ Test 1: Delivery Success');
  else console.log('   ❌ Test 1: Delivery Success');
  
  if (results.test2) console.log('   ✅ Test 2: Delivery Failed');
  else console.log('   ❌ Test 2: Delivery Failed');
  
  if (results.test3) console.log('   ✅ Test 3: Delivery Pending');
  else console.log('   ❌ Test 3: Delivery Pending');
  
  if (results.test4) console.log('   ✅ Test 4: Test Endpoint');
  else console.log('   ❌ Test 4: Test Endpoint');
  
  if (results.test5) console.log('   ✅ Test 5: Minimal Payload');
  else console.log('   ❌ Test 5: Minimal Payload');
  
  console.log('');
  
  if (successfulTests === totalTests) {
    console.log('🎉 All webhook tests passed!');
    console.log('');
    console.log('✅ Webhook endpoint is working correctly');
    console.log('✅ Ready to receive delivery status callbacks from JSON Applink');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Configure JSON Applink to send callbacks to:');
    console.log('      http://your-domain.com/api/v1/sms-webhooks/delivery/json-applink');
    console.log('   2. For local testing, use ngrok or similar:');
    console.log('      ngrok http 8000');
    console.log('   3. Monitor webhook logs:');
    console.log('      GET /api/v1/sms-webhooks/logs');
  } else {
    console.log('⚠️  Some webhook tests failed');
    console.log('');
    console.log('Possible issues:');
    console.log('   1. Backend server not running (cd backend && npm run dev)');
    console.log('   2. Database connection issues');
    console.log('   3. Missing database tables (sms_webhook_log)');
    console.log('   4. Port 8000 not accessible');
  }
  
  console.log('');
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

