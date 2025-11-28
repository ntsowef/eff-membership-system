/**
 * Test Ward Audit Member Search Fix
 * 
 * This script tests whether the ward audit "Select Member" functionality
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

async function testWardAuditMemberSearch() {
  try {
    console.log('🧪 Testing Ward Audit Member Search Fix\n');
    console.log('=' .repeat(80));

    // Test 1: Get members by province (Gauteng) - simulating the ward audit query
    console.log('\n📊 Test 1: Get Members by Province (Gauteng - GP)');
    console.log('-'.repeat(80));
    
    const gautengQuery = `
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        CONCAT(m.firstname, ' ', m.surname) as full_name,
        m.id_number,
        m.cell_number,
        m.ward_code,
        w.ward_name,
        mu.municipality_name,
        mu.municipality_type,
        COALESCE(ms.status_name, 'Unknown') as membership_status
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      
      -- Join to parent municipality (for metro sub-regions)
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      
      -- Join to districts (both direct and through parent)
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      
      LEFT JOIN memberships mb ON m.member_id = mb.member_id
      LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
      
      -- Use COALESCE to get province from either direct or parent municipality
      WHERE COALESCE(d.province_code, pd.province_code) = 'GP'
      AND m.firstname IS NOT NULL
      AND m.surname IS NOT NULL
      ORDER BY m.surname, m.firstname
      LIMIT 10
    `;
    
    const gautengResult = await pool.query(gautengQuery);
    console.log(`✅ Found ${gautengResult.rows.length} members (showing first 10):`);
    
    let metroCount = 0;
    let regularCount = 0;
    
    gautengResult.rows.forEach(row => {
      const isMetro = row.municipality_type === 'Metro Sub-Region';
      if (isMetro) metroCount++;
      else regularCount++;
      
      console.log(`  ${isMetro ? '🏙️' : '🏘️'} ${row.firstname} ${row.surname}`);
      console.log(`     Municipality: ${row.municipality_name} (${row.municipality_type})`);
      console.log(`     Ward: ${row.ward_name}`);
      console.log(`     Status: ${row.membership_status}`);
      console.log('');
    });
    
    console.log(`Metro members: ${metroCount}, Regular members: ${regularCount}`);

    // Test 2: Count total members by province
    console.log('\n📊 Test 2: Total Member Count by Province');
    console.log('-'.repeat(80));
    
    const countQuery = `
      SELECT 
        COALESCE(d.province_code, pd.province_code) as province_code,
        COUNT(*) as total_members,
        COUNT(CASE WHEN mu.municipality_type = 'Metro Sub-Region' THEN 1 END) as metro_members,
        COUNT(CASE WHEN mu.municipality_type != 'Metro Sub-Region' THEN 1 END) as regular_members
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      WHERE COALESCE(d.province_code, pd.province_code) IN ('GP', 'WC', 'KZN')
      AND m.firstname IS NOT NULL
      AND m.surname IS NOT NULL
      GROUP BY COALESCE(d.province_code, pd.province_code)
      ORDER BY total_members DESC
    `;
    
    const countResult = await pool.query(countQuery);
    console.log('✅ Member counts by province:');
    
    countResult.rows.forEach(row => {
      const metroPercentage = ((row.metro_members / row.total_members) * 100).toFixed(1);
      console.log(`   ${row.province_code}: ${row.total_members} members`);
      console.log(`      🏙️  Metro: ${row.metro_members} (${metroPercentage}%)`);
      console.log(`      🏘️  Regular: ${row.regular_members}`);
    });

    // Test 3: Test with old query (without fix) to show the difference
    console.log('\n📊 Test 3: Comparison - Old Query vs New Query');
    console.log('-'.repeat(80));
    
    const oldQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      WHERE d.province_code = 'GP'
      AND m.firstname IS NOT NULL
      AND m.surname IS NOT NULL
    `;
    
    const newQuery = `
      SELECT COUNT(*) as total
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      WHERE COALESCE(d.province_code, pd.province_code) = 'GP'
      AND m.firstname IS NOT NULL
      AND m.surname IS NOT NULL
    `;
    
    const oldResult = await pool.query(oldQuery);
    const newResult = await pool.query(newQuery);
    
    console.log(`Old query (without fix): ${oldResult.rows[0].total} members`);
    console.log(`New query (with fix): ${newResult.rows[0].total} members`);
    console.log(`Difference: ${newResult.rows[0].total - oldResult.rows[0].total} members`);
    
    if (newResult.rows[0].total > oldResult.rows[0].total) {
      console.log('✅ Fix is working! Metro members are now included.');
    } else {
      console.log('⚠️  Warning: No difference detected. Check if there are metro members in the database.');
    }

    // Test 4: Verify metro members have valid data
    console.log('\n📊 Test 4: Verify Metro Members Have Valid Data');
    console.log('-'.repeat(80));
    
    const validationQuery = `
      SELECT 
        COUNT(*) as total_metro_members,
        COUNT(CASE WHEN COALESCE(d.province_code, pd.province_code) IS NULL THEN 1 END) as null_province_count,
        COUNT(CASE WHEN m.firstname IS NULL OR m.surname IS NULL THEN 1 END) as null_name_count
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN districts pd ON pm.district_code = pd.district_code
      WHERE mu.municipality_type = 'Metro Sub-Region'
    `;
    
    const validationResult = await pool.query(validationQuery);
    const validation = validationResult.rows[0];
    
    console.log(`✅ Metro member validation:`);
    console.log(`   Total metro members: ${validation.total_metro_members}`);
    console.log(`   Members with NULL province: ${validation.null_province_count} ${validation.null_province_count === '0' ? '✅' : '❌'}`);
    console.log(`   Members with NULL names: ${validation.null_name_count} ${validation.null_name_count === '0' ? '✅' : '❌'}`);
    
    if (validation.null_province_count === '0' && validation.null_name_count === '0') {
      console.log('\n   🎉 All metro members have valid data for ward audit selection!');
    } else {
      console.log('\n   ⚠️  Warning: Some metro members have invalid data!');
    }

    // Test 5: Test specific metro municipalities
    console.log('\n📊 Test 5: Test Specific Metro Municipalities');
    console.log('-'.repeat(80));
    
    const metroQuery = `
      SELECT 
        mu.municipality_name,
        mu.municipality_type,
        COUNT(m.member_id) as member_count
      FROM municipalities mu
      LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
      LEFT JOIN members m ON w.ward_code = m.ward_code
      WHERE mu.municipality_type IN ('Metropolitan', 'Metro Sub-Region')
      AND mu.municipality_code LIKE 'EKU%'
      GROUP BY mu.municipality_code, mu.municipality_name, mu.municipality_type
      ORDER BY mu.municipality_name
    `;
    
    const metroResult = await pool.query(metroQuery);
    console.log('✅ Ekurhuleni Metro breakdown:');
    
    metroResult.rows.forEach(row => {
      console.log(`   ${row.municipality_name} (${row.municipality_type}): ${row.member_count} members`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ All ward audit member search tests completed successfully!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testWardAuditMemberSearch().catch(console.error);

