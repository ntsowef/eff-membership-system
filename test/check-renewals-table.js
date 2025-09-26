const mysql = require('mysql2/promise');

async function checkRenewalsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **CHECKING MEMBERSHIP_RENEWALS TABLE STRUCTURE**\n');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'membership_renewals'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('membership_renewals table columns:');
    columns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkRenewalsTable();
