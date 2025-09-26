#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

console.log('Environment Variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Test the config loading
try {
  const { config } = require('./dist/config/config.js');
  console.log('\nLoaded Config:');
  console.log('Database config:', config.database);
} catch (error) {
  console.error('Error loading config:', error.message);
}

// Test direct database connection with the config
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    });
    
    console.log('\n✅ Direct connection successful to:', process.env.DB_NAME);
    
    // Test if users table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    console.log('Users table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('Total users:', users[0].count);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
