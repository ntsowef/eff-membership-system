const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database',
    port: 5432
});

async function getActiveOTPs() {
    try {
        const result = await pool.query(`
            SELECT
                u.user_id,
                u.email,
                u.name,
                u.admin_level,
                o.otp_plain,
                o.otp_code_hash,
                o.expires_at,
                o.generated_at,
                o.sent_to_number,
                o.delivery_status
            FROM users u
            JOIN user_otp_codes o ON u.user_id = o.user_id
            WHERE o.is_validated = false
            AND o.is_expired = false
            AND o.expires_at > NOW()
            AND o.invalidated_at IS NULL
            ORDER BY o.generated_at DESC
            LIMIT 10
        `);

        console.log('\n=== Active OTP Codes ===\n');
        if (result.rows.length === 0) {
            console.log('No active OTP codes found.');
        } else {
            result.rows.forEach(row => {
                console.log(`User: ${row.name} (${row.email})`);
                console.log(`Admin Level: ${row.admin_level}`);
                console.log(`OTP Code (plain): ${row.otp_plain || 'Already cleared'}`);
                console.log(`Sent to: ${row.sent_to_number}`);
                console.log(`Delivery Status: ${row.delivery_status}`);
                console.log(`Expires: ${row.expires_at}`);
                console.log('---');
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

getActiveOTPs();

