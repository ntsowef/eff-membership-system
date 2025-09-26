const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function checkTableStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check users table structure
    console.log('\n📋 Users table structure:');
    const [usersColumns] = await connection.query('DESCRIBE users');
    console.table(usersColumns);
    
    // Check if roles table exists
    console.log('\n📋 Checking if roles table exists:');
    try {
      const [rolesColumns] = await connection.query('DESCRIBE roles');
      console.log('✅ Roles table exists');
      console.table(rolesColumns);
    } catch (error) {
      console.log('❌ Roles table does not exist');
    }
    
    // Check existing tables
    console.log('\n📋 All tables in database:');
    const [tables] = await connection.query('SHOW TABLES');
    console.table(tables);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTableStructure();
