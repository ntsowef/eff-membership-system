const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
});

async function checkTables() {
    try {
        console.log('\n=== MUNICIPALITIES TABLE ===');
        const muniResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'municipalities'
            ORDER BY ordinal_position
        `);
        console.table(muniResult.rows);
        
        console.log('\n=== WARDS TABLE ===');
        const wardsResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'wards'
            ORDER BY ordinal_position
        `);
        console.table(wardsResult.rows);
        
        console.log('\n=== DISTRICTS TABLE ===');
        const districtsResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'districts'
            ORDER BY ordinal_position
        `);
        console.table(districtsResult.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();

