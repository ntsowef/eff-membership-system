const mysql = require('mysql2/promise');

async function checkMeetingTypesStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking Meeting Types Table Structure...\n');

    // Check table structure
    const [columns] = await connection.execute('DESCRIBE meeting_types');
    console.log('📋 Meeting Types Table Structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Check sample data
    console.log('\n📊 Sample Meeting Types Data:');
    const [meetingTypes] = await connection.execute('SELECT * FROM meeting_types LIMIT 10');
    meetingTypes.forEach(type => {
      console.log(`  - ${type.type_id || type.meeting_type_id}: ${type.type_name} (${type.type_code}) - ${type.hierarchy_level}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMeetingTypesStructure();
