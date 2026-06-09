const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const p = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function main() {
  try {
    const res = await p.query("SELECT user_id, email, password FROM users WHERE email = 'national.admin@eff.org.za'");
    if (res.rows.length > 0) {
      const u = res.rows[0];
      console.log('User found:', u.email);
      
      const passwords = ['Admin@12345', 'admin123', 'Admin123!', 'password', 'Password1', 'National@123'];
      for (const pwd of passwords) {
        const match = await bcrypt.compare(pwd, u.password);
        console.log(`  ${pwd}: ${match}`);
      }
      
      // Reset password to Admin@12345
      const hash = await bcrypt.hash('Admin@12345', 10);
      await p.query('UPDATE users SET password = $1 WHERE user_id = $2', [hash, u.user_id]);
      console.log('\nPassword reset to Admin@12345');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}
main();

