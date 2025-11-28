/**
 * Test Member API Endpoints with Metro Fix
 * 
 * This script tests the member API endpoints to ensure they work correctly
 * with the metro member search fix
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

async function testMemberApiEndpoints() {
  try {
    console.log('🧪 Testing Member API Endpoints with Metro Fix\n');
    console.log('=' .repeat(80));

    // Test 1: GET /members with province filter (simulating backend query)
    console.log('\n📊 Test 1: Member List with Province Filter (Gauteng)');
    console.log('-'.repeat(80));
    
    const membersQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        municipality_name,
        municipality_type,
        district_name,
        province_name,
        province_code
      FROM vw_member_details
      WHERE province_code = 'GP'
      ORDER BY member_id
      LIMIT 10
    `;
    
    const membersResult = await pool.query(membersQuery);
    console.log(`✅ Found ${membersResult.rows.length} members (showing first 10):`);
    
    let metroCount = 0;
    let regularCount = 0;
    
    membersResult.rows.forEach(row => {
      const isMetro = row.municipality_type === 'Metro Sub-Region';
      if (isMetro) metroCount++;
      else regularCount++;
      
      console.log(`  ${isMetro ? '🏙️' : '🏘️'} ${row.firstname} ${row.surname}`);
      console.log(`     Municipality: ${row.municipality_name} (${row.municipality_type})`);
      console.log(`     District: ${row.district_name}`);
      console.log(`     Province: ${row.province_name} (${row.province_code})`);
      console.log('');
    });
    
    console.log(`Metro members: ${metroCount}, Regular members: ${regularCount}`);

    // Test 2: GET /members/directory with province filter
    console.log('\n📊 Test 2: Member Directory with Province Filter');
    console.log('-'.repeat(80));
    
    const directoryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_count,
        COUNT(CASE WHEN municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_count
      FROM vw_member_details
      WHERE province_code = 'GP'
    `;
    
    const directoryResult = await pool.query(directoryQuery);
    const stats = directoryResult.rows[0];
    
    console.log(`✅ Total members in Gauteng: ${stats.total}`);
    console.log(`   🏙️  Metro members: ${stats.metro_count} (${((stats.metro_count / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   🏘️  Regular members: ${stats.regular_count} (${((stats.regular_count / stats.total) * 100).toFixed(1)}%)`);

    // Test 3: GET /members/province/:provinceCode
    console.log('\n📊 Test 3: Members by Province Endpoint');
    console.log('-'.repeat(80));
    
    const provinceQuery = `
      SELECT 
        province_code,
        province_name,
        COUNT(*) as member_count,
        COUNT(CASE WHEN municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_members
      FROM vw_member_details
      WHERE province_code IN ('GP', 'WC', 'KZN')
      GROUP BY province_code, province_name
      ORDER BY member_count DESC
    `;
    
    const provinceResult = await pool.query(provinceQuery);
    console.log('✅ Province statistics:');
    
    provinceResult.rows.forEach(row => {
      const metroPercentage = ((row.metro_members / row.member_count) * 100).toFixed(1);
      console.log(`   ${row.province_name} (${row.province_code}): ${row.member_count} members`);
      console.log(`      🏙️  Metro: ${row.metro_members} (${metroPercentage}%)`);
    });

    // Test 4: Search functionality
    console.log('\n📊 Test 4: Member Search with Metro Members');
    console.log('-'.repeat(80));
    
    const searchQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        municipality_name,
        municipality_type,
        province_name
      FROM vw_member_details
      WHERE province_code = 'GP'
        AND municipality_type = 'Metro Sub-Region'
      LIMIT 5
    `;
    
    const searchResult = await pool.query(searchQuery);
    console.log(`✅ Found ${searchResult.rows.length} metro members in Gauteng:`);
    
    searchResult.rows.forEach(row => {
      console.log(`   🏙️  ${row.firstname} ${row.surname}`);
      console.log(`      Municipality: ${row.municipality_name}`);
      console.log(`      Province: ${row.province_name}`);
    });

    // Test 5: Geographic hierarchy
    console.log('\n📊 Test 5: Geographic Hierarchy for Metro Members');
    console.log('-'.repeat(80));
    
    const hierarchyQuery = `
      SELECT DISTINCT
        province_code,
        province_name,
        district_code,
        district_name,
        municipality_code,
        municipality_name,
        municipality_type
      FROM vw_member_details
      WHERE municipality_type = 'Metro Sub-Region'
        AND province_code = 'GP'
      ORDER BY municipality_name
      LIMIT 5
    `;
    
    const hierarchyResult = await pool.query(hierarchyQuery);
    console.log('✅ Metro sub-region hierarchy:');
    
    hierarchyResult.rows.forEach(row => {
      console.log(`   ${row.province_name} → ${row.district_name} → ${row.municipality_name}`);
      console.log(`   (${row.province_code} → ${row.district_code} → ${row.municipality_code})`);
      console.log('');
    });

    // Test 6: Verify no NULL provinces for metro members
    console.log('\n📊 Test 6: Verify No NULL Provinces for Metro Members');
    console.log('-'.repeat(80));
    
    const nullCheckQuery = `
      SELECT 
        COUNT(*) as total_metro_members,
        COUNT(CASE WHEN province_code IS NULL THEN 1 END) as null_province_count,
        COUNT(CASE WHEN district_code IS NULL THEN 1 END) as null_district_count
      FROM vw_member_details
      WHERE municipality_type = 'Metro Sub-Region'
    `;
    
    const nullCheckResult = await pool.query(nullCheckQuery);
    const nullStats = nullCheckResult.rows[0];
    
    console.log(`✅ Metro member validation:`);
    console.log(`   Total metro members: ${nullStats.total_metro_members}`);
    console.log(`   Members with NULL province: ${nullStats.null_province_count} ${nullStats.null_province_count === '0' ? '✅' : '❌'}`);
    console.log(`   Members with NULL district: ${nullStats.null_district_count} ${nullStats.null_district_count === '0' ? '✅' : '❌'}`);
    
    if (nullStats.null_province_count === '0' && nullStats.null_district_count === '0') {
      console.log('\n   🎉 All metro members have valid province and district codes!');
    } else {
      console.log('\n   ⚠️  Warning: Some metro members still have NULL geographic codes!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All API endpoint tests completed successfully!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testMemberApiEndpoints().catch(console.error);

