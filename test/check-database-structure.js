const mysql = require('mysql2/promise');

async function checkDatabaseStructure() {
  console.log('🔍 Checking Database Structure...\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check meeting-related tables
    console.log('📊 Meeting-related tables:');
    const [meetingTables] = await connection.execute(`
      SHOW TABLES LIKE '%meeting%'
    `);
    console.table(meetingTables);
    
    // Check if users table exists
    console.log('\n👥 Users table structure:');
    try {
      const [usersStructure] = await connection.execute('DESCRIBE users');
      console.table(usersStructure);
    } catch (error) {
      console.log('❌ Users table does not exist:', error.message);
    }
    
    // Check if meeting_types table exists
    console.log('\n📋 Meeting types table structure:');
    try {
      const [meetingTypesStructure] = await connection.execute('DESCRIBE meeting_types');
      console.table(meetingTypesStructure);
    } catch (error) {
      console.log('❌ Meeting_types table does not exist:', error.message);
    }
    
    // Check meetings table structure
    console.log('\n📅 Meetings table structure:');
    try {
      const [meetingsStructure] = await connection.execute('DESCRIBE meetings');
      console.table(meetingsStructure);
    } catch (error) {
      console.log('❌ Meetings table does not exist:', error.message);
    }

    // Check members table structure
    console.log('\n👥 Members table structure:');
    try {
      const [membersStructure] = await connection.execute('DESCRIBE members');
      console.table(membersStructure);
    } catch (error) {
      console.log('❌ Members table does not exist:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabaseStructure().catch(console.error);
