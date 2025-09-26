const mysql = require('mysql2/promise');

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'membership_new',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function testOverviewQueries() {
  let connection;
  
  try {
    console.log('🔗 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🧪 Testing overview queries...\n');

    // Test 1: Overall statistics query
    console.log('1️⃣ Testing overall statistics query...');
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_wards,
        SUM(CASE WHEN standing_level = 1 THEN 1 ELSE 0 END) as good_standing_wards,
        SUM(CASE WHEN standing_level = 2 THEN 1 ELSE 0 END) as acceptable_standing_wards,
        SUM(CASE WHEN standing_level = 3 THEN 1 ELSE 0 END) as needs_improvement_wards,
        ROUND(
          (SUM(CASE WHEN standing_level IN (1, 2) THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 2
        ) as overall_compliance_percentage,
        SUM(active_members) as total_active_members,
        SUM(total_members) as total_all_members,
        ROUND(AVG(active_members), 1) as avg_active_per_ward
      FROM vw_ward_membership_audit
    `;

    try {
      const [overviewResult] = await connection.execute(overviewQuery);
      console.log('✅ Overview query result:', overviewResult[0]);
    } catch (error) {
      console.log('❌ Overview query failed:', error.message);
    }

    // Test 2: Municipality statistics query
    console.log('\n2️⃣ Testing municipality statistics query...');
    const municipalityQuery = `
      SELECT 
        COUNT(*) as total_municipalities,
        SUM(CASE WHEN performance_level = 1 THEN 1 ELSE 0 END) as performing_municipalities,
        SUM(CASE WHEN performance_level = 2 THEN 1 ELSE 0 END) as underperforming_municipalities,
        ROUND(AVG(compliance_percentage), 2) as avg_municipality_compliance
      FROM vw_municipality_ward_performance
    `;

    try {
      const [municipalityResult] = await connection.execute(municipalityQuery);
      console.log('✅ Municipality query result:', municipalityResult[0]);
    } catch (error) {
      console.log('❌ Municipality query failed:', error.message);
    }

    // Test 3: Standing distribution query
    console.log('\n3️⃣ Testing standing distribution query...');
    const standingDistributionQuery = `
      SELECT 
        ward_standing,
        standing_level,
        COUNT(*) as ward_count,
        ROUND((COUNT(*) * 100.0) / (SELECT COUNT(*) FROM vw_ward_membership_audit), 2) as percentage
      FROM vw_ward_membership_audit
      GROUP BY ward_standing, standing_level
      ORDER BY standing_level
    `;

    try {
      const [standingResult] = await connection.execute(standingDistributionQuery);
      console.log('✅ Standing distribution query result:');
      standingResult.forEach(row => {
        console.log(`   ${row.ward_standing}: ${row.ward_count} wards (${row.percentage}%)`);
      });
    } catch (error) {
      console.log('❌ Standing distribution query failed:', error.message);
    }

    // Test 4: Top municipalities query
    console.log('\n4️⃣ Testing top municipalities query...');
    const topMunicipalitiesQuery = `
      SELECT 
        municipality_name,
        compliance_percentage,
        total_wards,
        compliant_wards,
        total_active_members
      FROM vw_municipality_ward_performance
      WHERE performance_level = 1
      ORDER BY compliance_percentage DESC, total_active_members DESC
      LIMIT 5
    `;

    try {
      const [topResult] = await connection.execute(topMunicipalitiesQuery);
      console.log('✅ Top municipalities query result:');
      topResult.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.municipality_name}: ${row.compliance_percentage}% compliance (${row.total_active_members} members)`);
      });
    } catch (error) {
      console.log('❌ Top municipalities query failed:', error.message);
    }

    // Test 5: Needs attention query
    console.log('\n5️⃣ Testing needs attention query...');
    const needsAttentionQuery = `
      SELECT 
        municipality_name,
        compliance_percentage,
        total_wards,
        needs_improvement_wards,
        wards_needed_compliance
      FROM vw_municipality_ward_performance
      WHERE performance_level = 2
      ORDER BY compliance_percentage ASC, needs_improvement_wards DESC
      LIMIT 5
    `;

    try {
      const [needsAttentionResult] = await connection.execute(needsAttentionQuery);
      console.log('✅ Needs attention query result:');
      needsAttentionResult.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.municipality_name}: ${row.compliance_percentage}% compliance (${row.needs_improvement_wards} wards need improvement)`);
      });
    } catch (error) {
      console.log('❌ Needs attention query failed:', error.message);
    }

    console.log('\n🎉 Overview queries testing complete!');

  } catch (error) {
    console.error('❌ Error testing overview queries:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testOverviewQueries();
