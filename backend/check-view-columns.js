const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkViewColumns() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Database connected');
    
    // Check columns in vw_member_details view
    console.log('\n📋 Columns in vw_member_details view:');
    const [columns] = await connection.execute('DESCRIBE vw_member_details');
    
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Not Null'}`);
    });
    
    // Check for gender-related columns
    console.log('\n🔍 Looking for gender-related columns:');
    const genderColumns = columns.filter(col => 
      col.Field.toLowerCase().includes('gender') || 
      col.Field.toLowerCase().includes('sex')
    );
    
    if (genderColumns.length > 0) {
      genderColumns.forEach(col => {
        console.log(`   Found: ${col.Field} (${col.Type})`);
      });
    } else {
      console.log('   No gender-related columns found');
    }
    
    // Check for age-related columns
    console.log('\n🔍 Looking for age-related columns:');
    const ageColumns = columns.filter(col => 
      col.Field.toLowerCase().includes('age') || 
      col.Field.toLowerCase().includes('birth') ||
      col.Field.toLowerCase().includes('dob')
    );
    
    if (ageColumns.length > 0) {
      ageColumns.forEach(col => {
        console.log(`   Found: ${col.Field} (${col.Type})`);
      });
    } else {
      console.log('   No age-related columns found');
    }
    
    // Sample some data to see what's available
    console.log('\n📊 Sample data from vw_member_details (first 3 rows):');
    const [sampleData] = await connection.execute('SELECT * FROM vw_member_details LIMIT 3');
    
    if (sampleData.length > 0) {
      console.log('Sample row keys:', Object.keys(sampleData[0]));
      sampleData.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          if (key.toLowerCase().includes('gender') || 
              key.toLowerCase().includes('age') || 
              key.toLowerCase().includes('birth') ||
              key.toLowerCase().includes('sex')) {
            console.log(`   ${key}: ${value}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkViewColumns();
