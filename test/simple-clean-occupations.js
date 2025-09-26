const mysql = require('mysql2/promise');

async function simpleCleanOccupations() {
  console.log('🧹 Simple Occupations Cleanup...');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    // Count total before
    const [beforeCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`Before cleanup: ${beforeCount[0].count} occupations`);

    // Delete entries that are clearly invalid (contain numbers, dates, emails, etc.)
    await connection.execute(`
      DELETE FROM occupations 
      WHERE occupation_name REGEXP '[0-9]'
         OR occupation_name LIKE '%@%'
         OR occupation_name LIKE '%/%'
         OR occupation_name LIKE '%.%'
         OR occupation_name LIKE '%-%-%'
         OR LENGTH(occupation_name) < 2
    `);

    // Count after
    const [afterCount] = await connection.execute('SELECT COUNT(*) as count FROM occupations');
    console.log(`After cleanup: ${afterCount[0].count} occupations`);

    // Show first 10 remaining
    const [sample] = await connection.execute(
      'SELECT occupation_name FROM occupations ORDER BY occupation_name LIMIT 10'
    );
    
    console.log('Sample remaining occupations:');
    sample.forEach((occ, i) => console.log(`${i+1}. ${occ.occupation_name}`));

    await connection.end();
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleCleanOccupations();
