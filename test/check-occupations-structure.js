const mysql = require('mysql2/promise');

async function checkStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking occupations table structure...\n');

    // Check table structure
    const [structure] = await connection.execute('DESCRIBE occupations');
    console.log('📋 Table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Get sample data
    const [sample] = await connection.execute('SELECT * FROM occupations LIMIT 10');
    console.log('\n📊 Sample data:');
    sample.forEach((row, index) => {
      console.log(`  ${index + 1}. ${JSON.stringify(row)}`);
    });

    // Count total records
    const [count] = await connection.execute('SELECT COUNT(*) as total FROM occupations');
    console.log(`\n📈 Total records: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkStructure();
