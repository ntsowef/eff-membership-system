const mysql = require('mysql2/promise');

async function checkWardsData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking wards data...\n');
    
    // Check total wards
    const [totalWards] = await connection.execute(`
      SELECT COUNT(*) as total FROM wards
    `);
    console.log(`📊 Total wards in database: ${totalWards[0].total}`);
    
    // Check wards for municipality 59500
    const [wardsFor59500] = await connection.execute(`
      SELECT * FROM wards WHERE municipality_code = '59500' LIMIT 5
    `);
    console.log(`📊 Wards for municipality 59500: ${wardsFor59500.length}`);
    
    if (wardsFor59500.length > 0) {
      console.log('📋 Sample wards for 59500:');
      wardsFor59500.forEach((ward, index) => {
        console.log(`   ${index + 1}. Ward ${ward.ward_number} (${ward.ward_code}) - ${ward.ward_name}`);
      });
    }
    
    // Check what municipality codes exist
    const [municipalityCodes] = await connection.execute(`
      SELECT DISTINCT municipality_code, COUNT(*) as ward_count 
      FROM wards 
      GROUP BY municipality_code 
      ORDER BY ward_count DESC 
      LIMIT 10
    `);
    
    console.log('\n📊 Top municipalities by ward count:');
    municipalityCodes.forEach((muni, index) => {
      console.log(`   ${index + 1}. ${muni.municipality_code}: ${muni.ward_count} wards`);
    });
    
    // Check if eThekwini exists with different code
    const [ethekwiniWards] = await connection.execute(`
      SELECT municipality_code, COUNT(*) as ward_count
      FROM wards w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE m.municipality_name LIKE '%eThekwini%' OR m.municipality_name LIKE '%Durban%'
      GROUP BY municipality_code
    `);
    
    console.log('\n📊 eThekwini/Durban wards:');
    if (ethekwiniWards.length > 0) {
      ethekwiniWards.forEach((muni, index) => {
        console.log(`   ${index + 1}. Municipality ${muni.municipality_code}: ${muni.ward_count} wards`);
      });
      
      // Get sample wards for eThekwini
      const ethekwiniCode = ethekwiniWards[0].municipality_code;
      const [sampleEthekwiniWards] = await connection.execute(`
        SELECT ward_code, ward_number, ward_name
        FROM wards 
        WHERE municipality_code = ?
        ORDER BY ward_number
        LIMIT 5
      `, [ethekwiniCode]);
      
      console.log(`\n📋 Sample wards for municipality ${ethekwiniCode}:`);
      sampleEthekwiniWards.forEach((ward, index) => {
        console.log(`   ${index + 1}. Ward ${ward.ward_number} (${ward.ward_code}) - ${ward.ward_name}`);
      });
    } else {
      console.log('   No eThekwini wards found');
    }
    
    // Check voting districts for the wards we found
    if (ethekwiniWards.length > 0) {
      const ethekwiniCode = ethekwiniWards[0].municipality_code;
      const [wardWithVDs] = await connection.execute(`
        SELECT w.ward_code, w.ward_number, COUNT(vd.vd_code) as vd_count
        FROM wards w
        LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code AND vd.is_active = TRUE
        WHERE w.municipality_code = ?
        GROUP BY w.ward_code, w.ward_number
        HAVING vd_count > 0
        ORDER BY vd_count DESC
        LIMIT 5
      `, [ethekwiniCode]);
      
      console.log(`\n🗳️  Wards with voting districts in municipality ${ethekwiniCode}:`);
      wardWithVDs.forEach((ward, index) => {
        console.log(`   ${index + 1}. Ward ${ward.ward_number} (${ward.ward_code}): ${ward.vd_count} voting districts`);
      });
      
      if (wardWithVDs.length > 0) {
        const testWard = wardWithVDs[0];
        console.log(`\n🎯 Testing voting districts for ward ${testWard.ward_code}:`);
        
        const [votingDistricts] = await connection.execute(`
          SELECT vd_code, vd_name, voting_district_number
          FROM voting_districts
          WHERE ward_code = ? AND is_active = TRUE
          ORDER BY voting_district_number
          LIMIT 5
        `, [testWard.ward_code]);
        
        votingDistricts.forEach((vd, index) => {
          console.log(`   ${index + 1}. VD ${vd.voting_district_number} - ${vd.vd_name} (${vd.vd_code})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check wards data:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkWardsData();
