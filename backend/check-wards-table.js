const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWardsTable() {
  let connection;
  
  try {
    console.log('🔍 Checking Wards Table Structure...\n');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check if wards table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'wards'
    `, [process.env.DB_NAME || 'membership_new']);
    
    if (tables.length === 0) {
      console.log('❌ Wards table does not exist');
      
      // Check for similar tables
      const [similarTables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%ward%'
      `, [process.env.DB_NAME || 'membership_new']);
      
      console.log('\n📋 Tables with "ward" in name:');
      similarTables.forEach(table => {
        console.log(`   ${table.TABLE_NAME}`);
      });
      
      return;
    }
    
    console.log('✅ Wards table exists');
    
    // Get table structure
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'wards'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'membership_new']);
    
    console.log('\n📋 Wards Table Structure:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY} ${col.EXTRA}`);
    });
    
    // Get sample data
    const [sampleData] = await connection.query('SELECT * FROM wards LIMIT 3');
    console.log('\n📊 Sample Wards Data:');
    sampleData.forEach((row, index) => {
      console.log(`   Row ${index + 1}:`, row);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkWardsTable();
