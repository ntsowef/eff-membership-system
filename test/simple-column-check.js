const mysql = require('mysql2/promise');

async function simpleColumnCheck() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('Checking membership_applications columns...');
    const [result] = await connection.execute('DESCRIBE membership_applications');
    console.log('membership_applications columns:', result.map(r => r.Field));

    console.log('\nChecking members columns...');
    const [result2] = await connection.execute('DESCRIBE members');
    console.log('members columns:', result2.map(r => r.Field));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

simpleColumnCheck();
