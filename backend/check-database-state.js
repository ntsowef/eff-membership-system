#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkDatabaseState() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });
    
    console.log('🔍 Checking database state...\n');
    
    // Check what database we're connected to
    const [dbResult] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('📊 Current database:', dbResult[0].current_db);
    
    // List all tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    
    // Check if users table exists in any form
    const [userTables] = await connection.execute(`
      SHOW TABLES LIKE '%user%'
    `);
    
    console.log('\n📋 User-related tables:');
    if (userTables.length === 0) {
      console.log('  No user-related tables found');
    } else {
      userTables.forEach(table => {
        console.log('  -', Object.values(table)[0]);
      });
    }
    
    // Check if we have members table (which we know exists)
    const [memberCount] = await connection.execute('SELECT COUNT(*) as count FROM members');
    console.log('\n📊 Members in database:', memberCount[0].count);
    
    // Check if roles table exists
    try {
      const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
      console.log('📊 Roles in database:', roleCount[0].count);
    } catch (error) {
      console.log('📊 Roles table does not exist');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseState();
