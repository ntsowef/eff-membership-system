const mysql = require('mysql2/promise');

async function findUserMunicipality() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'root',
    database: 'membership_new'
  });
  
  try {
    console.log('🔍 Finding municipality for ward 93504029...\n');
    
    // Check if ward exists and find its municipality
    const [wards] = await connection.execute(
      'SELECT * FROM wards WHERE ward_code = ?',
      ['93504029']
    );
    
    if (wards.length > 0) {
      console.log('📋 Ward information:');
      console.table(wards);
      
      const ward = wards[0];
      console.log(`\nWard belongs to municipality: ${ward.municipality_code}`);
      
      // Get municipality details
      const [municipality] = await connection.execute(
        'SELECT * FROM municipalities WHERE municipality_code = ?',
        [ward.municipality_code]
      );
      
      if (municipality.length > 0) {
        console.log('\n🏛️ Municipality details:');
        console.table(municipality);
        
        return ward.municipality_code;
      }
    } else {
      console.log('❌ Ward not found. Checking available wards in DC35...');
      const [availableWards] = await connection.execute(
        'SELECT * FROM wards WHERE district_code = ? LIMIT 5',
        ['DC35']
      );
      console.table(availableWards);
      
      // If no specific ward found, let's use the first municipality in DC35
      console.log('\n🔍 Using first municipality in DC35 as default...');
      const [defaultMuni] = await connection.execute(
        'SELECT municipality_code FROM municipalities WHERE district_code = ? LIMIT 1',
        ['DC35']
      );
      
      if (defaultMuni.length > 0) {
        console.log(`Default municipality: ${defaultMuni[0].municipality_code}`);
        return defaultMuni[0].municipality_code;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
  
  return null;
}

findUserMunicipality();
