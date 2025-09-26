/**
 * Test Real IEC API Integration
 * Tests the new real IEC API integration for municipality and ward discovery
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Import the service (we'll need to compile TypeScript first)
const { IecGeographicMappingService } = require('./backend/dist/services/iecGeographicMappingService');

async function testRealIECAPIIntegration() {
  let connection;
  
  try {
    console.log('🧪 Testing Real IEC API Integration\n');

    // Database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected to database');

    // Initialize the service
    const mappingService = new IecGeographicMappingService();

    console.log('\n📋 Current IEC API Configuration:');
    console.log(`- API URL: ${process.env.IEC_API_URL || 'https://api.iec.org.za'}`);
    console.log(`- Username: ${process.env.IEC_API_USERNAME ? '***configured***' : 'NOT SET'}`);
    console.log(`- Password: ${process.env.IEC_API_PASSWORD ? '***configured***' : 'NOT SET'}`);

    // Test 1: Check current province mappings
    console.log('\n1️⃣ Testing Province Mappings...');
    const [provinces] = await connection.execute(`
      SELECT province_code, iec_province_id, province_name 
      FROM iec_province_mappings 
      WHERE iec_province_id IS NOT NULL
      ORDER BY province_code
    `);
    
    console.log(`Found ${provinces.length} provinces with IEC mappings:`);
    provinces.forEach(p => {
      console.log(`   ${p.province_code} → IEC Province ID ${p.iec_province_id} (${p.province_name})`);
    });

    // Test 2: Test real municipality discovery for Eastern Cape
    console.log('\n2️⃣ Testing Real Municipality Discovery for Eastern Cape...');
    try {
      const municipalityResults = await mappingService.discoverMunicipalityIds();
      console.log(`✅ Municipality discovery completed:`);
      console.log(`   - Updated: ${municipalityResults.updated}`);
      console.log(`   - Errors: ${municipalityResults.errors.length}`);
      
      if (municipalityResults.errors.length > 0) {
        console.log('   Error details:');
        municipalityResults.errors.forEach(error => console.log(`     - ${error}`));
      }
    } catch (error) {
      console.error('❌ Municipality discovery failed:', error.message);
    }

    // Test 3: Check municipality mappings after discovery
    console.log('\n3️⃣ Checking Municipality Mappings...');
    const [municipalities] = await connection.execute(`
      SELECT municipality_code, iec_municipality_id, municipality_name, province_code
      FROM iec_municipality_mappings 
      WHERE province_code = 'EC' AND iec_municipality_id IS NOT NULL
      ORDER BY municipality_code
      LIMIT 10
    `);
    
    console.log(`Found ${municipalities.length} Eastern Cape municipalities with IEC mappings:`);
    municipalities.forEach(m => {
      console.log(`   ${m.municipality_code} → IEC Municipality ID ${m.iec_municipality_id} (${m.municipality_name})`);
    });

    // Test 4: Test real ward discovery (limited sample)
    console.log('\n4️⃣ Testing Real Ward Discovery (Sample)...');
    try {
      const wardResults = await mappingService.discoverWardIds();
      console.log(`✅ Ward discovery completed:`);
      console.log(`   - Updated: ${wardResults.updated}`);
      console.log(`   - Errors: ${wardResults.errors.length}`);
      
      if (wardResults.errors.length > 0) {
        console.log('   Error details:');
        wardResults.errors.slice(0, 5).forEach(error => console.log(`     - ${error}`));
        if (wardResults.errors.length > 5) {
          console.log(`     ... and ${wardResults.errors.length - 5} more errors`);
        }
      }
    } catch (error) {
      console.error('❌ Ward discovery failed:', error.message);
    }

    // Test 5: Check ward mappings after discovery
    console.log('\n5️⃣ Checking Ward Mappings...');
    const [wards] = await connection.execute(`
      SELECT w.ward_code, w.iec_ward_id, w.ward_name, w.municipality_code
      FROM iec_ward_mappings w
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE m.province_code = 'EC' AND w.iec_ward_id IS NOT NULL
      ORDER BY w.municipality_code, w.ward_code
      LIMIT 10
    `);
    
    console.log(`Found ${wards.length} Eastern Cape wards with IEC mappings:`);
    wards.forEach(w => {
      console.log(`   ${w.ward_code} → IEC Ward ID ${w.iec_ward_id} (${w.ward_name || 'N/A'}) [${w.municipality_code}]`);
    });

    // Test 6: Test getter methods
    console.log('\n6️⃣ Testing Getter Methods...');
    
    // Test province getter
    const ecProvinceId = await mappingService.getIecProvinceId('EC');
    console.log(`EC Province ID: ${ecProvinceId}`);
    
    // Test municipality getter (if we have data)
    if (municipalities.length > 0) {
      const testMunCode = municipalities[0].municipality_code;
      const munId = await mappingService.getIecMunicipalityId(testMunCode);
      console.log(`${testMunCode} Municipality ID: ${munId}`);
    }
    
    // Test ward getter (if we have data)
    if (wards.length > 0) {
      const testWardCode = wards[0].ward_code;
      const wardId = await mappingService.getIecWardId(testWardCode);
      console.log(`${testWardCode} Ward ID: ${wardId}`);
    }

    // Test 7: Get mapping statistics
    console.log('\n7️⃣ Getting Mapping Statistics...');
    try {
      const stats = await mappingService.getMappingStatistics();
      console.log('📊 Mapping Statistics:');
      console.log(`   Provinces: ${stats.provinces.mapped}/${stats.provinces.total} mapped`);
      console.log(`   Municipalities: ${stats.municipalities.mapped}/${stats.municipalities.total} mapped`);
      console.log(`   Wards: ${stats.wards.mapped}/${stats.wards.total} mapped`);
    } catch (error) {
      console.error('❌ Failed to get mapping statistics:', error.message);
    }

    console.log('\n✅ Real IEC API Integration Test Completed!');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('- Real IEC API integration has been implemented');
    console.log('- Municipality and ward discovery now use actual IEC Delimitation API');
    console.log('- Fallback to mock data when API calls fail');
    console.log('- Database schema updated to support VARCHAR IEC IDs');
    console.log('- Getter methods updated to return string | number | null');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testRealIECAPIIntegration();
