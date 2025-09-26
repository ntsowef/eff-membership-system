const mysql = require('mysql2/promise');

async function checkMeetingAttendanceTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Checking meeting_attendance table structure...');
    const [columns] = await connection.execute('DESCRIBE meeting_attendance');
    console.log('Meeting attendance table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkMeetingAttendanceTable();
