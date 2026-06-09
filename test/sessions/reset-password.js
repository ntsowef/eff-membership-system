const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function main() {
  try {
    const password = 'Test@12345';
    const hash = await bcrypt.hash(password, 10);
    
    // Reset superadmin password
    await pool.query('UPDATE users SET password = $1, failed_login_attempts = 0, locked_until = NULL, account_locked = false WHERE email = $2', [hash, 'superadmin@eff.org.za']);
    console.log('Password reset for superadmin@eff.org.za to:', password);
    
    // Verify
    const user = await pool.query('SELECT email, password FROM users WHERE email = $1', ['superadmin@eff.org.za']);
    const match = await bcrypt.compare(password, user.rows[0].password);
    console.log('Verification:', match ? 'SUCCESS' : 'FAIL');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
main();

