const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function verifyWhatsapp() {
    try {
        console.log('🔌 Connecting...');
        await client.connect();

        // Check columns of whatsapp_bot_logs
        console.log('\n🔍 Checking whatsapp_bot_logs columns:');
        const resLogs = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_bot_logs';
    `);
        resLogs.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        // Check columns of whatsapp_bot_sessions
        console.log('\n🔍 Checking whatsapp_bot_sessions columns:');
        const resSessions = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_bot_sessions';
    `);
        resSessions.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        // Check columns of whatsapp_notification_queue
        console.log('\n🔍 Checking whatsapp_notification_queue columns:');
        const resQueue = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_notification_queue';
    `);
        resQueue.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

verifyWhatsapp();
