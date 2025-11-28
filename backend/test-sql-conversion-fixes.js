/**
 * Test the SQL conversion fixes for NULLIF, DATE_SUB, DATE_FORMAT, etc.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Import the SQLMigrationService
const { SQLMigrationService } = require('./dist/services/sqlMigrationService');

async function testSQLConversions() {
  console.log('🧪 Testing SQL conversion fixes...');
  
  try {
    // Test 1: NULLIF function (should remain unchanged)
    console.log('\n1️⃣ Testing NULLIF function conversion...');
    const nullifQuery = `
      SELECT 
        COUNT(*) as total,
        ROUND(COUNT(*) * 100.0 / NULLIF(COUNT(*), 0), 2) as percentage
      FROM members 
      LIMIT 1
    `;
    
    const convertedNullif = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(nullifQuery) : nullifQuery;
    
    console.log('Original:', nullifQuery.trim());
    console.log('Converted:', convertedNullif.trim());
    
    if (convertedNullif.includes('NULLIF')) {
      console.log('✅ NULLIF function preserved correctly');
    } else {
      console.log('❌ NULLIF function was incorrectly converted');
    }
    
    // Test 2: DATE_SUB function
    console.log('\n2️⃣ Testing DATE_SUB function conversion...');
    const dateSubQuery = `
      SELECT COUNT(*) 
      FROM members 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    
    const convertedDateSub = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(dateSubQuery) : dateSubQuery;
    
    console.log('Original:', dateSubQuery.trim());
    console.log('Converted:', convertedDateSub.trim());
    
    if (convertedDateSub.includes('INTERVAL') && convertedDateSub.includes('-')) {
      console.log('✅ DATE_SUB function converted correctly');
    } else {
      console.log('❌ DATE_SUB function conversion failed');
    }
    
    // Test 3: DATE_FORMAT function
    console.log('\n3️⃣ Testing DATE_FORMAT function conversion...');
    const dateFormatQuery = `
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month_year
      FROM members 
      LIMIT 1
    `;
    
    const convertedDateFormat = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(dateFormatQuery) : dateFormatQuery;
    
    console.log('Original:', dateFormatQuery.trim());
    console.log('Converted:', convertedDateFormat.trim());
    
    if (convertedDateFormat.includes('TO_CHAR')) {
      console.log('✅ DATE_FORMAT function converted correctly');
    } else {
      console.log('❌ DATE_FORMAT function conversion failed');
    }
    
    // Test 4: MONTHNAME function
    console.log('\n4️⃣ Testing MONTHNAME function conversion...');
    const monthnameQuery = `
      SELECT MONTHNAME(created_at) as month_name
      FROM members 
      LIMIT 1
    `;
    
    const convertedMonthname = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(monthnameQuery) : monthnameQuery;
    
    console.log('Original:', monthnameQuery.trim());
    console.log('Converted:', convertedMonthname.trim());
    
    if (convertedMonthname.includes('TO_CHAR') && convertedMonthname.includes('Month')) {
      console.log('✅ MONTHNAME function converted correctly');
    } else {
      console.log('❌ MONTHNAME function conversion failed');
    }
    
    // Test 5: Parameter placeholder conversion
    console.log('\n5️⃣ Testing parameter placeholder conversion...');
    const paramQuery = `
      SELECT * FROM members 
      WHERE province_code = ? AND age > ? 
      LIMIT ?
    `;
    
    const convertedParam = SQLMigrationService.convertComplexMySQLQuery ? 
      SQLMigrationService.convertComplexMySQLQuery(paramQuery) : paramQuery;
    
    console.log('Original:', paramQuery.trim());
    console.log('Converted:', convertedParam.trim());
    
    if (convertedParam.includes('$1') && convertedParam.includes('$2') && convertedParam.includes('$3')) {
      console.log('✅ Parameter placeholders converted correctly');
    } else {
      console.log('❌ Parameter placeholder conversion failed');
    }
    
    console.log('\n🎉 SQL conversion testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testSQLConversions();
