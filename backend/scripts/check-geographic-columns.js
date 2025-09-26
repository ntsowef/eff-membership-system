const mysql = require('mysql2/promise');

async function checkGeographicColumns() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🔍 Checking geographic table column names...\n');
    
    const tables = ['provinces', 'districts', 'municipalities', 'wards'];
    
    for (const tableName of tables) {
      console.log(`📋 ${tableName.toUpperCase()} table columns:`);
      
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);
      
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      
      // Show sample data
      const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 1`);
      if (sampleData.length > 0) {
        console.log('   📋 Sample data:');
        Object.keys(sampleData[0]).forEach(key => {
          console.log(`      ${key}: ${sampleData[0][key]}`);
        });
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Failed to check columns:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkGeographicColumns();
