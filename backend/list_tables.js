const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
    database: process.env.DB_NAME || 'eff_membership_database',
});

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        console.log('Tables found:');
        console.log(res.rows.map(r => r.table_name).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listTables();
