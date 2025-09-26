const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkAdminCredentials() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Checking admin users...\n');

    // Get all users
    const [users] = await connection.execute(`
      SELECT id, name, email, password, role_id, is_active, account_locked, created_at
      FROM users 
      ORDER BY id
    `);

    console.log(`📋 Found ${users.length} users in the system:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
      console.log(`      Role ID: ${user.role_id}, Active: ${user.is_active ? 'Yes' : 'No'}, Locked: ${user.account_locked ? 'Yes' : 'No'}`);
      console.log(`      Created: ${user.created_at}`);
      console.log('');
    });

    // Test password verification for each user
    console.log('🔐 Testing password verification...');
    
    const testPasswords = ['admin123', 'password', 'admin', '123456', 'test123'];
    
    for (const user of users) {
      console.log(`\n👤 Testing user: ${user.email}`);
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, user.password);
          if (isValid) {
            console.log(`   ✅ Password found: "${testPassword}"`);
            
            // Test login with this credential
            console.log('   🔍 Testing API login...');
            const axios = require('axios');
            try {
              const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
                email: user.email,
                password: testPassword
              });
              console.log('   ✅ API login successful!');
              console.log(`   🎯 Use these credentials: Email: ${user.email}, Password: ${testPassword}`);
              return { email: user.email, password: testPassword, token: loginResponse.data.token };
            } catch (apiError) {
              console.log(`   ❌ API login failed: ${apiError.response?.data?.message || apiError.message}`);
            }
            break;
          }
        } catch (error) {
          // Skip invalid password hashes
        }
      }
    }

    console.log('\n❌ No working credentials found with common passwords');
    console.log('💡 Creating a test admin user...');
    
    // Create a test admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [result] = await connection.execute(`
      INSERT INTO users (name, email, password, role_id, is_active, account_locked, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        password = VALUES(password),
        is_active = VALUES(is_active),
        account_locked = VALUES(account_locked)
    `, ['Test Admin', 'test@admin.com', hashedPassword, 1, 1, 0]);
    
    console.log('✅ Test admin user created/updated!');
    console.log('   📧 Email: test@admin.com');
    console.log('   🔑 Password: admin123');
    
    // Test the new credentials
    console.log('\n🔍 Testing new admin credentials...');
    const axios = require('axios');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'test@admin.com',
        password: 'admin123'
      });
      console.log('✅ New admin login successful!');
      console.log('🎯 Ready for frontend integration testing!');
      return { email: 'test@admin.com', password: 'admin123', token: loginResponse.data.token };
    } catch (apiError) {
      console.log(`❌ New admin login failed: ${apiError.response?.data?.message || apiError.message}`);
    }

  } catch (error) {
    console.error('❌ Admin credentials check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting admin credentials check...');
checkAdminCredentials();
