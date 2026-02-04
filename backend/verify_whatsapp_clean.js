const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function verifyWhatsappClean() {
    try {
        await client.connect();

        const tables = ['whatsapp_bot_logs', 'whatsapp_bot_sessions', 'whatsapp_notification_queue'];

        for (const table of tables) {
            console.log(`\n--- ${table} ---`);
            const res = await client.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = '${table}'
            ORDER BY column_name;
        `);
            if (res.rows.length === 0) {
                console.log("TABLE NOT FOUND");
            } else {
                const cols = res.rows.map(r => r.column_name);
                console.log(cols.join(', '));

                // Specific checks for recent fields
                if (table === 'whatsapp_bot_logs') {
                    console.log('Has wasender_message_id?', cols.includes('wasender_message_id'));
                    console.log('Has intent_detected?', cols.includes('intent_detected'));
                }
                if (table === 'whatsapp_bot_sessions') {
                    console.log('Has context?', cols.includes('context'));
                    console.log('Has conversation_count?', cols.includes('conversation_count'));
                }
                if (table === 'whatsapp_notification_queue') {
                    console.log('Has wasender_message_id?', cols.includes('wasender_message_id'));
                    console.log('Has message_template?', cols.includes('message_template'));
                }
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

verifyWhatsappClean();
