const mysql = require('mysql2/promise');

async function checkUsersTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔍 Checking users table structure...\n');
    
    // Check if users table exists
    const [usersTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'users'
    `);
    
    if (usersTables.length === 0) {
      console.log('❌ Users table does not exist');
      
      // Check for alternative table names
      const [allTables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND TABLE_NAME LIKE '%user%'
      `);
      
      if (allTables.length > 0) {
        console.log('📋 Found user-related tables:');
        allTables.forEach(table => {
          console.log(`   - ${table.TABLE_NAME}`);
        });
      }
      
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Get table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 Users table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check existing users
    const [users] = await connection.execute(`
      SELECT id, email, created_at FROM users LIMIT 5
    `);
    
    console.log(`\n👥 Found ${users.length} existing users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to check users table:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsersTable();
