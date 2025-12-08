const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  port: 5432
});

async function resetPasswords() {
  try {
    const hash = await bcrypt.hash('Admin@123', 10);
    console.log('Generated hash:', hash);

    // Update all users
    const emails = [
      'ntsowef@gmail.com',
      'national.admin@eff.org.za',
      'testadmin@eff.org.za',
      'superadmin@eff.org.za'
    ];

    for (const email of emails) {
      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING user_id, email, name',
        [hash, email]
      );
      if (result.rows.length > 0) {
        console.log('Updated:', result.rows[0]);
      }
    }

    console.log('\n✅ All passwords reset to: Admin@123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetPasswords();

