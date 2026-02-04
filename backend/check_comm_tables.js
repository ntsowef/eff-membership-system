const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
    database: process.env.DB_NAME || 'eff_membership_database',
});

async function checkTables() {
    const tables = [
        'message_templates',
        'communication_campaigns',
        'messages',
        'message_deliveries',
        'communication_preferences',
        'communication_analytics',
        'message_queue',
        'whatsapp_bot_logs',
        'whatsapp_bot_sessions',
        'whatsapp_notification_queue'
    ];

    try {
        for (const table of tables) {
            const res = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)", [table]);
            console.log(`${table}: ${res.rows[0].exists ? 'FOUND' : 'MISSING'}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTables();
