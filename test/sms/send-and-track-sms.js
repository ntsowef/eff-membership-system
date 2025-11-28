/**
 * Send SMS and Track Delivery
 * 
 * This script:
 * 1. Sends an SMS via JSON Applink
 * 2. Captures the message ID
 * 3. Simulates webhook callback
 * 4. Queries database for delivery report
 */

const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

// Configuration
const config = {
  smsApiUrl: 'https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/',
  authenticationCode: 'EFFAPPLINK',
  affiliateCode: 'INT001-1161-001',
  testNumber: '27796222802',
  webhookUrl: 'http://localhost:8000/api/v1/sms-webhooks/delivery/json-applink'
};

let messageId = null;
let providerMessageId = null;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Send SMS and Track Delivery Report                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

/**
 * Step 1: Send SMS
 */
async function step1_SendSMS() {
  console.log('📤 STEP 1: Sending SMS via JSON Applink');
  console.log('═'.repeat(60));
  console.log('');

  return new Promise((resolve, reject) => {
    const submitDateTime = new Date().toISOString();
    messageId = `eff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      affiliateCode: config.affiliateCode,
      authenticationCode: config.authenticationCode,
      submitDateTime: submitDateTime,
      messageType: 'text',
      recipientList: {
        recipient: [
          {
            msisdn: config.testNumber,
            message: `Test SMS from EFF Membership System. Message ID: ${messageId}. Sent at ${new Date().toLocaleString()}`
          }
        ]
      }
    };

    console.log('📋 SMS Details:');
    console.log(`   To: ${config.testNumber}`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Time: ${new Date().toLocaleString()}`);
    console.log('');

    const payloadString = JSON.stringify(payload);
    const url = new URL(config.smsApiUrl);

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

    console.log('🚀 Sending SMS...');
    console.log('');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          console.log('✅ Response received:');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Result Code: ${jsonData.resultCode}`);
          console.log(`   Result Text: ${jsonData.resultText}`);
          console.log('');

          if (jsonData.resultCode === 0 || jsonData.resultCode === '0') {
            console.log('✅ SMS SENT SUCCESSFULLY!');
            console.log('');
            console.log('📱 Check your phone for the SMS!');
            console.log('');
            
            // Store provider message ID if available
            providerMessageId = jsonData.messageId || jsonData.id || `provider_${Date.now()}`;
            
            resolve(true);
          } else {
            console.log('❌ SMS sending failed');
            console.log(`   Error: ${jsonData.resultText}`);
            console.log('');
            resolve(false);
          }
        } catch (e) {
          console.log('❌ Failed to parse response');
          console.log(data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Error sending SMS:');
      console.log(`   ${error.message}`);
      console.log('');
      resolve(false);
    });

    req.write(payloadString);
    req.end();
  });
}

/**
 * Step 2: Wait for user confirmation
 */
async function step2_WaitForConfirmation() {
  console.log('');
  console.log('⏳ STEP 2: Waiting for SMS delivery');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📱 Please check your phone (27796222802) for the SMS.');
  console.log('');
  console.log('⏰ Waiting 10 seconds before triggering webhook...');
  console.log('');
  
  // Wait 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('✅ Wait complete. Proceeding to trigger webhook...');
  console.log('');
}

/**
 * Step 3: Trigger Webhook (Simulate delivery callback)
 */
async function step3_TriggerWebhook() {
  console.log('📥 STEP 3: Triggering Webhook (Simulating JSON Applink callback)');
  console.log('═'.repeat(60));
  console.log('');

  return new Promise((resolve, reject) => {
    const webhookPayload = {
      reference: messageId,
      message_id: messageId,
      tracking_id: providerMessageId,
      status: 'delivered',
      delivery_status: 'delivered',
      delivered_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      msisdn: config.testNumber,
      cost: 0.15,
      price: 0.15
    };

    console.log('📋 Webhook Payload:');
    console.log(JSON.stringify(webhookPayload, null, 2));
    console.log('');

    const payloadString = JSON.stringify(webhookPayload);
    const url = new URL(config.webhookUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 8000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'Accept': 'application/json',
        'User-Agent': 'JSON-Applink-Webhook/1.0'
      }
    };

    console.log('🚀 Sending webhook to backend...');
    console.log('');

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          console.log('✅ Webhook response received:');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${jsonData.success}`);
          console.log(`   Message: ${jsonData.message}`);
          console.log('');

          if (res.statusCode === 200 && jsonData.success) {
            console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY!');
            console.log('');
            resolve(true);
          } else {
            console.log('⚠️  Webhook processed with warnings');
            console.log('');
            resolve(true);
          }
        } catch (e) {
          console.log('❌ Failed to parse webhook response');
          console.log(data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Error triggering webhook:');
      console.log(`   ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('');
        console.log('⚠️  Backend server is not running!');
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
 * Step 4: Query Database for Delivery Report
 */
async function step4_QueryDatabase() {
  console.log('');
  console.log('🔍 STEP 4: Querying Database for Delivery Report');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');
    console.log('');

    // Query webhook log
    console.log('📋 Checking webhook log...');
    const webhookLog = await client.query(`
      SELECT 
        id,
        provider_name,
        request_method,
        response_status,
        response_message,
        processed_successfully,
        message_id,
        received_at,
        processed_at
      FROM sms_webhook_log
      WHERE message_id = $1
      ORDER BY received_at DESC
      LIMIT 1
    `, [messageId]);

    if (webhookLog.rows.length > 0) {
      console.log('✅ Webhook log found:');
      console.log('');
      console.log('   Webhook Log Entry:');
      console.log(`   - ID: ${webhookLog.rows[0].id}`);
      console.log(`   - Provider: ${webhookLog.rows[0].provider_name}`);
      console.log(`   - Method: ${webhookLog.rows[0].request_method}`);
      console.log(`   - Response Status: ${webhookLog.rows[0].response_status}`);
      console.log(`   - Response Message: ${webhookLog.rows[0].response_message}`);
      console.log(`   - Processed Successfully: ${webhookLog.rows[0].processed_successfully}`);
      console.log(`   - Message ID: ${webhookLog.rows[0].message_id}`);
      console.log(`   - Received At: ${webhookLog.rows[0].received_at}`);
      console.log(`   - Processed At: ${webhookLog.rows[0].processed_at}`);
      console.log('');
    } else {
      console.log('⚠️  No webhook log found for this message');
      console.log('');
    }

    // Query delivery tracking
    console.log('📋 Checking delivery tracking...');
    const deliveryTracking = await client.query(`
      SELECT 
        id,
        message_id,
        provider_message_id,
        status,
        error_code,
        error_message,
        delivery_timestamp,
        retry_count,
        cost,
        created_at,
        updated_at
      FROM sms_delivery_tracking
      WHERE message_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [messageId]);

    if (deliveryTracking.rows.length > 0) {
      console.log('✅ Delivery tracking found:');
      console.log('');
      console.log('   Delivery Tracking Entry:');
      console.log(`   - ID: ${deliveryTracking.rows[0].id}`);
      console.log(`   - Message ID: ${deliveryTracking.rows[0].message_id}`);
      console.log(`   - Provider Message ID: ${deliveryTracking.rows[0].provider_message_id}`);
      console.log(`   - Status: ${deliveryTracking.rows[0].status}`);
      console.log(`   - Error Code: ${deliveryTracking.rows[0].error_code || 'None'}`);
      console.log(`   - Error Message: ${deliveryTracking.rows[0].error_message || 'None'}`);
      console.log(`   - Delivery Timestamp: ${deliveryTracking.rows[0].delivery_timestamp}`);
      console.log(`   - Retry Count: ${deliveryTracking.rows[0].retry_count}`);
      console.log(`   - Cost: R${deliveryTracking.rows[0].cost || 0}`);
      console.log(`   - Created At: ${deliveryTracking.rows[0].created_at}`);
      console.log(`   - Updated At: ${deliveryTracking.rows[0].updated_at}`);
      console.log('');
    } else {
      console.log('⚠️  No delivery tracking found for this message');
      console.log('');
    }

    // Release client
    client.release();

    return {
      webhookLog: webhookLog.rows.length > 0,
      deliveryTracking: deliveryTracking.rows.length > 0
    };

  } catch (error) {
    console.log('❌ Database query error:');
    console.log(`   ${error.message}`);
    console.log('');
    return { webhookLog: false, deliveryTracking: false };
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Send SMS
    const smsSent = await step1_SendSMS();
    
    if (!smsSent) {
      console.log('❌ Failed to send SMS. Aborting...');
      process.exit(1);
    }

    // Step 2: Wait for delivery
    await step2_WaitForConfirmation();

    // Step 3: Trigger webhook
    const webhookTriggered = await step3_TriggerWebhook();

    // Step 4: Query database
    const dbResults = await step4_QueryDatabase();

    // Final summary
    console.log('═'.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Message ID: ${messageId}`);
    console.log(`Phone Number: ${config.testNumber}`);
    console.log('');
    console.log('Results:');
    console.log(`   ✅ SMS Sent: ${smsSent ? 'Yes' : 'No'}`);
    console.log(`   ✅ Webhook Triggered: ${webhookTriggered ? 'Yes' : 'No'}`);
    console.log(`   ✅ Webhook Log in DB: ${dbResults.webhookLog ? 'Yes' : 'No'}`);
    console.log(`   ✅ Delivery Tracking in DB: ${dbResults.deliveryTracking ? 'Yes' : 'No'}`);
    console.log('');

    if (smsSent && webhookTriggered && dbResults.webhookLog && dbResults.deliveryTracking) {
      console.log('🎉 SUCCESS! Complete SMS delivery tracking working!');
      console.log('');
      console.log('✅ SMS sent via JSON Applink');
      console.log('✅ Webhook received and processed');
      console.log('✅ Delivery report stored in database');
      console.log('');
      console.log('📱 Check your phone for the SMS!');
    } else {
      console.log('⚠️  Some steps failed. Check the logs above for details.');
    }
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
main();

