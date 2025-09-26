const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking table structures...\n');

    // Check meetings table structure
    console.log('📋 MEETINGS TABLE:');
    const [meetingsColumns] = await connection.execute('DESCRIBE meetings');
    meetingsColumns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
    });

    // Check if meeting_attendance table exists
    console.log('\n📋 MEETING_ATTENDANCE TABLE:');
    try {
      const [attendanceColumns] = await connection.execute('DESCRIBE meeting_attendance');
      attendanceColumns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
      });
    } catch (error) {
      console.log('  ❌ Table does not exist or is not accessible');
      console.log('  Error:', error.message);
    }

    // Check members table structure
    console.log('\n📋 MEMBERS TABLE:');
    const [membersColumns] = await connection.execute('DESCRIBE members');
    membersColumns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
    });

    // List all tables
    console.log('\n📋 ALL TABLES:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach(table => {
      console.log(`  ${Object.values(table)[0]}`);
    });

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    await connection.end();
  }
}

// Run the script
checkTableStructure().catch(console.error);
