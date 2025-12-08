const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkIECMappings() {
  try {
    console.log('🔍 Checking IEC Mappings for ID 7808020703087\n');
    console.log('IEC Data from verification:');
    console.log('  Province ID: 3');
    console.log('  Municipality ID: 3003');
    console.log('  Ward ID: 79800135');
    console.log('  VD Number: 32871326\n');
    
    // Check province mapping
    const provinceResult = await pool.query(`
      SELECT * FROM iec_province_mappings 
      WHERE iec_province_id = 3
    `);
    
    console.log('1. Province Mapping:');
    if (provinceResult.rows.length > 0) {
      console.log('  ✅ Found:', provinceResult.rows[0]);
    } else {
      console.log('  ❌ No mapping found for IEC Province ID 3');
    }
    
    // Check municipality mapping
    const municipalityResult = await pool.query(`
      SELECT * FROM iec_municipality_mappings 
      WHERE iec_municipality_id = '3003'
    `);
    
    console.log('\n2. Municipality Mapping:');
    if (municipalityResult.rows.length > 0) {
      console.log('  ✅ Found:', municipalityResult.rows[0]);
    } else {
      console.log('  ❌ No mapping found for IEC Municipality ID 3003');
      
      // Check what municipality mappings exist
      const sampleMuniResult = await pool.query(`
        SELECT * FROM iec_municipality_mappings 
        ORDER BY iec_municipality_id::integer
        LIMIT 10
      `);
      console.log('\n  Sample municipality mappings:');
      sampleMuniResult.rows.forEach(row => {
        console.log(`    IEC ID: ${row.iec_municipality_id} → ${row.municipality_code}`);
      });
    }
    
    // Check ward mapping
    const wardResult = await pool.query(`
      SELECT * FROM iec_ward_mappings 
      WHERE iec_ward_id = '79800135'
    `);
    
    console.log('\n3. Ward Mapping:');
    if (wardResult.rows.length > 0) {
      console.log('  ✅ Found:', wardResult.rows[0]);
    } else {
      console.log('  ❌ No mapping found for IEC Ward ID 79800135');
      
      // Check what ward mappings exist
      const sampleWardResult = await pool.query(`
        SELECT * FROM iec_ward_mappings 
        WHERE iec_ward_id LIKE '798%'
        ORDER BY iec_ward_id
        LIMIT 10
      `);
      console.log('\n  Sample ward mappings starting with 798:');
      if (sampleWardResult.rows.length > 0) {
        sampleWardResult.rows.forEach(row => {
          console.log(`    IEC Ward ID: ${row.iec_ward_id} → Ward Code: ${row.ward_code}`);
        });
      } else {
        console.log('    No ward mappings found starting with 798');
        
        // Check total ward mappings
        const totalWardResult = await pool.query(`
          SELECT COUNT(*) as count FROM iec_ward_mappings
        `);
        console.log(`\n  Total ward mappings in database: ${totalWardResult.rows[0].count}`);
        
        // Show first 10 ward mappings
        const firstWardsResult = await pool.query(`
          SELECT * FROM iec_ward_mappings 
          ORDER BY iec_ward_id
          LIMIT 10
        `);
        console.log('\n  First 10 ward mappings:');
        firstWardsResult.rows.forEach(row => {
          console.log(`    IEC Ward ID: ${row.iec_ward_id} → Ward Code: ${row.ward_code}`);
        });
      }
    }
    
    // Check voting district
    console.log('\n4. Voting District:');
    console.log('  Looking for VD Number: 32871326');
    
    // First, we need the ward code
    if (wardResult.rows.length > 0) {
      const wardCode = wardResult.rows[0].ward_code;
      const vdResult = await pool.query(`
        SELECT * FROM voting_districts 
        WHERE ward_code = $1 AND voting_district_number = '32871326'
      `, [wardCode]);
      
      if (vdResult.rows.length > 0) {
        console.log('  ✅ Found:', vdResult.rows[0]);
      } else {
        console.log(`  ❌ No voting district found for ward ${wardCode} with VD number 32871326`);
      }
    } else {
      console.log('  ⚠️ Cannot check voting district without ward mapping');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkIECMappings();

