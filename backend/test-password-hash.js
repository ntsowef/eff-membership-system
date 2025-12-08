const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testPasswordHash() {
  try {
    // Get the stored hash from database
    const result = await pool.query(
      "SELECT password FROM users WHERE email = 'national.admin@eff.org.za'"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const storedHash = result.rows[0].password;
    console.log('Stored hash:', storedHash);
    
    // Test the password
    const password = 'Admin@123';
    const isMatch = await bcrypt.compare(password, storedHash);
    
    console.log('\nPassword:', password);
    console.log('Match:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('Generating new hash...');
      
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash:', newHash);
      
      // Update the database
      await pool.query(
        "UPDATE users SET password = $1 WHERE email = 'national.admin@eff.org.za'",
        [newHash]
      );
      
      console.log('✅ Password updated in database');
      
      // Test again
      const isMatchNow = await bcrypt.compare(password, newHash);
      console.log('New password match:', isMatchNow);
    } else {
      console.log('✅ Password is correct!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testPasswordHash();

