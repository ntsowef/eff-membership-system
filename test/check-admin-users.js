const mysql = require('mysql2/promise');

async function checkAdminUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking Admin Users...\n');
    
    // Get all active users
    const [users] = await connection.execute(`
      SELECT u.id, u.name, u.email, u.admin_level, u.is_active,
             u.password, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = 1
      ORDER BY u.admin_level, u.name
    `);
    
    console.log('📋 Active Admin Users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
      console.log(`    Level: ${user.admin_level}`);
      console.log(`    Role: ${user.role_name}`);
      console.log(`    Password Hash: ${user.password ? 'Present' : 'Missing'}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('❌ No active users found!');
      return;
    }
    
    // Check if there are any users with simple passwords
    console.log('🔍 Checking for users with common passwords...');
    
    const bcrypt = require('bcrypt');
    const commonPasswords = ['admin123', 'password', 'admin', '123456', 'membership123'];
    
    for (const user of users) {
      if (!user.password) continue;
      
      console.log(`\n🔐 Testing passwords for ${user.name}:`);
      
      for (const testPassword of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`  ✅ Password found: ${testPassword}`);
            console.log(`  📧 Email: ${user.email}`);
            console.log(`  🔑 Use these credentials to log in!`);
            break;
          } else {
            console.log(`  ❌ Not: ${testPassword}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Error testing ${testPassword}: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎯 INSTRUCTIONS:');
    console.log('1. Use one of the working credentials above');
    console.log('2. Go to http://localhost:3000/login');
    console.log('3. Log in with the email and password');
    console.log('4. After login, go to http://localhost:3000/admin/dashboard');
    console.log('5. The dashboard should now show the correct data');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminUsers().catch(console.error);
