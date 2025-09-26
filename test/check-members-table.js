const mysql = require('mysql2/promise');

async function checkMembersTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **CHECKING MEMBERS TABLE STRUCTURE**\n');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'members'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Members table columns:');
    columns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMembersTable();
