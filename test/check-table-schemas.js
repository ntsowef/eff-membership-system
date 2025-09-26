const mysql = require('mysql2/promise');

async function checkTableSchemas() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Checking table schemas for joins...\n');

    // Check wards table
    console.log('📋 Wards table structure:');
    const [wardsColumns] = await connection.execute('DESCRIBE wards');
    wardsColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check municipalities table
    console.log('\n📋 Municipalities table structure:');
    const [municipalitiesColumns] = await connection.execute('DESCRIBE municipalities');
    municipalitiesColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check districts table
    console.log('\n📋 Districts table structure:');
    const [districtsColumns] = await connection.execute('DESCRIBE districts');
    districtsColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check provinces table
    console.log('\n📋 Provinces table structure:');
    const [provincesColumns] = await connection.execute('DESCRIBE provinces');
    provincesColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check languages table
    console.log('\n📋 Languages table structure:');
    const [languagesColumns] = await connection.execute('DESCRIBE languages');
    languagesColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check occupations table
    console.log('\n📋 Occupations table structure:');
    const [occupationsColumns] = await connection.execute('DESCRIBE occupations');
    occupationsColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check qualifications table
    console.log('\n📋 Qualifications table structure:');
    const [qualificationsColumns] = await connection.execute('DESCRIBE qualifications');
    qualificationsColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Check users table
    console.log('\n📋 Users table structure:');
    const [usersColumns] = await connection.execute('DESCRIBE users');
    usersColumns.forEach(col => console.log(`  ${col.Field} (${col.Type})`));

    // Test a sample join to see what works
    console.log('\n🔍 Testing sample joins...');
    
    const [sampleWard] = await connection.execute(`
      SELECT w.*, m.municipality_name, d.district_name, p.province_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON w.district_code = d.district_code  
      LEFT JOIN provinces p ON w.province_code = p.province_code
      LIMIT 1
    `);
    
    if (sampleWard.length > 0) {
      console.log('✅ Sample ward join successful:');
      console.log(`   Ward: ${sampleWard[0].ward_name || sampleWard[0].name || 'N/A'}`);
      console.log(`   Municipality: ${sampleWard[0].municipality_name || 'N/A'}`);
      console.log(`   District: ${sampleWard[0].district_name || 'N/A'}`);
      console.log(`   Province: ${sampleWard[0].province_name || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting table schema check...');
checkTableSchemas();
