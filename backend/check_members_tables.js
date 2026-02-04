const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
    database: process.env.DB_NAME || 'eff_membership_database',
});

async function checkMembers() {
    const tables = ['members', 'members_consolidated'];
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

checkMembers();
