/**
 * Simple SMS Test Script
 * Run with: npx ts-node test/sms-test.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { SMSService } from '../src/services/smsService';

async function testSMS() {
  const testPhone = '+27796222802';
  const testMessage = 'Hello! This is a test SMS from EFF Membership System. If you received this, SMS integration is working correctly!';
  
  console.log('='.repeat(60));
  console.log('SMS TEST');
  console.log('='.repeat(60));
  console.log(`Target Phone: ${testPhone}`);
  console.log(`Message: ${testMessage}`);
  console.log('='.repeat(60));
  
  // Check provider
  const providerName = SMSService.getProviderName();
  console.log(`\nSMS Provider: ${providerName}`);
  
  // Check health
  try {
    const health = await SMSService.getProviderHealth();
    console.log(`Provider Health: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);
    console.log(`Health Message: ${health.message}`);
    if (health.latency) {
      console.log(`Latency: ${health.latency}ms`);
    }
  } catch (err: any) {
    console.log(`Health check failed: ${err.message}`);
  }
  
  console.log('\n--- Sending SMS ---\n');
  
  try {
    const result = await SMSService.sendSMS(testPhone, testMessage, 'EFF');
    
    console.log('Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Provider: ${result.provider}`);
    if (result.messageId) {
      console.log(`  Message ID: ${result.messageId}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    
    if (result.success) {
      console.log('\n✅ SMS sent successfully! Check your phone.');
    } else {
      console.log('\n❌ SMS sending failed.');
    }
  } catch (err: any) {
    console.error('\n❌ Error sending SMS:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

testSMS().catch(console.error);

