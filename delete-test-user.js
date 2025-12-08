const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

(async () => {
  try {
    console.log('🔍 Checking for existing user: ntsowef@gmail.com\n');
    
    const user = await pool.query(`
      SELECT user_id, id, name, email, admin_level
      FROM users
      WHERE email = $1
    `, ['ntsowef@gmail.com']);
    
    if (user.rows.length > 0) {
      console.log('✅ User found:');
      console.table(user.rows);
      
      console.log('\n🗑️  Deleting user...');
      await pool.query(`DELETE FROM users WHERE email = $1`, ['ntsowef@gmail.com']);
      console.log('✅ User deleted successfully!');
    } else {
      console.log('❌ User not found.');
    }
    
    await pool.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
    await pool.end();
  }
})();

