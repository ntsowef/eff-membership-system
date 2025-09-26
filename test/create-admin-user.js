const mysql = require('mysql2/promise');

async function createAdminUser() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Checking existing users...\n');

    // Check existing users
    const [users] = await connection.execute(`
      SELECT id, name, email, role_id, is_active, account_locked
      FROM users 
      ORDER BY id
    `);

    console.log(`📋 Found ${users.length} existing users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role_id}`);
    });

    // Create a simple admin user with a known password hash
    console.log('\n💡 Creating test admin user...');
    
    // This is bcrypt hash for 'admin123' with salt rounds 10
    const knownPasswordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    const [result] = await connection.execute(`
      INSERT INTO users (name, email, password, role_id, is_active, account_locked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        password = VALUES(password),
        is_active = VALUES(is_active),
        account_locked = VALUES(account_locked),
        updated_at = NOW()
    `, ['Test Admin', 'test@admin.com', knownPasswordHash, 1, 1, 0]);
    
    console.log('✅ Test admin user created/updated!');
    console.log('   📧 Email: test@admin.com');
    console.log('   🔑 Password: admin123');
    console.log('   👤 Role ID: 1 (Admin)');
    
    // Test the credentials with the API
    console.log('\n🔍 Testing admin credentials with API...');
    const axios = require('axios');
    
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'test@admin.com',
        password: 'admin123'
      });
      
      console.log('✅ Admin login successful!');
      console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
      
      // Test authenticated request
      const authenticatedAxios = axios.create({
        baseURL: 'http://localhost:5000/api/v1',
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const appsResponse = await authenticatedAxios.get('/membership-applications');
      console.log('✅ Authenticated API request successful!');
      console.log(`   Found ${appsResponse.data.applications?.length || 0} applications`);
      
      console.log('\n🎉 ADMIN USER SETUP COMPLETE!');
      console.log('🎯 Ready for frontend integration testing!');
      console.log('   Use credentials: test@admin.com / admin123');
      
    } catch (apiError) {
      console.log(`❌ API test failed: ${apiError.response?.data?.message || apiError.message}`);
      if (apiError.response?.data) {
        console.log('   Response data:', apiError.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Admin user creation failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting admin user creation...');
createAdminUser();
