/**
 * Simple JSON Applink SMS Test
 * Tests sending SMS using native https module (no dependencies)
 */

const https = require('https');

// Configuration
const config = {
  apiUrl: 'https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/',
  authCode: 'EFFAPPLINK',
  affiliateCode: 'INT001-1161-001',
  user: 'AppLink',
  testNumber: '+27796222802',
  testMessage: 'Test SMS from EFF Membership System. This is a test message sent at ' + new Date().toLocaleString()
};

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   JSON Applink SMS Test (Simple)                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   API URL: ${config.apiUrl}`);
console.log(`   Auth Code: ${config.authCode}`);
console.log(`   Affiliate Code: ${config.affiliateCode}`);
console.log(`   User: ${config.user}`);
console.log(`   Test Number: ${config.testNumber}`);
console.log('');

// Payload
const payload = {
  authCode: config.authCode,
  affiliateCode: config.affiliateCode,
  user: config.user,
  msisdn: config.testNumber,
  message: config.testMessage,
  messageType: 'SMS'
};

console.log('📤 Payload:');
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
  console.log(`   Headers:`, JSON.stringify(res.headers, null, 2));
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
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('═'.repeat(60));
        console.log('✅ SUCCESS! SMS sent successfully!');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📱 Check your phone (+27796222802) for the test SMS!');
        console.log('');
        
        if (jsonData.messageId || jsonData.id || jsonData.reference) {
          console.log('📋 Message Details:');
          console.log(`   Message ID: ${jsonData.messageId || jsonData.id || jsonData.reference}`);
        }
      } else {
        console.log('═'.repeat(60));
        console.log('⚠️  Request completed but with non-success status');
        console.log('═'.repeat(60));
        console.log('');
        console.log('Response indicates:');
        console.log(JSON.stringify(jsonData, null, 2));
      }
    } catch (e) {
      // Not JSON, might be XML
      console.log('📄 Response is not JSON (might be XML):');
      console.log(data);
      console.log('');

      // Check if it's an error
      if (data.includes('error') || data.includes('Error') || data.includes('failed') || data.includes('Failed')) {
        console.log('═'.repeat(60));
        console.log('❌ ERROR: Request failed');
        console.log('═'.repeat(60));
        console.log('');
        console.log('Possible issues:');
        console.log('   1. Authentication code might be incorrect');
        console.log('   2. Affiliate code might be incorrect');
        console.log('   3. Account might not be activated');
        console.log('   4. Insufficient credits');
        console.log('');
      } else if (res.statusCode === 200) {
        console.log('═'.repeat(60));
        console.log('✅ Request successful (200 OK)');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📱 Check your phone (+27796222802) for the test SMS!');
        console.log('');
      }
    }
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
    console.log('   3. No firewall blocking the request');
  } else if (error.code === 'ECONNREFUSED') {
    console.log('Connection refused. Check:');
    console.log('   1. API endpoint is correct');
    console.log('   2. Service is running');
    console.log('   3. Port is correct (443 for HTTPS)');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('Request timed out. Check:');
    console.log('   1. Internet connection');
    console.log('   2. API service availability');
    console.log('   3. Firewall settings');
  }
  console.log('');
});

// Write data to request body
req.write(payloadString);
req.end();

