/**
 * Check wards table structure to understand the relationships
 */

const { Pool } = require('pg');

async function checkWardsTableStructure() {
  console.log('🔍 Checking wards table structure...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Get wards table structure
    const wardsStructureQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'wards'
      ORDER BY ordinal_position;
    `;
    
    const wardsStructure = await pool.query(wardsStructureQuery);
    console.log('\n📋 Wards table structure:');
    console.log('Column Name | Data Type | Nullable | Default');
    console.log('------------|-----------|----------|--------');
    
    wardsStructure.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
    });
    
    // Check municipalities table structure
    const municipalitiesStructureQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'municipalities'
      ORDER BY ordinal_position;
    `;
    
    const municipalitiesStructure = await pool.query(municipalitiesStructureQuery);
    console.log('\n📋 Municipalities table structure:');
    console.log('Column Name | Data Type | Nullable | Default');
    console.log('------------|-----------|----------|--------');
    
    municipalitiesStructure.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(11)} | ${row.data_type.padEnd(9)} | ${row.is_nullable.padEnd(8)} | ${row.column_default || 'NULL'}`);
    });
    
    // Test the correct join path
    console.log('\n🔧 Testing correct join path...');
    const testJoinQuery = `
      SELECT 
        w.ward_code,
        w.ward_name,
        w.municipality_code,
        mu.municipality_name,
        mu.district_code,
        d.district_name,
        d.province_code,
        p.province_name
      FROM wards w
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LIMIT 5;
    `;
    
    const joinResult = await pool.query(testJoinQuery);
    console.log('✅ Join test successful! Sample data:');
    joinResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.ward_name} -> ${row.municipality_name} -> ${row.district_name} -> ${row.province_name}`);
    });
    
    console.log('\n💡 CORRECT JOIN PATH:');
    console.log('wards -> municipalities (via municipality_code)');
    console.log('municipalities -> districts (via district_code)');
    console.log('districts -> provinces (via province_code)');
    
  } catch (error) {
    console.error('❌ Error checking table structures:', error.message);
  } finally {
    await pool.end();
  }
}

checkWardsTableStructure();
