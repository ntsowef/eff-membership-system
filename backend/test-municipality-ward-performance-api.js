const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testMunicipalityWardPerformanceAPI() {
  console.log('🧪 Testing Municipality Ward Performance API queries...\n');

  try {
    // 1. Test the original failing query with a valid province
    console.log('1. Testing original failing query with valid province (GP)...');
    const originalQuery = `
      SELECT COUNT(*) as total_count
      FROM vw_municipality_ward_performance
      WHERE province_code = $1
    `;

    const result1 = await pool.query(originalQuery, ['GP']);
    console.log(`✅ Original query works! Found ${result1.rows[0].total_count} municipalities in GP`);

    // 2. Test the original failing query with the problematic province (LP)
    console.log('\n2. Testing original failing query with LP (should return 0)...');
    const result2 = await pool.query(originalQuery, ['LP']);
    console.log(`✅ LP query works! Found ${result2.rows[0].total_count} municipalities in LP (expected 0)`);

    // 3. Test comprehensive municipality performance queries
    console.log('\n3. Testing comprehensive municipality performance queries...');
    
    const comprehensiveQuery = `
      SELECT
        municipality_code,
        municipality_name,
        district_name,
        province_name,
        total_wards,
        good_standing_wards,
        acceptable_standing_wards,
        needs_improvement_wards,
        compliant_wards,
        compliance_percentage,
        municipality_performance,
        performance_level,
        total_active_members,
        total_all_members,
        avg_active_per_ward,
        wards_needed_compliance,
        last_updated
      FROM vw_municipality_ward_performance
      WHERE province_code = $1
      ORDER BY compliance_percentage DESC
      LIMIT 5;
    `;

    const result3 = await pool.query(comprehensiveQuery, ['GP']);
    console.log('Top performing municipalities in GP:');
    console.table(result3.rows);

    // 4. Test municipality performance classification
    console.log('\n4. Testing municipality performance classification...');
    const performanceQuery = `
      SELECT
        municipality_performance,
        COUNT(*) as municipality_count,
        AVG(compliance_percentage) as avg_compliance,
        SUM(total_active_members) as total_active_members
      FROM vw_municipality_ward_performance
      GROUP BY municipality_performance
      ORDER BY avg_compliance DESC;
    `;

    const result4 = await pool.query(performanceQuery);
    console.log('Municipality performance summary:');
    console.table(result4.rows);

    // 5. Test queries that would be used in the API endpoints
    console.log('\n5. Testing API endpoint queries...');
    
    // Overview query
    const overviewQuery = `
      SELECT
        COUNT(*) as total_municipalities,
        SUM(CASE WHEN performance_level = 1 THEN 1 ELSE 0 END) as performing_municipalities,
        SUM(CASE WHEN performance_level = 2 THEN 1 ELSE 0 END) as underperforming_municipalities,
        ROUND(AVG(compliance_percentage), 2) as avg_municipality_compliance
      FROM vw_municipality_ward_performance
      WHERE province_code = $1;
    `;

    const result5 = await pool.query(overviewQuery, ['GP']);
    console.log('Municipality overview for GP:');
    console.table(result5.rows);

    // Top performing municipalities query
    const topPerformingQuery = `
      SELECT
        municipality_name,
        compliance_percentage,
        total_wards,
        compliant_wards,
        total_active_members
      FROM vw_municipality_ward_performance
      WHERE performance_level = 1 AND province_code = $1
      ORDER BY compliance_percentage DESC, total_active_members DESC
      LIMIT 5;
    `;

    const result6 = await pool.query(topPerformingQuery, ['GP']);
    console.log('Top performing municipalities in GP:');
    console.table(result6.rows);

    // Municipalities needing attention query
    const needsAttentionQuery = `
      SELECT
        municipality_name,
        compliance_percentage,
        total_wards,
        needs_improvement_wards,
        wards_needed_compliance
      FROM vw_municipality_ward_performance
      WHERE performance_level = 2 AND province_code = $1
      ORDER BY compliance_percentage ASC, needs_improvement_wards DESC
      LIMIT 5;
    `;

    const result7 = await pool.query(needsAttentionQuery, ['GP']);
    console.log('Municipalities needing attention in GP:');
    if (result7.rows.length > 0) {
      console.table(result7.rows);
    } else {
      console.log('No underperforming municipalities found in GP');
    }

    // 6. Test with different provinces
    console.log('\n6. Testing with different provinces...');
    const provinces = ['NW', 'EC', 'WC'];
    
    for (const province of provinces) {
      const provinceResult = await pool.query(originalQuery, [province]);
      console.log(`✅ ${province}: ${provinceResult.rows[0].total_count} municipalities`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testMunicipalityWardPerformanceAPI().catch(console.error);
