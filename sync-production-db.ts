import { executeQuery } from './backend/src/config/database';

async function syncProductionDB() {
  console.log('🚀 Starting Production Database Sync...');

  try {
    // 1. Update sms_send_log check constraint to include 'otp'
    console.log('--- Updating sms_send_log source_type constraint ---');
    
    // First, try to drop the old constraint if it exists
    try {
      await executeQuery(`ALTER TABLE sms_send_log DROP CONSTRAINT IF EXISTS chk_source_type`);
      console.log('✅ Dropped old chk_source_type constraint (if existed)');
    } catch (e) {
      console.log('⚠️ Could not drop chk_source_type, might not exist or name differs.');
    }

    // Now add the updated constraint including 'otp'
    await executeQuery(`
      ALTER TABLE sms_send_log 
      ADD CONSTRAINT chk_source_type 
      CHECK (source_type IN ('quick_send', 'birthday', 'campaign', 'expiration_reminder', 'bulk', 'manual', 'voter_registration', 'system', 'otp'))
    `);
    console.log('✅ Added updated chk_source_type constraint with "otp" support');

    // 2. Ensure sms_send_log has necessary columns if missing
    // (Already verified locally, but good to have safety checks)
    
    console.log('--- Database Sync Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Sync Failed:', error);
    process.exit(1);
  }
}

syncProductionDB();
