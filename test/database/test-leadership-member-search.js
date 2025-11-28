/**
 * Test Leadership Member Search Fix
 * 
 * This script tests whether the leadership assignment "Select Member" functionality
 * now includes members from metro sub-regions
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

async function testLeadershipMemberSearch() {
  try {
    console.log('🧪 Testing Leadership Member Search Fix\n');
    console.log('=' .repeat(80));

    // Test 1: Get eligible members (simulating the leadership query)
    console.log('\n📊 Test 1: Get Eligible Leadership Members (All Members)');
    console.log('-'.repeat(80));
    
    const eligibleQuery = `
      SELECT
        m.member_id,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number,
        m.firstname as first_name,
        COALESCE(m.surname, '') as last_name,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.id_number,
        COALESCE(m.email, '') as email,
        COALESCE(m.cell_number, '') as phone,
        'Active' as membership_status,
        COALESCE(m.province_code, '') as province_code,
        COALESCE(m.province_name, 'Unknown') as province_name,
        COALESCE(m.municipality_name, 'Unknown') as municipality_name,
        COALESCE(m.municipality_type, '') as municipality_type
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
      ORDER BY m.firstname, m.surname
      LIMIT 10
    `;
    
    const eligibleResult = await pool.query(eligibleQuery);
    console.log(`✅ Found ${eligibleResult.rows.length} eligible members (showing first 10):`);
    
    let metroCount = 0;
    let regularCount = 0;
    
    eligibleResult.rows.forEach(row => {
      const isMetro = row.municipality_type === 'Metro Sub-Region';
      if (isMetro) metroCount++;
      else regularCount++;
      
      console.log(`  ${isMetro ? '🏙️' : '🏘️'} ${row.first_name} ${row.last_name}`);
      console.log(`     Municipality: ${row.municipality_name} (${row.municipality_type})`);
      console.log(`     Province: ${row.province_name} (${row.province_code})`);
      console.log('');
    });
    
    console.log(`Metro members: ${metroCount}, Regular members: ${regularCount}`);

    // Test 2: Get eligible members by province (Gauteng)
    console.log('\n📊 Test 2: Get Eligible Members by Province (Gauteng)');
    console.log('-'.repeat(80));
    
    const provinceQuery = `
      SELECT
        m.member_id,
        m.firstname || ' ' || COALESCE(m.surname, '') as full_name,
        m.province_code,
        m.province_name,
        m.municipality_name,
        m.municipality_type
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
        AND m.province_code = 'GP'
      ORDER BY m.firstname, m.surname
      LIMIT 10
    `;
    
    const provinceResult = await pool.query(provinceQuery);
    console.log(`✅ Found ${provinceResult.rows.length} eligible members in Gauteng (showing first 10):`);
    
    metroCount = 0;
    regularCount = 0;
    
    provinceResult.rows.forEach(row => {
      const isMetro = row.municipality_type === 'Metro Sub-Region';
      if (isMetro) metroCount++;
      else regularCount++;
      
      console.log(`  ${isMetro ? '🏙️' : '🏘️'} ${row.full_name}`);
      console.log(`     Municipality: ${row.municipality_name} (${row.municipality_type})`);
    });
    
    console.log(`\nMetro members: ${metroCount}, Regular members: ${regularCount}`);

    // Test 3: Count eligible members by province
    console.log('\n📊 Test 3: Count Eligible Members by Province');
    console.log('-'.repeat(80));
    
    const countQuery = `
      SELECT 
        m.province_code,
        m.province_name,
        COUNT(*) as total_members,
        COUNT(CASE WHEN m.municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_members,
        COUNT(CASE WHEN m.municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_members
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
        AND m.province_code IN ('GP', 'WC', 'KZN')
      GROUP BY m.province_code, m.province_name
      ORDER BY total_members DESC
    `;
    
    const countResult = await pool.query(countQuery);
    console.log('✅ Eligible member counts by province:');
    
    countResult.rows.forEach(row => {
      const metroPercentage = ((row.metro_members / row.total_members) * 100).toFixed(1);
      console.log(`   ${row.province_name} (${row.province_code}): ${row.total_members} members`);
      console.log(`      🏙️  Metro: ${row.metro_members} (${metroPercentage}%)`);
      console.log(`      🏘️  Regular: ${row.regular_members}`);
    });

    // Test 4: Test with old query (without fix) to show the difference
    console.log('\n📊 Test 4: Comparison - Old Query vs New Query (Gauteng)');
    console.log('-'.repeat(80));
    
    const oldQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      WHERE d.province_code = 'GP'
      AND m.member_id IS NOT NULL
    `;
    
    const newQuery = `
      SELECT COUNT(*) as total
      FROM vw_member_details m
      WHERE m.province_code = 'GP'
      AND m.member_id IS NOT NULL
    `;
    
    const oldResult = await pool.query(oldQuery);
    const newResult = await pool.query(newQuery);
    
    console.log(`Old query (without fix): ${oldResult.rows[0].total} members`);
    console.log(`New query (with fix): ${newResult.rows[0].total} members`);
    console.log(`Difference: ${newResult.rows[0].total - oldResult.rows[0].total} members`);
    
    if (newResult.rows[0].total > oldResult.rows[0].total) {
      console.log('✅ Fix is working! Metro members are now included in leadership selection.');
    } else {
      console.log('⚠️  Warning: No difference detected. Check if there are metro members in the database.');
    }

    // Test 5: Verify metro members have valid data for leadership
    console.log('\n📊 Test 5: Verify Metro Members Have Valid Data for Leadership');
    console.log('-'.repeat(80));
    
    const validationQuery = `
      SELECT 
        COUNT(*) as total_metro_members,
        COUNT(CASE WHEN m.province_code IS NULL THEN 1 END) as null_province_count,
        COUNT(CASE WHEN m.firstname IS NULL OR m.surname IS NULL THEN 1 END) as null_name_count,
        COUNT(CASE WHEN m.id_number IS NULL THEN 1 END) as null_id_count
      FROM vw_member_details m
      WHERE m.municipality_type = 'Metro Sub-Region'
    `;
    
    const validationResult = await pool.query(validationQuery);
    const validation = validationResult.rows[0];
    
    console.log(`✅ Metro member validation for leadership:`);
    console.log(`   Total metro members: ${validation.total_metro_members}`);
    console.log(`   Members with NULL province: ${validation.null_province_count} ${validation.null_province_count === '0' ? '✅' : '❌'}`);
    console.log(`   Members with NULL names: ${validation.null_name_count}`);
    console.log(`   Members with NULL ID: ${validation.null_id_count}`);
    
    if (validation.null_province_count === '0') {
      console.log('\n   🎉 All metro members have valid province codes for leadership selection!');
    } else {
      console.log('\n   ⚠️  Warning: Some metro members have NULL province codes!');
    }

    // Test 6: Test specific metro municipalities for leadership
    console.log('\n📊 Test 6: Test Specific Metro Municipalities for Leadership');
    console.log('-'.repeat(80));
    
    const metroQuery = `
      SELECT 
        m.municipality_name,
        m.municipality_type,
        COUNT(m.member_id) as member_count,
        COUNT(CASE WHEN m.province_code IS NOT NULL THEN 1 END) as members_with_province
      FROM vw_member_details m
      WHERE m.municipality_type IN ('Metropolitan', 'Metro Sub-Region')
        AND m.municipality_code LIKE 'JHB%'
      GROUP BY m.municipality_code, m.municipality_name, m.municipality_type
      ORDER BY m.municipality_name
      LIMIT 10
    `;
    
    const metroResult = await pool.query(metroQuery);
    console.log('✅ Johannesburg Metro breakdown for leadership:');
    
    metroResult.rows.forEach(row => {
      const percentage = ((row.members_with_province / row.member_count) * 100).toFixed(1);
      console.log(`   ${row.municipality_name} (${row.municipality_type}): ${row.member_count} members`);
      console.log(`      With province: ${row.members_with_province} (${percentage}%)`);
    });

    // Test 7: Test War Council eligible members (province-specific)
    console.log('\n📊 Test 7: Test War Council Province-Specific Positions');
    console.log('-'.repeat(80));
    
    const warCouncilQuery = `
      SELECT 
        m.province_code,
        m.province_name,
        COUNT(*) as eligible_members,
        COUNT(CASE WHEN m.municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_members
      FROM vw_member_details m
      WHERE m.member_id IS NOT NULL
        AND m.province_code IS NOT NULL
      GROUP BY m.province_code, m.province_name
      ORDER BY eligible_members DESC
    `;
    
    const warCouncilResult = await pool.query(warCouncilQuery);
    console.log('✅ Eligible members for War Council CCT Deployee positions:');
    
    warCouncilResult.rows.forEach(row => {
      const metroPercentage = ((row.metro_members / row.eligible_members) * 100).toFixed(1);
      console.log(`   ${row.province_name} (${row.province_code}): ${row.eligible_members} eligible`);
      console.log(`      Metro: ${row.metro_members} (${metroPercentage}%)`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ All leadership member search tests completed successfully!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testLeadershipMemberSearch().catch(console.error);

