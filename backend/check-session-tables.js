#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkSessionTables() {
  try {
    console.log('🔍 Checking session-related tables...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Check if user_sessions table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME LIKE '%session%'
    `);
    
    console.log('📋 Session-related tables found:');
    if (tables.length === 0) {
      console.log('  ❌ No session tables found');
    } else {
      tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
      });
    }
    
    // Check if user_sessions table exists specifically
    const [userSessionsCheck] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME = 'user_sessions'
    `);
    
    if (userSessionsCheck.length > 0) {
      console.log('\n✅ user_sessions table exists');
      
      // Get table structure
      const [columns] = await connection.execute('DESCRIBE user_sessions');
      console.log('\n📋 user_sessions table structure:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `Default: ${col.Default}` : ''}`);
      });
      
      // Check current sessions
      const [sessions] = await connection.execute('SELECT COUNT(*) as session_count FROM user_sessions');
      console.log(`\n📊 Current sessions in database: ${sessions[0].session_count}`);
      
      if (sessions[0].session_count > 0) {
        const [activeSessions] = await connection.execute(`
          SELECT u.name, u.email, s.session_id, s.ip_address, s.created_at, s.last_activity, s.is_active
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          ORDER BY s.created_at DESC
          LIMIT 5
        `);
        
        console.log('\n📋 Recent sessions:');
        activeSessions.forEach((session, index) => {
          console.log(`  ${index + 1}. ${session.name} (${session.email})`);
          console.log(`     Session ID: ${session.session_id}`);
          console.log(`     IP: ${session.ip_address}`);
          console.log(`     Created: ${session.created_at}`);
          console.log(`     Active: ${session.is_active ? 'Yes' : 'No'}`);
          console.log('');
        });
      }
    } else {
      console.log('\n❌ user_sessions table does not exist');
      console.log('💡 Need to create user_sessions table for session tracking');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSessionTables();
