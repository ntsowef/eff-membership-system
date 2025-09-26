const mysql = require('mysql2/promise');

async function checkMeetingType() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking Meeting Type ID 2...\n');

    const [meetingType] = await connection.execute('SELECT * FROM meeting_types WHERE id = 2');
    console.log('Meeting Type Details:', meetingType[0]);

    // Check all meeting types for National level
    console.log('\n📋 All National Level Meeting Types:');
    const [nationalTypes] = await connection.execute(`
      SELECT id, type_name, type_code, hierarchy_level, is_active 
      FROM meeting_types 
      WHERE hierarchy_level = 'National' AND is_active = TRUE
    `);
    
    nationalTypes.forEach(type => {
      console.log(`  - ID: ${type.id}, Name: ${type.type_name}, Code: ${type.type_code}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMeetingType();
