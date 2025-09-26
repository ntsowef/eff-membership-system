const mysql = require('mysql2/promise');

async function checkApplicationSchema() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Checking membership_applications table schema...\n');

    // Get table structure
    const [columns] = await connection.execute(`
      DESCRIBE membership_applications
    `);

    console.log('📋 membership_applications table columns:');
    console.log('==========================================');
    columns.forEach((column, index) => {
      console.log(`${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
    });

    console.log('\n🔍 Checking for geographic columns...');
    const geoColumns = columns.filter(col => 
      col.Field.includes('province') || 
      col.Field.includes('district') || 
      col.Field.includes('municipal') || 
      col.Field.includes('ward')
    );

    console.log('\n🗺️ Geographic columns found:');
    geoColumns.forEach(col => {
      console.log(`  ✅ ${col.Field} (${col.Type})`);
    });

    // Check if we have the new personal info columns
    console.log('\n🔍 Checking for personal info columns...');
    const personalColumns = columns.filter(col => 
      col.Field.includes('language') || 
      col.Field.includes('occupation') || 
      col.Field.includes('qualification') || 
      col.Field.includes('citizenship')
    );

    console.log('\n👤 Personal info columns found:');
    personalColumns.forEach(col => {
      console.log(`  ✅ ${col.Field} (${col.Type})`);
    });

    // Check payment columns
    console.log('\n🔍 Checking for payment columns...');
    const paymentColumns = columns.filter(col => 
      col.Field.includes('payment')
    );

    console.log('\n💰 Payment columns found:');
    paymentColumns.forEach(col => {
      console.log(`  ✅ ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting schema check...');
checkApplicationSchema();
