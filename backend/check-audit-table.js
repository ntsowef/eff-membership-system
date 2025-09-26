#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkAuditTable() {
  try {
    console.log('🔍 Checking audit logs table structure...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Check if audit_logs table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME LIKE '%audit%'
    `);
    
    console.log('📋 Audit-related tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
    });
    
    if (tables.length > 0) {
      const tableName = tables[0].TABLE_NAME;
      
      // Get table structure
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.log(`\n📋 ${tableName} table structure:`);
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Check recent records
      const [records] = await connection.execute(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 3`);
      console.log(`\n📋 Recent ${tableName} records:`);
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. Action: ${record.action || record.event_type || 'N/A'}`);
        console.log(`     User ID: ${record.user_id || 'N/A'}`);
        console.log(`     Created: ${record.created_at || 'N/A'}`);
        console.log(`     Details: ${record.details || record.description || record.metadata || 'N/A'}`);
        console.log('');
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuditTable();
