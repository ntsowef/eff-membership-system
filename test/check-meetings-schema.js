const mysql = require('mysql2/promise');

async function checkMeetingsSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('=== MEETINGS TABLE SCHEMA ===');
    const [meetingsSchema] = await connection.execute('DESCRIBE meetings');
    console.table(meetingsSchema);

    console.log('\n=== SAMPLE MEETINGS DATA ===');
    const [sampleMeetings] = await connection.execute('SELECT * FROM meetings LIMIT 3');
    console.table(sampleMeetings);

    console.log('\n=== MEETINGS TABLE COUNT ===');
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM meetings');
    console.log('Total meetings:', count[0].total);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkMeetingsSchema();
