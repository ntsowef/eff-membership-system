const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function fixPassword() {
  const client = new Client({
    user: 'eff_admin',
    host: 'localhost',
    database: 'eff_membership_db',
    password: 'Frames!123',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Hash the original password
    const originalPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    
    console.log('🔧 Updating password for national.admin@eff.org.za');
    console.log('Password:', originalPassword);
    console.log('Hash:', hashedPassword);
    
    // Update using parameterized query to avoid escaping issues
    const updateQuery = 'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING email';
    const result = await client.query(updateQuery, [hashedPassword, 'national.admin@eff.org.za']);
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully!');
      
      // Test the password
      const testQuery = 'SELECT email, password FROM users WHERE email = $1';
      const testResult = await client.query(testQuery, ['national.admin@eff.org.za']);
      
      if (testResult.rows.length > 0) {
        const storedHash = testResult.rows[0].password;
        const isValid = await bcrypt.compare(originalPassword, storedHash);
        console.log('🧪 Password verification:', isValid ? '✅ Valid' : '❌ Invalid');
        
        if (isValid) {
          console.log('\n🎉 SUCCESS! Your password has been restored to: Admin@123');
        } else {
          console.log('\n❌ Something went wrong with the password update');
        }
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixPassword();
