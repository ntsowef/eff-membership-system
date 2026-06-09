import { executeQuery, initializeDatabase, closeDatabasePool } from '../src/config/database';

async function fixSMSCampaignsTable() {
    try {
        console.log('🔄 Initializing database connection...');
        await initializeDatabase();

        console.log('🛠️  Adding missing columns to sms_campaigns table...');

        // 1. Add message_content
        try {
            await executeQuery(`
        ALTER TABLE sms_campaigns 
        ADD COLUMN IF NOT EXISTS message_content TEXT;
      `);
            console.log('✅ Added message_content column');
        } catch (e: any) {
            console.log(`⚠️  Note on message_content: ${e.message}`);
        }

        // 2. Add send_rate_limit
        try {
            await executeQuery(`
        ALTER TABLE sms_campaigns 
        ADD COLUMN IF NOT EXISTS send_rate_limit INTEGER DEFAULT 100;
      `);
            console.log('✅ Added send_rate_limit column');
        } catch (e: any) {
            console.log(`⚠️  Note on send_rate_limit: ${e.message}`);
        }

        // 3. Add retry_failed
        try {
            await executeQuery(`
        ALTER TABLE sms_campaigns 
        ADD COLUMN IF NOT EXISTS retry_failed BOOLEAN DEFAULT TRUE;
      `);
            console.log('✅ Added retry_failed column');
        } catch (e: any) {
            console.log(`⚠️  Note on retry_failed: ${e.message}`);
        }

        // 4. Add max_retries
        try {
            await executeQuery(`
        ALTER TABLE sms_campaigns 
        ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
      `);
            console.log('✅ Added max_retries column');
        } catch (e: any) {
            console.log(`⚠️  Note on max_retries: ${e.message}`);
        }

        console.log('✨ Database schema update complete!');
    } catch (error) {
        console.error('❌ Failed to update database schema:', error);
        process.exit(1);
    } finally {
        await closeDatabasePool();
    }
}

fixSMSCampaignsTable();
