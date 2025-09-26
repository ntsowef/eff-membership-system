const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestUser() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔧 Creating test user for API testing...\n');
    
    // Check if users table exists
    const [usersTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'users'
    `);
    
    if (usersTables.length === 0) {
      console.log('❌ Users table does not exist. Cannot create test user.');
      return;
    }
    
    // Check if test user already exists
    const [existingUsers] = await connection.execute(`
      SELECT id, email FROM users WHERE email = 'test@admin.com'
    `);
    
    if (existingUsers.length > 0) {
      console.log('✅ Test user already exists:');
      console.log('   Email: test@admin.com');
      console.log('   Password: admin123');
      console.log('   Use these credentials for API testing');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create test user
    const [result] = await connection.execute(`
      INSERT INTO users (
        email, 
        password, 
        firstname, 
        lastname, 
        is_active, 
        role_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      'test@admin.com',
      hashedPassword,
      'Test',
      'Admin',
      1,
      1 // Assuming role_id 1 is admin
    ]);
    
    console.log('✅ Test user created successfully!');
    console.log('   Email: test@admin.com');
    console.log('   Password: admin123');
    console.log('   User ID:', result.insertId);
    console.log('\n🎯 You can now use these credentials for API testing');
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Tip: The users table might not exist or have different structure');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUser();
