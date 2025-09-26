#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkUsersSchema() {
  try {
    console.log('🔍 Checking users table schema...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Get table structure
    const [columns] = await connection.execute('DESCRIBE users');
    
    console.log('📋 Users table columns:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `Default: ${col.Default}` : ''}`);
    });
    
    // Check if phone column exists
    const phoneColumn = columns.find(col => col.Field === 'phone');
    if (phoneColumn) {
      console.log('\n✅ Phone column exists');
    } else {
      console.log('\n❌ Phone column does not exist');
      console.log('💡 Need to add phone column to users table');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsersSchema();
