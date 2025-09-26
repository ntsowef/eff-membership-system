#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkRolesTable() {
  let connection;
  try {
    console.log('🔍 Checking roles table structure...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    // Check if roles table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "roles"');
    
    if (tables.length === 0) {
      console.log('❌ Roles table does not exist!');
      
      // Check what tables exist
      const [allTables] = await connection.execute('SHOW TABLES');
      console.log('Available tables:');
      allTables.forEach(table => {
        console.log('- ', Object.values(table)[0]);
      });
      
      return;
    }
    
    console.log('✅ Roles table exists');
    
    // Check roles table structure
    const [columns] = await connection.execute('DESCRIBE roles');
    console.log('\n📊 Roles table structure:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check sample data
    const [roles] = await connection.execute('SELECT * FROM roles LIMIT 5');
    console.log('\n📄 Sample roles data:');
    console.table(roles);
    
    // Now check the users table structure
    console.log('\n📊 Users table structure:');
    const [userColumns] = await connection.execute('DESCRIBE users');
    userColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check sample user data
    const [users] = await connection.execute('SELECT id, name, email, admin_level, province_code, role_id FROM users LIMIT 5');
    console.log('\n📄 Sample users data:');
    console.table(users);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkRolesTable();
