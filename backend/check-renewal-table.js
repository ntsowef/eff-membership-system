const mysql = require('mysql2/promise');

async function checkRenewalTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking membership_renewals table structure...\n');
    
    // Check if table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'membership_renewals'"
    );
    
    if (tables.length === 0) {
      console.log('❌ membership_renewals table does not exist');
      
      // Check what renewal-related tables exist
      const [allTables] = await connection.execute(
        "SHOW TABLES LIKE '%renewal%'"
      );
      
      console.log('\n📋 Available renewal-related tables:');
      allTables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
      
    } else {
      console.log('✅ membership_renewals table exists');
      
      // Get table structure
      const [columns] = await connection.execute(
        'DESCRIBE membership_renewals'
      );
      
      console.log('\n📊 Table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Check sample data
      const [sampleData] = await connection.execute(
        'SELECT * FROM membership_renewals LIMIT 5'
      );
      
      console.log('\n📋 Sample data:');
      if (sampleData.length > 0) {
        console.log('   Columns:', Object.keys(sampleData[0]).join(', '));
        console.log(`   Records: ${sampleData.length} sample records found`);
      } else {
        console.log('   No data found in table');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkRenewalTable();
