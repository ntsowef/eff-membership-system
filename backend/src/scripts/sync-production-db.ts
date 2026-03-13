import { executeQuery, initializeDatabase } from '../config/database-hybrid';

async function syncProductionDb() {
  console.log('🔄 Starting Production Database Sync...');

  try {
    await initializeDatabase();

    // 1. Update chk_source_type constraint on sms_send_log to include 'otp'
    console.log('📦 Updating sms_send_log constraints...');
    
    // First, check if the constraint exists
    const constraints = await executeQuery(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'chk_source_type'
    `);

    if (constraints.length > 0) {
      console.log('🗑️ Dropping existing chk_source_type constraint...');
      await executeQuery('ALTER TABLE sms_send_log DROP CONSTRAINT chk_source_type');
    }

    console.log('➕ Adding updated chk_source_type constraint (including otp and others)...');
    await executeQuery(`
      ALTER TABLE sms_send_log 
      ADD CONSTRAINT chk_source_type 
      CHECK (source_type IN ('bulk', 'campaign', 'single', 'birthday', 'system', 'otp', 'expiration_reminder', 'manual', 'quick_send', 'voter_registration'))
    `);

    console.log('✅ Production Database Sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Production Database Sync failed:', error);
    process.exit(1);
  }
}

syncProductionDb();
