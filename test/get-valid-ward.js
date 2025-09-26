const mysql = require('mysql2/promise');

async function getValidWard() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Getting valid ward codes...\n');

    // Get a few valid ward codes
    const [wards] = await connection.execute(`
      SELECT ward_code, ward_name, municipality_code 
      FROM wards 
      WHERE municipality_code = 'JHB'
      LIMIT 5
    `);

    console.log('📋 Available ward codes for JHB:');
    wards.forEach(ward => {
      console.log(`  ✅ ${ward.ward_code} - ${ward.ward_name}`);
    });

    if (wards.length > 0) {
      console.log(`\n🎯 Using ward code: ${wards[0].ward_code}`);
      return wards[0].ward_code;
    }

  } catch (error) {
    console.error('❌ Failed to get ward codes:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

getValidWard();
