/**
 * JSON Applink SMS Test - Correct Payload Format
 * 
 * Tests with the correct payload structure:
 * - affiliateCode (not affiliate_code)
 * - authenticationCode (not authCode)
 * - submitDateTime
 * - recipientList with nested recipient array
 */

const https = require('https');

// Configuration
const config = {
  apiUrl: 'https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/',
  authenticationCode: 'EFFAPPLINK',
  affiliateCode: 'INT001-1161-001',
  testNumber: '+27796222802',
  testMessage: 'Test SMS from EFF Membership System. Sent at ' + new Date().toLocaleString()
};

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   JSON Applink SMS Test - CORRECT PAYLOAD FORMAT          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   API URL: ${config.apiUrl}`);
console.log(`   Authentication Code: ${config.authenticationCode}`);
console.log(`   Affiliate Code: ${config.affiliateCode}`);
console.log(`   Test Number: ${config.testNumber}`);
console.log('');

// Get current datetime in ISO format
const submitDateTime = new Date().toISOString();

// Correct payload format
const payload = {
  "affiliateCode": config.affiliateCode,
  "authenticationCode": config.authenticationCode,
  "submitDateTime": submitDateTime,
  "messageType": "text",
  "recipientList": {
    "recipient": [
      {
        "msisdn": config.testNumber,
        "message": config.testMessage
      }
    ]
  }
};

console.log('📤 Payload (CORRECT FORMAT):');
console.log(JSON.stringify(payload, null, 2));
console.log('');

const payloadString = JSON.stringify(payload);

// Parse URL
const url = new URL(config.apiUrl);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString),
    'Accept': 'application/json'
  }
};

console.log('🚀 Sending request...');
console.log('');

const req = https.request(options, (res) => {
  console.log(`✅ Response received:`);
  console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response Body:');
    console.log(data);
    console.log('');

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(data);
      console.log('📊 Parsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
      console.log('');

      // Check for success
      if (jsonData.resultCode === 0 || jsonData.resultCode === '0' || 
          jsonData.status === 'success' || jsonData.success === true ||
          (res.statusCode === 200 && !jsonData.resultText?.includes('Failed'))) {
        
        console.log('═'.repeat(60));
        console.log('✅ SUCCESS! SMS SENT SUCCESSFULLY!');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📱 Check your phone (+27796222802) for the test SMS!');
        console.log('');
        
        if (jsonData.messageId || jsonData.id || jsonData.reference) {
          console.log('📋 Message Details:');
          console.log(`   Message ID: ${jsonData.messageId || jsonData.id || jsonData.reference}`);
        }
        
        if (jsonData.resultText) {
          console.log(`   Result: ${jsonData.resultText}`);
        }
        
      } else if (jsonData.resultCode === 1 || jsonData.resultText?.includes('Failed')) {
        console.log('═'.repeat(60));
        console.log('❌ ERROR: Authentication or request failed');
        console.log('═'.repeat(60));
        console.log('');
        console.log(`Result Code: ${jsonData.resultCode}`);
        console.log(`Result Text: ${jsonData.resultText}`);
        console.log('');
        
        if (jsonData.resultText?.includes('Authentication')) {
          console.log('⚠️  Authentication Issue:');
          console.log('   - Verify authenticationCode is correct: EFFAPPLINK');
          console.log('   - Verify affiliateCode is correct: INT001-1161-001');
          console.log('   - Check if account is activated');
          console.log('   - Contact JSON Applink support');
        }
      } else {
        console.log('═'.repeat(60));
        console.log('⚠️  Unexpected response');
        console.log('═'.repeat(60));
        console.log('');
        console.log('Response:', JSON.stringify(jsonData, null, 2));
      }
      
    } catch (e) {
      // Not JSON
      console.log('📄 Response is not JSON:');
      console.log(data);
      console.log('');

      if (data.includes('error') || data.includes('Error') || data.includes('failed') || data.includes('Failed')) {
        console.log('═'.repeat(60));
        console.log('❌ ERROR: Request failed');
        console.log('═'.repeat(60));
      } else if (res.statusCode === 200) {
        console.log('═'.repeat(60));
        console.log('✅ Request successful (200 OK)');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📱 Check your phone (+27796222802) for the test SMS!');
      }
    }
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('KEY DIFFERENCES FROM PREVIOUS ATTEMPTS:');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ Using "authenticationCode" (not "authCode")');
    console.log('✅ Using "affiliateCode" (correct casing)');
    console.log('✅ Added "submitDateTime" field');
    console.log('✅ Using "messageType": "text"');
    console.log('✅ Using nested "recipientList" > "recipient" array structure');
    console.log('✅ Each recipient has "msisdn" and "message" fields');
    console.log('');
  });
});

req.on('error', (error) => {
  console.log('═'.repeat(60));
  console.log('❌ ERROR: Request failed');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Error details:');
  console.log(`   Message: ${error.message}`);
  console.log(`   Code: ${error.code}`);
  console.log('');
  
  if (error.code === 'ENOTFOUND') {
    console.log('DNS lookup failed. Check:');
    console.log('   1. Internet connection');
    console.log('   2. API URL is correct');
  } else if (error.code === 'ECONNREFUSED') {
    console.log('Connection refused. Check:');
    console.log('   1. API endpoint is correct');
    console.log('   2. Service is running');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('Request timed out. Check:');
    console.log('   1. Internet connection');
    console.log('   2. API service availability');
  }
  console.log('');
});

// Write data to request body
req.write(payloadString);
req.end();

