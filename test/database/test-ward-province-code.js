/**
 * Test Ward Province Code
 * 
 * This script checks if wards have province_code populated correctly
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function testWardProvinceCode() {
  try {
    const wardCode = process.argv[2];
    
    console.log('🔍 Testing Ward Province Code\n');
    console.log('=' .repeat(80));

    // Test 1: Check vw_ward_compliance_summary
    console.log('\n📊 Test 1: Check vw_ward_compliance_summary');
    console.log('-'.repeat(80));
    
    let query = `
      SELECT 
        ward_code,
        ward_name,
        municipality_code,
        municipality_name,
        district_code,
        province_code
      FROM vw_ward_compliance_summary
    `;
    
    const params = [];
    if (wardCode) {
      query += ' WHERE ward_code = $1';
      params.push(wardCode);
      console.log(`Checking specific ward: ${wardCode}`);
    } else {
      query += ' LIMIT 10';
      console.log('Checking first 10 wards');
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      console.log('❌ No wards found');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} ward(s):\n`);
    
    let nullProvinceCount = 0;
    result.rows.forEach(row => {
      const hasProvince = row.province_code ? '✅' : '❌';
      if (!row.province_code) nullProvinceCount++;
      
      console.log(`${hasProvince} Ward: ${row.ward_name} (${row.ward_code})`);
      console.log(`   Municipality: ${row.municipality_name} (${row.municipality_code})`);
      console.log(`   District: ${row.district_code || 'NULL'}`);
      console.log(`   Province: ${row.province_code || 'NULL'}`);
      console.log('');
    });
    
    if (nullProvinceCount > 0) {
      console.log(`⚠️  Warning: ${nullProvinceCount} ward(s) have NULL province_code`);
    } else {
      console.log('✅ All wards have province_code populated');
    }

    // Test 2: Check direct ward table
    console.log('\n📊 Test 2: Check wards table directly');
    console.log('-'.repeat(80));
    
    query = `
      SELECT 
        w.ward_code,
        w.ward_name,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        mu.district_code,
        COALESCE(mu.district_code, pm.district_code) as resolved_district_code,
        COALESCE(d.province_code, pd.province_code) as resolved_province_code
      FROM wards w
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
    `;
    
    if (wardCode) {
      query += ' WHERE w.ward_code = $1';
    } else {
      query += ' LIMIT 10';
    }
    
    const directResult = await pool.query(query, params);
    
    console.log(`✅ Found ${directResult.rows.length} ward(s) in wards table:\n`);
    
    nullProvinceCount = 0;
    directResult.rows.forEach(row => {
      const hasProvince = row.resolved_province_code ? '✅' : '❌';
      if (!row.resolved_province_code) nullProvinceCount++;
      
      console.log(`${hasProvince} Ward: ${row.ward_name} (${row.ward_code})`);
      console.log(`   Municipality: ${row.municipality_name} (${row.municipality_type})`);
      console.log(`   Direct District: ${row.district_code || 'NULL'}`);
      console.log(`   Resolved District: ${row.resolved_district_code || 'NULL'}`);
      console.log(`   Resolved Province: ${row.resolved_province_code || 'NULL'}`);
      console.log('');
    });
    
    if (nullProvinceCount > 0) {
      console.log(`⚠️  Warning: ${nullProvinceCount} ward(s) have NULL resolved_province_code`);
    } else {
      console.log('✅ All wards have resolved_province_code');
    }

    // Test 3: Check if getMembersByProvince would return members
    if (wardCode) {
      console.log('\n📊 Test 3: Check if members would be returned for this ward');
      console.log('-'.repeat(80));
      
      const wardInfo = directResult.rows[0];
      if (wardInfo && wardInfo.resolved_province_code) {
        const provinceCode = wardInfo.resolved_province_code;
        console.log(`Province code: ${provinceCode}`);
        
        const membersQuery = `
          SELECT COUNT(*) as count
          FROM members m
          LEFT JOIN wards w ON m.ward_code = w.ward_code
          LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
          LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
          LEFT JOIN districts d ON mu.district_code = d.district_code
          LEFT JOIN districts pd ON pm.district_code = pd.district_code
          WHERE COALESCE(d.province_code, pd.province_code) = $1
          AND m.firstname IS NOT NULL
          AND m.surname IS NOT NULL
        `;
        
        const membersResult = await pool.query(membersQuery, [provinceCode]);
        const memberCount = membersResult.rows[0].count;
        
        console.log(`✅ Found ${memberCount} eligible members in province ${provinceCode}`);
        
        if (memberCount === 0) {
          console.log('❌ No members found! This is why the dropdown shows 0 eligible members.');
        } else {
          console.log('✅ Members are available. The issue might be in the API call or frontend.');
        }
      } else {
        console.log('❌ Ward has no province_code, cannot check members');
      }
    }

    // Test 4: Check vw_ward_compliance_summary definition
    console.log('\n📊 Test 4: Check if vw_ward_compliance_summary includes province_code');
    console.log('-'.repeat(80));
    
    const viewQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vw_ward_compliance_summary'
      AND column_name IN ('province_code', 'district_code', 'municipality_code')
      ORDER BY column_name
    `;
    
    const viewResult = await pool.query(viewQuery);
    
    console.log('Columns in vw_ward_compliance_summary:');
    viewResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    if (viewResult.rows.find(r => r.column_name === 'province_code')) {
      console.log('\n✅ province_code column exists in view');
    } else {
      console.log('\n❌ province_code column is MISSING from view!');
      console.log('   This is the problem! The view needs to be updated.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Ward province code test completed');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testWardProvinceCode().catch(console.error);

