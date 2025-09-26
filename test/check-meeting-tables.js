const mysql = require('mysql2/promise');

async function checkMeetingTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Checking meeting-related tables...\n');
    
    // Check for invitation tables
    const [invitationTables] = await connection.execute("SHOW TABLES LIKE '%invitation%'");
    console.log('📧 Invitation tables:');
    if (invitationTables.length > 0) {
      console.table(invitationTables);
    } else {
      console.log('  No invitation tables found');
    }
    
    // Check for meeting tables
    const [meetingTables] = await connection.execute("SHOW TABLES LIKE '%meeting%'");
    console.log('\n📅 Meeting tables:');
    console.table(meetingTables);
    
    // Check meeting_attendance table structure
    console.log('\n📋 meeting_attendance table structure:');
    const [attendanceColumns] = await connection.execute('DESCRIBE meeting_attendance');
    attendanceColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(required)' : '(optional)'}`);
    });
    
    // Check if there's a meeting_invitations table
    try {
      const [invitationColumns] = await connection.execute('DESCRIBE meeting_invitations');
      console.log('\n📧 meeting_invitations table structure:');
      invitationColumns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(required)' : '(optional)'}`);
      });
    } catch (error) {
      console.log('\n❌ meeting_invitations table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await connection.end();
  }
}

checkMeetingTables().catch(console.error);
