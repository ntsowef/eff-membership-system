const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestUser() {
  let connection;
  
  try {
    // Create connection to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'geomaps_membership'
    });

    console.log('🔧 Creating test user for geographic search testing...\n');

    // Check if user already exists
    const [existingUsers] = await connection.execute(`
      SELECT id, email FROM users WHERE email = ?
    `, ['admin@example.com']);

    if (existingUsers.length > 0) {
      console.log('✅ Test user already exists: admin@example.com');
      console.log('   You can use this email with password: admin123');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Insert test user
    const [result] = await connection.execute(`
      INSERT INTO users (
        name, email, password, role_id, admin_level, 
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'Test Admin',
      'admin@example.com', 
      hashedPassword,
      1, // Assuming role_id 1 is admin
      'national',
      true
    ]);

    console.log('✅ Test user created successfully!');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('   User ID:', result.insertId);
    console.log('\n🧪 You can now run the geographic search tests');

  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 The users table does not exist. You may need to run migrations first:');
      console.log('   cd backend && npm run migrate');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Database access denied. Check your MySQL credentials.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Cannot connect to MySQL. Make sure MySQL is running.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUser().catch(console.error);
