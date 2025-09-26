const mysql = require('mysql2/promise');

async function checkUsers() {
  let connection;
  
  try {
    // Create connection to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'geomaps_membership'
    });

    console.log('🔍 Checking existing users in the database...\n');

    // Check if users table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'geomaps_membership' 
      AND TABLE_NAME = 'users'
    `);

    if (tables.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }

    console.log('✅ Users table exists');

    // Get all users
    const [users] = await connection.execute(`
      SELECT 
        id, name, email, admin_level, is_active, 
        created_at, role_id
      FROM users 
      ORDER BY id
    `);

    console.log(`\n📊 Found ${users.length} users:`);
    
    if (users.length === 0) {
      console.log('   No users found in the database');
      console.log('\n💡 You may need to create a user first. Try running:');
      console.log('   node create-test-user.js');
    } else {
      console.log('\n👥 User List:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Admin Level: ${user.admin_level}`);
        console.log(`      - Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`      - Role ID: ${user.role_id}`);
        console.log(`      - Created: ${user.created_at}`);
        console.log('');
      });
    }

    // Check roles table
    const [roles] = await connection.execute(`
      SELECT id, name, description 
      FROM roles 
      ORDER BY id
    `);

    console.log(`\n🎭 Found ${roles.length} roles:`);
    roles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.name} (ID: ${role.id})`);
      console.log(`      - Description: ${role.description || 'No description'}`);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Make sure MySQL is running and the database exists');
    console.log('   Database: geomaps_membership');
    console.log('   Host: localhost');
    console.log('   User: root');
    console.log('   Password: root');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers().catch(console.error);
