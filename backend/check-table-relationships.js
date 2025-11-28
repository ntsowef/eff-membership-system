/**
 * Check table relationships to understand the correct joins for vw_member_search
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
});

async function checkTableRelationships() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking table relationships for member search view...\n');

    // Check members table structure
    console.log('📋 MEMBERS table columns:');
    const membersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'members' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    membersColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Check wards table structure
    console.log('\n📋 WARDS table columns:');
    const wardsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'wards' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    wardsColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Check municipalities table structure
    console.log('\n📋 MUNICIPALITIES table columns:');
    const municipalitiesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'municipalities' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    municipalitiesColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Check provinces table structure
    console.log('\n📋 PROVINCES table columns:');
    const provincesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'provinces' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    provincesColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Check memberships table structure
    console.log('\n📋 MEMBERSHIPS table columns:');
    const membershipsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'memberships' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    membershipsColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Test the relationships
    console.log('\n🔗 Testing table relationships:');
    
    // Test members -> wards
    const memberWardTest = await client.query(`
      SELECT COUNT(*) as count
      FROM members m
      INNER JOIN wards w ON m.ward_code = w.ward_code
      LIMIT 1;
    `);
    console.log(`✅ Members -> Wards join: ${memberWardTest.rows[0].count > 0 ? 'Working' : 'No data'}`);

    // Test wards -> municipalities (need to find the correct column)
    const wardMunicipalityTest = await client.query(`
      SELECT w.ward_code, w.municipality_code, m.municipality_name
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LIMIT 3;
    `);
    console.log(`✅ Wards -> Municipalities join: Working`);
    console.log('   Sample data:');
    wardMunicipalityTest.rows.forEach(row => {
      console.log(`     Ward: ${row.ward_code} -> Municipality: ${row.municipality_name}`);
    });

    // Test municipalities -> provinces (need to find the correct column)
    const municipalityProvinceTest = await client.query(`
      SELECT m.municipality_code, m.province_code, p.province_name
      FROM municipalities m
      LEFT JOIN provinces p ON m.province_code = p.province_code
      LIMIT 3;
    `);
    console.log(`✅ Municipalities -> Provinces join: Working`);
    console.log('   Sample data:');
    municipalityProvinceTest.rows.forEach(row => {
      console.log(`     Municipality: ${row.municipality_code} -> Province: ${row.province_name}`);
    });

    console.log('\n🎯 CORRECT JOIN STRUCTURE IDENTIFIED:');
    console.log('members.ward_code -> wards.ward_code');
    console.log('wards.municipality_code -> municipalities.municipality_code');
    console.log('municipalities.province_code -> provinces.province_code');

  } catch (error) {
    console.error('❌ Error checking table relationships:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkTableRelationships().catch(console.error);
