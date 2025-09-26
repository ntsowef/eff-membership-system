const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and user query...\n');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Database connection successful');

    // First, check what tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log('   -', Object.values(table)[0]);
    });

    // Check users table structure
    const [tableInfo] = await connection.execute('DESCRIBE users');
    console.log('\n📋 Users table structure:');
    tableInfo.forEach(column => {
      console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Test simple user query first
    console.log('\n🔍 Testing simple user query...');
    const [simpleUsers] = await connection.execute('SELECT id, name, email, is_active FROM users WHERE email = ?', ['admin@membership.org']);
    console.log('Simple query result:', simpleUsers);

    // Test the complex user query
    console.log('\n🔍 Testing complex user query...');
    const [users] = await connection.execute(`
      SELECT
        u.id, u.name, u.email, u.password, u.admin_level, u.is_active,
        u.province_code, u.district_code, u.municipal_code, u.ward_code,
        u.mfa_enabled, u.failed_login_attempts,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, ['admin@membership.org']);
    
    console.log('📋 Query result:');
    console.log('   Type:', typeof users);
    console.log('   Is Array:', Array.isArray(users));
    console.log('   Length:', users ? users.length : 'undefined');
    
    if (users && users.length > 0) {
      console.log('   User found:', users[0].name);
      console.log('   Email:', users[0].email);
      console.log('   Is Active:', users[0].is_active);
      console.log('   Admin Level:', users[0].admin_level);
      console.log('   Password Hash:', users[0].password ? 'Present' : 'Missing');
    } else {
      console.log('   No users found');
      
      // Check if user exists at all
      const [allUsers] = await connection.execute('SELECT id, name, email, is_active FROM users WHERE email = ?', ['admin@membership.org']);
      console.log('   Direct user check:', allUsers.length > 0 ? 'User exists' : 'User not found');
      if (allUsers.length > 0) {
        console.log('   User data:', allUsers[0]);
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testDatabaseConnection();
