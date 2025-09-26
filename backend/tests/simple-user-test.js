const mysql = require('mysql2/promise');

async function simpleUserTest() {
  console.log('🔍 Simple user test...\n');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Database connected');
    
    // Try to select from users table
    try {
      const [result] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users table accessible, count:', result[0].count);
      
      // Try to get specific user
      const [users] = await connection.execute('SELECT * FROM users WHERE email = ? LIMIT 1', ['admin@membership.org']);
      console.log('✅ User query successful, found:', users.length, 'users');
      
      if (users.length > 0) {
        const user = users[0];
        console.log('📋 User details:');
        console.log('   ID:', user.id);
        console.log('   Name:', user.name);
        console.log('   Email:', user.email);
        console.log('   Is Active:', user.is_active);
        console.log('   Admin Level:', user.admin_level);
        console.log('   Password Hash:', user.password ? 'Present' : 'Missing');
      }
      
    } catch (error) {
      console.error('❌ Error accessing users table:', error.message);
      
      // Try to repair the table
      console.log('🔧 Attempting to repair users table...');
      try {
        await connection.execute('REPAIR TABLE users');
        console.log('✅ Table repair completed');
        
        // Try query again
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ? LIMIT 1', ['admin@membership.org']);
        console.log('✅ After repair - found:', users.length, 'users');
        
      } catch (repairError) {
        console.error('❌ Table repair failed:', repairError.message);
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleUserTest();
