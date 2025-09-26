const mysql = require('mysql2/promise');

async function checkTableColumns() {
  console.log('🔍 **CHECKING TABLE COLUMNS FOR VIEW CREATION**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **Membership Applications Table Columns:**');
    
    const [appColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'membership_applications'
      ORDER BY ORDINAL_POSITION
    `);

    appColumns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log('\n📋 **Members Table Columns:**');
    
    const [memberColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'members'
      ORDER BY ORDINAL_POSITION
    `);

    memberColumns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log('\n📋 **Membership Renewals Table Columns:**');
    
    const [renewalColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'membership_renewals'
      ORDER BY ORDINAL_POSITION
    `);

    renewalColumns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

  } catch (error) {
    console.error('❌ **Column check failed:**', error.message);
  } finally {
    await connection.end();
  }
}

// Run the check
checkTableColumns();
