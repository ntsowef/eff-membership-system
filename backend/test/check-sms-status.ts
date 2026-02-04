/**
 * Check SMS Delivery Status Script
 * Run with: npx ts-node test/check-sms-status.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initializeDatabase, executeQuery } from '../src/config/database';
import { SMSDeliveryTrackingService } from '../src/services/smsDeliveryTrackingService';

async function checkSMSStatus() {
  // Initialize database connection
  await initializeDatabase();
  const messageId = process.argv[2] || 'eff_1770050225170';
  
  console.log('='.repeat(60));
  console.log('SMS DELIVERY STATUS CHECK');
  console.log('='.repeat(60));
  console.log(`Message ID: ${messageId}`);
  console.log('='.repeat(60));
  
  try {
    // Check delivery tracking table
    console.log('\n--- Checking sms_delivery_tracking table ---\n');
    const deliveryStatus = await SMSDeliveryTrackingService.getDeliveryStatus(messageId);
    
    if (deliveryStatus) {
      console.log('Delivery Status Found:');
      console.log(`  Message ID: ${deliveryStatus.message_id}`);
      console.log(`  Provider Message ID: ${deliveryStatus.provider_message_id}`);
      console.log(`  Status: ${deliveryStatus.status}`);
      console.log(`  Delivery Timestamp: ${deliveryStatus.delivery_timestamp || 'N/A'}`);
      console.log(`  Error Code: ${deliveryStatus.error_code || 'N/A'}`);
      console.log(`  Error Message: ${deliveryStatus.error_message || 'N/A'}`);
      console.log(`  Retry Count: ${deliveryStatus.retry_count}`);
      console.log(`  Cost: ${deliveryStatus.cost || 'N/A'}`);
    } else {
      console.log('No delivery tracking record found for this message ID.');
      console.log('This could mean:');
      console.log('  1. The message was not tracked after sending');
      console.log('  2. No webhook callback has been received yet from JSON Applink');
    }
    
    // Check webhook logs
    console.log('\n--- Checking sms_webhook_log table ---\n');
    const webhookLogs = await executeQuery(`
      SELECT id, provider_name, processed_successfully, message_id, 
             received_at, processed_at, response_status
      FROM sms_webhook_log
      WHERE message_id = $1 OR received_at >= NOW() - INTERVAL '1 hour'
      ORDER BY received_at DESC
      LIMIT 10
    `, [messageId]);
    
    if (webhookLogs && webhookLogs.length > 0) {
      console.log(`Found ${webhookLogs.length} recent webhook log(s):`);
      webhookLogs.forEach((log: any, index: number) => {
        console.log(`\n  [${index + 1}] ID: ${log.id}`);
        console.log(`      Provider: ${log.provider_name}`);
        console.log(`      Message ID: ${log.message_id || 'N/A'}`);
        console.log(`      Processed: ${log.processed_successfully ? 'Yes' : 'No'}`);
        console.log(`      Received: ${log.received_at}`);
        console.log(`      Response Status: ${log.response_status || 'N/A'}`);
      });
    } else {
      console.log('No webhook logs found.');
      console.log('This means JSON Applink has not sent any delivery callbacks yet.');
    }
    
    // Get overall delivery statistics
    console.log('\n--- Recent Delivery Statistics ---\n');
    const stats = await SMSDeliveryTrackingService.getDeliveryStatistics('hour');
    console.log('Last Hour Statistics:');
    console.log(`  Total Messages: ${stats.total_messages}`);
    console.log(`  Delivered: ${stats.delivered}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Delivery Rate: ${stats.delivery_rate}%`);
    
  } catch (err: any) {
    console.error('\n❌ Error checking SMS status:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

checkSMSStatus();

