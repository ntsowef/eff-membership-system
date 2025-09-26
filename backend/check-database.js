#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('🔍 Checking database structure...\n');
    
    // Show all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    console.table(tables);
    
    // Check if there's a different user table name
    const tableNames = tables.map(row => Object.values(row)[0]);
    const userTables = tableNames.filter(name => 
      name.toLowerCase().includes('user') || 
      name.toLowerCase().includes('admin') ||
      name.toLowerCase().includes('auth')
    );
    
    console.log('\n👤 User-related tables:', userTables);
    
    // If we find user tables, show their structure
    for (const tableName of userTables) {
      console.log(`\n📊 Structure of ${tableName}:`);
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.table(columns);
      
      // Show sample data
      console.log(`\n📄 Sample data from ${tableName}:`);
      const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 5`);
      console.table(sampleData);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabase();
