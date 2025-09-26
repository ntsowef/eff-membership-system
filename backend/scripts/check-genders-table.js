const mysql = require('mysql2/promise');

async function checkGendersTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking genders table structure...');
    
    const [cols] = await connection.execute('DESCRIBE genders');
    console.log('📋 Genders table columns:');
    cols.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const [data] = await connection.execute('SELECT * FROM genders LIMIT 5');
    console.log('\n📊 Sample data:');
    data.forEach(row => {
      console.log(`   ${JSON.stringify(row)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkGendersTable();
