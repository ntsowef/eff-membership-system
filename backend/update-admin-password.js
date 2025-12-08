const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function updatePassword() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    console.log('🔐 Updating password for national.admin@eff.org.za...\n');

    // Generate new hash for Admin@123
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    console.log('\n📝 Updating database...');

    // Update the password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [hash, 'national.admin@eff.org.za']
    );

    console.log('✅ Password updated successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: national.admin@eff.org.za');
    console.log('   Password: Admin@123');

    // Verify the update
    const result = await pool.query(
      'SELECT user_id, name, email FROM users WHERE email = $1',
      ['national.admin@eff.org.za']
    );

    if (result.rows.length > 0) {
      console.log('\n✅ User verified:');
      console.log('   ID:', result.rows[0].user_id);
      console.log('   Name:', result.rows[0].name);
      console.log('   Email:', result.rows[0].email);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updatePassword();

