/**
 * Check Eastern Cape Data in Database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function checkEasternCapeData() {
  try {
    console.log('🔍 Checking Eastern Cape Data in Database');
    console.log('=========================================\n');

    const { initializeDatabase } = require('./backend/dist/config/database');
    await initializeDatabase();
    const { executeQuery } = require('./backend/dist/config/database');

    console.log('1️⃣ Eastern Cape Municipalities:');
    console.log('================================');
    
    const municipalities = await executeQuery(`
      SELECT municipality_code, municipality_name, municipality_type
      FROM municipalities 
      WHERE province_code = 'EC'
      ORDER BY municipality_code
    `);
    
    console.table(municipalities);
    
    console.log('\n2️⃣ Eastern Cape Wards (Sample):');
    console.log('===============================');
    
    const wards = await executeQuery(`
      SELECT w.ward_code, w.ward_number, w.ward_name, w.municipality_code, m.municipality_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.province_code = 'EC'
      ORDER BY w.municipality_code, w.ward_number
      LIMIT 20
    `);
    
    console.table(wards);
    
    console.log('\n3️⃣ Eastern Cape Data Summary:');
    console.log('=============================');
    
    const summary = await executeQuery(`
      SELECT 
        COUNT(DISTINCT m.municipality_code) as municipality_count,
        COUNT(DISTINCT w.ward_code) as ward_count
      FROM municipalities m
      LEFT JOIN wards w ON m.municipality_code = w.municipality_code
      WHERE m.province_code = 'EC'
    `);
    
    console.table(summary);

    console.log('\n4️⃣ Current IEC Mappings for Eastern Cape:');
    console.log('=========================================');
    
    // Check province mapping
    const provinceMapping = await executeQuery(`
      SELECT province_code, province_name, iec_province_id, iec_province_name
      FROM iec_province_mappings
      WHERE province_code = 'EC'
    `);
    
    console.log('Province Mapping:');
    console.table(provinceMapping);
    
    // Check municipality mappings
    const municipalityMappings = await executeQuery(`
      SELECT municipality_code, municipality_name, iec_municipality_id, iec_municipality_name
      FROM iec_municipality_mappings
      WHERE province_code = 'EC'
      ORDER BY municipality_code
    `);
    
    console.log('\nMunicipality Mappings:');
    if (municipalityMappings.length > 0) {
      console.table(municipalityMappings);
    } else {
      console.log('❌ No municipality mappings found for Eastern Cape');
    }
    
    // Check ward mappings
    const wardMappings = await executeQuery(`
      SELECT ward_code, ward_name, municipality_code, iec_ward_id, iec_ward_name
      FROM iec_ward_mappings
      WHERE province_code = 'EC'
      ORDER BY municipality_code, ward_code
      LIMIT 10
    `);
    
    console.log('\nWard Mappings (Sample):');
    if (wardMappings.length > 0) {
      console.table(wardMappings);
    } else {
      console.log('❌ No ward mappings found for Eastern Cape');
    }

    console.log('\n📋 Eastern Cape Municipalities for IEC Mapping:');
    console.log('===============================================');
    municipalities.forEach((muni, index) => {
      console.log(`${index + 1}. ${muni.municipality_code} - ${muni.municipality_name} (${muni.municipality_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkEasternCapeData();
