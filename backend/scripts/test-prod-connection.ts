import { Client } from 'pg';

async function testProdConnection() {
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

        console.log('🔍 Checking sms_campaigns table columns...');
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sms_campaigns' 
      AND column_name IN ('message_content', 'send_rate_limit', 'retry_failed', 'max_retries');
    `);

        console.log('Columns found:', res.rows);

        await client.end();
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

testProdConnection();
