/**
 * Check Geographic Codes in Database
 * Analyze existing province, municipality, and ward codes for IEC API mapping
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function checkGeographicCodes() {
  try {
    console.log('🔍 Analyzing Geographic Codes for IEC API Mapping...');
    console.log('=====================================================\n');

    // Import the compiled database connection
    const { initializeDatabase } = require('./backend/dist/config/database');
    await initializeDatabase();
    console.log('✅ Database connection initialized');

    const { executeQuery } = require('./backend/dist/config/database');

    // 1. Check Province Codes
    console.log('\n1️⃣ Current Province Codes in Database:');
    console.log('=====================================');
    const provinces = await executeQuery(`
      SELECT DISTINCT province_code, province_name
      FROM provinces
      ORDER BY province_name
    `);
    
    if (provinces.length > 0) {
      console.table(provinces);
    } else {
      console.log('❌ No provinces found');
    }

    // 2. Check Municipality Codes by Province
    console.log('\n2️⃣ Sample Municipality Codes by Province:');
    console.log('==========================================');
    const municipalities = await executeQuery(`
      SELECT 
        m.municipality_code, 
        m.municipality_name, 
        m.province_code,
        p.province_name,
        m.municipality_type
      FROM municipalities m
      LEFT JOIN provinces p ON m.province_code = p.province_code
      ORDER BY m.province_code, m.municipality_name
      LIMIT 20
    `);
    
    if (municipalities.length > 0) {
      console.table(municipalities);
    } else {
      console.log('❌ No municipalities found');
    }

    // 3. Check Ward Codes
    console.log('\n3️⃣ Sample Ward Codes:');
    console.log('======================');
    const wards = await executeQuery(`
      SELECT 
        w.ward_code, 
        w.ward_name, 
        w.ward_number,
        w.municipality_code,
        w.province_code
      FROM wards w
      ORDER BY w.province_code, w.municipality_code, w.ward_number
      LIMIT 15
    `);
    
    if (wards.length > 0) {
      console.table(wards);
    } else {
      console.log('❌ No wards found');
    }

    // 4. Check for existing IEC-related fields
    console.log('\n4️⃣ Checking for Existing IEC-related Fields:');
    console.log('=============================================');
    
    try {
      const iecFields = await executeQuery(`
        SELECT 
          COLUMN_NAME, 
          TABLE_NAME, 
          DATA_TYPE, 
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND (COLUMN_NAME LIKE '%iec%' OR COLUMN_NAME LIKE '%IEC%')
        ORDER BY TABLE_NAME, COLUMN_NAME
      `);
      
      if (iecFields.length > 0) {
        console.log('✅ Found existing IEC-related fields:');
        console.table(iecFields);
      } else {
        console.log('ℹ️ No existing IEC-specific fields found in geographic tables');
      }
    } catch (error) {
      console.log('⚠️ Could not check for IEC fields:', error.message);
    }

    // 5. Analyze Province Code Patterns
    console.log('\n5️⃣ Province Code Analysis:');
    console.log('===========================');
    
    const provinceStats = await executeQuery(`
      SELECT 
        p.province_code,
        p.province_name,
        COUNT(DISTINCT m.municipality_code) as municipality_count,
        COUNT(DISTINCT w.ward_code) as ward_count,
        COUNT(DISTINCT mem.member_id) as member_count
      FROM provinces p
      LEFT JOIN municipalities m ON p.province_code = m.province_code
      LEFT JOIN wards w ON p.province_code = w.province_code
      LEFT JOIN members mem ON p.province_code = mem.province_code
      GROUP BY p.province_code, p.province_name
      ORDER BY p.province_name
    `);
    
    if (provinceStats.length > 0) {
      console.table(provinceStats);
    }

    // 6. Check for common South African province codes
    console.log('\n6️⃣ Common SA Province Code Mapping Analysis:');
    console.log('=============================================');
    
    const commonCodes = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'];
    const foundCodes = provinces.map(p => p.province_code);
    
    console.log('Expected SA Province Codes: ', commonCodes);
    console.log('Found in Database: ', foundCodes);
    
    const missingCodes = commonCodes.filter(code => !foundCodes.includes(code));
    const extraCodes = foundCodes.filter(code => !commonCodes.includes(code));
    
    if (missingCodes.length > 0) {
      console.log('❌ Missing expected codes:', missingCodes);
    }
    if (extraCodes.length > 0) {
      console.log('ℹ️ Additional codes found:', extraCodes);
    }
    if (missingCodes.length === 0 && extraCodes.length === 0) {
      console.log('✅ All expected SA province codes found');
    }

    // 7. Sample member geographic distribution
    console.log('\n7️⃣ Member Geographic Distribution Sample:');
    console.log('=========================================');
    
    const memberGeo = await executeQuery(`
      SELECT 
        m.province_code,
        COUNT(*) as member_count,
        COUNT(DISTINCT m.municipality_code) as unique_municipalities,
        COUNT(DISTINCT m.ward_code) as unique_wards
      FROM members m
      WHERE m.province_code IS NOT NULL
      GROUP BY m.province_code
      ORDER BY member_count DESC
      LIMIT 10
    `);
    
    if (memberGeo.length > 0) {
      console.table(memberGeo);
    } else {
      console.log('❌ No member geographic data found');
    }

    console.log('\n🎯 Analysis Complete!');
    console.log('======================');
    console.log('✅ Geographic code structure analyzed');
    console.log('✅ Province codes identified');
    console.log('✅ Municipality codes sampled');
    console.log('✅ Ward codes sampled');
    console.log('✅ Member distribution analyzed');
    
    console.log('\n📋 Next Steps for IEC API Integration:');
    console.log('======================================');
    console.log('1. Create IEC ID mapping tables');
    console.log('2. Implement province code to IEC ProvinceID mapping');
    console.log('3. Implement municipality code to IEC MunicipalityID mapping');
    console.log('4. Implement ward code to IEC WardID mapping');
    console.log('5. Create LGE Ballot Results service');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the analysis
if (require.main === module) {
  checkGeographicCodes().then(() => {
    console.log('\n✅ Analysis completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = checkGeographicCodes;
