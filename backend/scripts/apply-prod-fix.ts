import { Client } from 'pg';

async function fixProdDatabase() {
    const client = new Client({
        host: '69.164.245.173',
        port: 5432,
        user: 'eff_admin',
        password: 'Frames!123',
        database: 'eff_membership_database',
    });

    try {
        console.log('🔗 Connecting to production database at 69.164.245.173...');
        await client.connect();
        console.log('✅ Connection successful!');

        console.log('🛠️  Adding missing columns to production sms_campaigns table...');

        // 1. Add message_content
        await client.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS message_content TEXT;`);
        console.log('✅ Added message_content column');

        // 2. Add send_rate_limit
        await client.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS send_rate_limit INTEGER DEFAULT 100;`);
        console.log('✅ Added send_rate_limit column');

        // 3. Add retry_failed
        await client.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS retry_failed BOOLEAN DEFAULT TRUE;`);
        console.log('✅ Added retry_failed column');

        // 4. Add max_retries
        await client.query(`ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;`);
        console.log('✅ Added max_retries column');

        console.log('✨ Production database schema update complete!');

        // Verification
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sms_campaigns' 
      AND column_name IN ('message_content', 'send_rate_limit', 'retry_failed', 'max_retries');
    `);
        console.log('Verification Results:', res.rows);

        await client.end();
    } catch (err) {
        console.error('❌ Production Fix Error:', err);
        process.exit(1);
    }
}

fixProdDatabase();
