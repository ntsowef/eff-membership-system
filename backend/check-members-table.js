const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMembersTable() {
  let connection;
  
  try {
    console.log('🔍 Checking Members Table Structure...\n');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check if members table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'members'
    `, [process.env.DB_NAME || 'membership_new']);
    
    if (tables.length === 0) {
      console.log('❌ Members table does not exist');
      return;
    }
    
    console.log('✅ Members table exists');
    
    // Get table structure
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'members'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📋 Members Table Structure:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY} ${col.EXTRA}`);
    });
    
    // Check existing SMS-related tables
    const [smsTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'sms_%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📋 Existing SMS Tables:');
    if (smsTables.length === 0) {
      console.log('   No SMS tables found');
    } else {
      smsTables.forEach(table => {
        console.log(`   ✅ ${table.TABLE_NAME}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMembersTable();
