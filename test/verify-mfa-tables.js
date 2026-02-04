const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database',
    port: 5432
});

async function verifyTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'mfa_%' 
            ORDER BY table_name
        `);
        
        console.log('MFA Emergency Access Tables found:');
        result.rows.forEach(row => console.log('  ✅', row.table_name));
        
        if (result.rows.length === 0) {
            console.log('  ❌ No MFA tables found');
        }
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

verifyTables();

