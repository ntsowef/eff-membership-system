/**
 * Test Metro Member Search Issue
 * 
 * This script tests whether members in metro sub-regions appear when filtering by province
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

async function testMetroMemberSearch() {
  try {
    console.log('🔍 Testing Metro Member Search Issue\n');
    console.log('=' .repeat(80));

    // Step 1: Check metro municipalities structure
    console.log('\n📊 Step 1: Checking Metro Municipalities Structure');
    console.log('-'.repeat(80));
    
    const metroQuery = `
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        m.district_code,
        m.parent_municipality_id,
        pm.municipality_code as parent_code,
        pm.municipality_name as parent_name,
        pm.district_code as parent_district_code,
        d.province_code
      FROM municipalities m
      LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON pm.district_code = d.district_code
      WHERE m.municipality_type IN ('Metropolitan', 'Metro Sub-Region')
      ORDER BY m.municipality_type, m.municipality_name
      LIMIT 10
    `;
    
    const metroResult = await pool.query(metroQuery);
    console.log(`Found ${metroResult.rows.length} metro municipalities/sub-regions:`);
    metroResult.rows.forEach(row => {
      console.log(`  - ${row.municipality_name} (${row.municipality_code})`);
      console.log(`    Type: ${row.municipality_type}`);
      console.log(`    District Code: ${row.district_code || 'NULL'}`);
      if (row.parent_name) {
        console.log(`    Parent: ${row.parent_name} (${row.parent_code})`);
        console.log(`    Parent District: ${row.parent_district_code}`);
        console.log(`    Province: ${row.province_code}`);
      }
      console.log('');
    });

    // Step 2: Check members in metro sub-regions
    console.log('\n📊 Step 2: Checking Members in Metro Sub-Regions');
    console.log('-'.repeat(80));
    
    const memberQuery = `
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        m.ward_code,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        mu.district_code as direct_district_code,
        mu.parent_municipality_id,
        pm.municipality_code as parent_code,
        pm.municipality_name as parent_name,
        pm.district_code as parent_district_code,
        d.province_code as direct_province,
        pd.province_code as parent_province
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      WHERE mu.municipality_type = 'Metro Sub-Region'
      LIMIT 5
    `;
    
    const memberResult = await pool.query(memberQuery);
    console.log(`Found ${memberResult.rows.length} members in metro sub-regions:`);
    memberResult.rows.forEach(row => {
      console.log(`  - ${row.firstname} ${row.surname} (ID: ${row.member_id})`);
      console.log(`    Ward: ${row.ward_code}`);
      console.log(`    Municipality: ${row.municipality_name} (${row.municipality_code})`);
      console.log(`    Type: ${row.municipality_type}`);
      console.log(`    Direct District Code: ${row.direct_district_code || 'NULL'}`);
      console.log(`    Direct Province: ${row.direct_province || 'NULL'}`);
      console.log(`    Parent Metro: ${row.parent_name} (${row.parent_code})`);
      console.log(`    Parent District: ${row.parent_district_code}`);
      console.log(`    Parent Province: ${row.parent_province}`);
      console.log('');
    });

    // Step 3: Test vw_member_details view for metro members
    console.log('\n📊 Step 3: Testing vw_member_details View for Metro Members');
    console.log('-'.repeat(80));
    
    const viewQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        ward_code,
        municipality_code,
        municipality_name,
        district_code,
        district_name,
        province_code,
        province_name
      FROM vw_member_details
      WHERE municipality_code IN (
        SELECT municipality_code 
        FROM municipalities 
        WHERE municipality_type = 'Metro Sub-Region'
      )
      LIMIT 5
    `;
    
    const viewResult = await pool.query(viewQuery);
    console.log(`Found ${viewResult.rows.length} members in vw_member_details with metro sub-regions:`);
    viewResult.rows.forEach(row => {
      console.log(`  - ${row.firstname} ${row.surname} (ID: ${row.member_id})`);
      console.log(`    Municipality: ${row.municipality_name} (${row.municipality_code})`);
      console.log(`    District: ${row.district_name || 'NULL'} (${row.district_code || 'NULL'})`);
      console.log(`    Province: ${row.province_name || 'NULL'} (${row.province_code || 'NULL'})`);
      console.log('');
    });

    // Step 4: Test province filtering
    console.log('\n📊 Step 4: Testing Province Filtering (Gauteng - GP)');
    console.log('-'.repeat(80));
    
    // First, count all members in Gauteng (including metros)
    const allGautengQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON COALESCE(mu.district_code, pm.district_code) = d.district_code
      WHERE d.province_code = 'GP'
    `;
    
    const allGautengResult = await pool.query(allGautengQuery);
    console.log(`Total members in Gauteng (with COALESCE fix): ${allGautengResult.rows[0].total}`);
    
    // Now test the current view
    const viewGautengQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details
      WHERE province_code = 'GP'
    `;
    
    const viewGautengResult = await pool.query(viewGautengQuery);
    console.log(`Total members in Gauteng (current view): ${viewGautengResult.rows[0].total}`);
    
    const difference = allGautengResult.rows[0].total - viewGautengResult.rows[0].total;
    console.log(`\n⚠️  Missing members: ${difference}`);
    
    if (difference > 0) {
      console.log('❌ ISSUE CONFIRMED: Metro sub-region members are missing from province search!');
    } else {
      console.log('✅ No issue found: All members are included in province search.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testMetroMemberSearch().catch(console.error);

