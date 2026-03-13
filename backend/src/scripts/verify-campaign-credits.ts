import { executeQuery, executeQuerySingle, initializeDatabase } from '../config/database-hybrid';
import { NotificationModel } from '../models/notifications';
import { SMSCreditService } from '../services/smsCreditService';

async function verifyCampaignCredits() {
  console.log('🧪 Starting Campaign Credit Verification...');

  try {
    // Initialize DB
    await initializeDatabase();
    // 1. Setup - Ensure we have a member with a phone number and some credits
    const member = await executeQuerySingle(`
      SELECT member_id, cell_number FROM members_consolidated 
      WHERE cell_number IS NOT NULL AND cell_number != '' 
      LIMIT 1
    `);

    if (!member) {
      console.error('❌ No member with phone number found for testing.');
      return;
    }

    // Ensure initial credits
    const balanceExists = await executeQuerySingle(`SELECT id FROM sms_credit_balance LIMIT 1`);
    if (!balanceExists) {
      await executeQuery(`
        INSERT INTO sms_credit_balance (credits_remaining, total_purchased, updated_at) 
        VALUES (100, 100, NOW())
      `);
      console.log('✅ Created initial credit balance row.');
    } else {
      await executeQuery(`
        UPDATE sms_credit_balance 
        SET credits_remaining = credits_remaining + 100,
            updated_at = NOW()
      `);
      console.log('✅ Added 100 credits to existing balance.');
    }

    const balanceObj = await SMSCreditService.getBalance();
    const initialBalance = balanceObj?.credits_remaining || 0;
    console.log(`💰 Initial Balance: ${initialBalance}`);

    // 2. Create a campaign notification
    console.log('📝 Creating mock campaign notification...');
    const notificationId = await NotificationModel.createNotification({
      member_id: member.member_id,
      recipient_type: 'Member',
      notification_type: 'System',
      delivery_channel: 'SMS',
      title: 'Campaign Test',
      message: 'This is a test campaign message for credit verification.',
      send_immediately: false // We'll send it manually to control the flow
    });

    console.log(`✅ Notification created with ID: ${notificationId}`);

    // 3. Send the notification
    console.log('🚀 Sending notification...');
    const success = await NotificationModel.sendNotification(notificationId);

    if (success) {
      console.log('✅ Notification sent successfully.');
    } else {
      console.warn('⚠️ Notification send failed (this might happen if SMS_ENABLED is false, but check logs).');
    }

    // 4. Verify credit deduction
    const finalBalanceObj = await SMSCreditService.getBalance();
    const finalBalance = finalBalanceObj?.credits_remaining || 0;
    console.log(`💰 Final Balance: ${finalBalance}`);

    if (finalBalance === initialBalance - 1) {
      console.log('🎉 SUCCESS: 1 credit was deducted correctly for the campaign message.');
    } else if (finalBalance === initialBalance) {
      console.warn('⚠️ No credit was deducted. Check if SMSService.sendSMS was actually called or if it failed before deduction.');
    } else {
      console.error(`❌ Unexpected balance change. Diff: ${initialBalance - finalBalance}`);
    }

    // 5. Check logs
    const log = await executeQuerySingle(`
      SELECT * FROM sms_send_log WHERE source_type = 'system' ORDER BY created_at DESC LIMIT 1
    `);
    if (log) {
      console.log(`📝 Log entry found: ${log.message_id} (Status: ${log.status})`);
    } else {
      console.error('❌ No log entry found in sms_send_log for source "system".');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyCampaignCredits();
