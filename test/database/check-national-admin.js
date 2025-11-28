const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
});

async function checkAdmin() {
    try {
        const result = await pool.query(`
            SELECT user_id, id, name, email, admin_level, is_active
            FROM users
            WHERE email = 'national.admin@eff.org.za'
        `);
        
        console.log('National Admin User:');
        console.table(result.rows);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('\nUser Details:');
            console.log('  user_id (PK):', user.user_id);
            console.log('  id:', user.id);
            console.log('  name:', user.name);
            console.log('  email:', user.email);
            console.log('  admin_level:', user.admin_level);
            console.log('  is_active:', user.is_active);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkAdmin();

