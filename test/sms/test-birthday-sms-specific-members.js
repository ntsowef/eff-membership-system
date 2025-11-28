/**
 * Test Birthday SMS for Specific Members
 * 
 * Sends birthday SMS to:
 * - Frans (079622282) - Setswana
 * - NOKO (0769309652) - Sepedi
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

// JSON Applink SMS API Configuration (GVI Vine Format)
const SMS_API_URL = process.env.JSON_APPLINK_API_URL || 'https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/';
const SMS_AUTH_CODE = process.env.JSON_APPLINK_AUTH_CODE || 'EFFAPPLINK';
const SMS_AFFILIATE_CODE = process.env.JSON_APPLINK_AFFILIATE_CODE || 'INT001-1161-001';
const SMS_USER = process.env.JSON_APPLINK_USER || 'AppLink';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Test Birthday SMS - Specific Members                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function sendBirthdaySMS() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Test recipients
    const testRecipients = [
      {
        name: 'Frans',
        phone: '0796222802',
        language: 'Setswana',
        language_code: 'tn'
      },
      {
        name: 'NOKO',
        phone: '0659942303',
        language: 'Sepedi',
        language_code: 'nso'
      }
    ];

    console.log('📋 Test Recipients:\n');
    testRecipients.forEach((recipient, index) => {
      console.log(`   ${index + 1}. ${recipient.name}`);
      console.log(`      Phone: ${recipient.phone}`);
      console.log(`      Language: ${recipient.language} (${recipient.language_code})`);
      console.log('');
    });

    // Get birthday message templates
    console.log('1️⃣  Fetching Birthday Message Templates:\n');
    
    const templatesQuery = await client.query(`
      SELECT 
        language_code,
        language_name,
        message_template
      FROM birthday_message_templates
      WHERE language_code IN ('tn', 'nso')
      ORDER BY language_code
    `);

    if (templatesQuery.rows.length === 0) {
      console.log('   ❌ No birthday message templates found!');
      console.log('   Please run: node scripts/execute-sql-file.js database-recovery/create-multilingual-birthday-messages.sql\n');
      client.release();
      await pool.end();
      return;
    }

    console.log(`   Found ${templatesQuery.rows.length} templates:\n`);
    templatesQuery.rows.forEach(template => {
      console.log(`   ${template.language_name} (${template.language_code}):`);
      console.log(`      "${template.message_template}"`);
      console.log('');
    });

    // Create personalized messages
    console.log('2️⃣  Creating Personalized Messages:\n');
    
    const messages = testRecipients.map(recipient => {
      const template = templatesQuery.rows.find(t => t.language_code === recipient.language_code);
      
      if (!template) {
        console.log(`   ⚠️  No template found for ${recipient.language}, using English`);
        return {
          ...recipient,
          message: `Happy Birthday ${recipient.name}! Wishing you a wonderful day filled with joy and happiness. - EFF`
        };
      }

      // Replace {firstname} placeholder with actual name
      const personalizedMessage = template.message_template.replace('{firstname}', recipient.name);
      
      return {
        ...recipient,
        message: personalizedMessage,
        template_language: template.language_name
      };
    });

    messages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.name} (${msg.phone})`);
      console.log(`      Language: ${msg.template_language || msg.language}`);
      console.log(`      Message: "${msg.message}"`);
      console.log('');
    });

    // Send SMS messages
    console.log('3️⃣  Sending Birthday SMS Messages:\n');
    
    const results = [];

    for (const msg of messages) {
      console.log(`   Sending to ${msg.name} (${msg.phone})...`);
      
      try {
        // Prepare SMS payload (CORRECT GVI Vine JSON Applink format)
        const smsPayload = {
          "affiliateCode": SMS_AFFILIATE_CODE,
          "authenticationCode": SMS_AUTH_CODE,
          "submitDateTime": new Date().toISOString(),
          "messageType": "text",
          "recipientList": {
            "recipient": [
              {
                "msisdn": msg.phone,
                "message": msg.message
              }
            ]
          }
        };

        console.log(`   Payload:`, JSON.stringify(smsPayload, null, 2));

        // Send SMS via JSON Applink API
        const response = await axios.post(SMS_API_URL, smsPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        console.log(`   Response Status: ${response.status}`);
        console.log(`   Response Data:`, JSON.stringify(response.data, null, 2));

        // Parse response (JSON format)
        let status = 'unknown';
        let messageId = null;
        let errorMessage = null;

        if (response.data) {
          // Check for success (resultCode 0 means success)
          if (response.data.resultCode === 0 || response.data.resultCode === '0') {
            status = 'sent';
            messageId = response.data.messageId || response.data.id || response.data.reference;
          } else if (response.data.resultCode === 1 || response.data.resultText?.includes('Failed')) {
            status = 'failed';
            errorMessage = response.data.resultText || 'Authentication failed';
          } else if (response.status === 200 && !response.data.resultText?.includes('Failed')) {
            status = 'sent';
            messageId = response.data.messageId || response.data.id;
          } else {
            status = 'failed';
            errorMessage = response.data.resultText || 'Unknown error';
          }
        }

        results.push({
          name: msg.name,
          phone: msg.phone,
          language: msg.template_language || msg.language,
          status: status,
          messageId: messageId,
          error: errorMessage
        });

        console.log(`   ✅ Status: ${status}`);
        if (messageId) {
          console.log(`   Message ID: ${messageId}`);
        }
        if (errorMessage) {
          console.log(`   Error: ${errorMessage}`);
        }
        console.log('');

        // Wait 1 second between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log(`   ❌ Error sending SMS: ${error.message}`);
        
        if (error.response) {
          console.log(`   Response Status: ${error.response.status}`);
          console.log(`   Response Data:`, error.response.data);
        }

        results.push({
          name: msg.name,
          phone: msg.phone,
          language: msg.template_language || msg.language,
          status: 'failed',
          error: error.message
        });

        console.log('');
      }
    }

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    
    const successCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`📊 Results:`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Sent: ${successCount} ✅`);
    console.log(`   Failed: ${failedCount} ❌`);
    console.log('');

    console.log('📋 Details:\n');
    results.forEach((result, index) => {
      const icon = result.status === 'sent' ? '✅' : '❌';
      console.log(`   ${icon} ${result.name} (${result.phone})`);
      console.log(`      Language: ${result.language}`);
      console.log(`      Status: ${result.status}`);
      if (result.messageId) {
        console.log(`      Message ID: ${result.messageId}`);
      }
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      console.log('');
    });

    console.log('💡 Notes:');
    console.log('   - Check SMS provider dashboard for delivery status');
    console.log('   - Delivery reports will be received via webhook');
    console.log('   - Messages sent using GVI Vine JSON Applink API');
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

sendBirthdaySMS();

