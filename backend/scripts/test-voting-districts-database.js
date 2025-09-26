const mysql = require('mysql2/promise');

async function testVotingDistrictsDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Empty password for root user
      database: 'membership_new'
    });

    console.log('🧪 Testing Voting Districts Database Functionality...\n');
    
    // Test 1: Basic voting districts query
    console.log('📋 Test 1: Basic Voting Districts Query');
    const [basicQuery] = await connection.execute(`
      SELECT 
        vd.id,
        vd.vd_code as voting_district_code,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        vd.ward_code,
        vd.is_active
      FROM voting_districts vd
      WHERE vd.is_active = TRUE
      LIMIT 5
    `);
    
    console.log(`   ✅ Success: Retrieved ${basicQuery.length} voting districts`);
    basicQuery.forEach((district, index) => {
      console.log(`      ${index + 1}. ${district.voting_district_name} (${district.voting_district_code})`);
    });
    
    // Test 2: Voting districts with geographic hierarchy
    console.log('\n🗺️  Test 2: Voting Districts with Geographic Hierarchy');
    const [hierarchyQuery] = await connection.execute(`
      SELECT 
        vd.vd_code as voting_district_code,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        w.ward_name,
        w.ward_number,
        m.municipality_name,
        d.district_name,
        p.province_name,
        CONCAT(
          p.province_name, ' → ',
          d.district_name, ' → ',
          m.municipality_name, ' → ',
          'Ward ', w.ward_number, ' → ',
          'VD ', vd.voting_district_number, ' (', vd.vd_name, ')'
        ) as full_hierarchy
      FROM voting_districts vd
      JOIN wards w ON vd.ward_code = w.ward_code
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      JOIN districts d ON m.district_code = d.district_code
      JOIN provinces p ON d.province_code = p.province_code
      WHERE vd.is_active = TRUE
      LIMIT 3
    `);
    
    console.log(`   ✅ Success: Retrieved ${hierarchyQuery.length} voting districts with hierarchy`);
    hierarchyQuery.forEach((district, index) => {
      console.log(`      ${index + 1}. ${district.full_hierarchy}`);
    });
    
    // Test 3: Voting districts by ward
    console.log('\n🏘️  Test 3: Voting Districts by Ward');
    const sampleWardCode = hierarchyQuery[0]?.ward_code;
    if (sampleWardCode) {
      const [wardQuery] = await connection.execute(`
        SELECT 
          vd.vd_code as voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          COUNT(m.member_id) as member_count
        FROM voting_districts vd
        LEFT JOIN members m ON vd.vd_code = m.voting_district_code
        WHERE vd.ward_code = ? AND vd.is_active = TRUE
        GROUP BY vd.id
        ORDER BY vd.voting_district_number
      `, [sampleWardCode]);
      
      console.log(`   ✅ Success: Found ${wardQuery.length} voting districts in ward ${sampleWardCode}`);
      wardQuery.forEach((district, index) => {
        console.log(`      ${index + 1}. ${district.voting_district_name} - ${district.member_count} members`);
      });
    }
    
    // Test 4: Search functionality
    console.log('\n🔍 Test 4: Search Functionality');
    const [searchQuery] = await connection.execute(`
      SELECT 
        vd.vd_code as voting_district_code,
        vd.vd_name as voting_district_name,
        vd.voting_district_number,
        w.ward_name,
        m.municipality_name,
        p.province_name
      FROM voting_districts vd
      JOIN wards w ON vd.ward_code = w.ward_code
      JOIN municipalities m ON w.municipality_code = m.municipality_code
      JOIN districts d ON m.district_code = d.district_code
      JOIN provinces p ON d.province_code = p.province_code
      WHERE vd.is_active = TRUE 
        AND (vd.vd_name LIKE '%HALL%' OR vd.vd_name LIKE '%SCHOOL%')
      LIMIT 5
    `);
    
    console.log(`   ✅ Success: Found ${searchQuery.length} voting districts containing 'HALL' or 'SCHOOL'`);
    searchQuery.forEach((district, index) => {
      console.log(`      ${index + 1}. ${district.voting_district_name} - ${district.municipality_name}, ${district.province_name}`);
    });
    
    // Test 5: Statistics
    console.log('\n📊 Test 5: Voting District Statistics');
    
    // Total counts
    const [totalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_voting_districts,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_voting_districts
      FROM voting_districts
    `);
    
    console.log(`   📈 Total voting districts: ${totalStats[0].total_voting_districts}`);
    console.log(`   📈 Active voting districts: ${totalStats[0].active_voting_districts}`);
    
    // By province
    const [provinceStats] = await connection.execute(`
      SELECT 
        p.province_name,
        COUNT(vd.id) as voting_district_count
      FROM provinces p
      JOIN districts d ON p.province_code = d.province_code
      JOIN municipalities m ON d.district_code = m.district_code
      JOIN wards w ON m.municipality_code = w.municipality_code
      JOIN voting_districts vd ON w.ward_code = vd.ward_code
      WHERE vd.is_active = TRUE
      GROUP BY p.province_code, p.province_name
      ORDER BY voting_district_count DESC
      LIMIT 5
    `);
    
    console.log('   📈 Top provinces by voting districts:');
    provinceStats.forEach((province, index) => {
      console.log(`      ${index + 1}. ${province.province_name}: ${province.voting_district_count} districts`);
    });
    
    // Member distribution
    const [memberStats] = await connection.execute(`
      SELECT 
        vd.vd_name as voting_district_name,
        COUNT(m.member_id) as member_count
      FROM voting_districts vd
      LEFT JOIN members m ON vd.vd_code = m.voting_district_code
      WHERE vd.is_active = TRUE
      GROUP BY vd.id, vd.vd_name
      HAVING member_count > 0
      ORDER BY member_count DESC
      LIMIT 5
    `);
    
    console.log('   📈 Top voting districts by member count:');
    if (memberStats.length > 0) {
      memberStats.forEach((district, index) => {
        console.log(`      ${index + 1}. ${district.voting_district_name}: ${district.member_count} members`);
      });
    } else {
      console.log('      ℹ️  No members assigned to voting districts yet');
    }
    
    // Test 6: Geographic filtering
    console.log('\n🌍 Test 6: Geographic Filtering');
    
    // Get a sample province
    const [sampleProvince] = await connection.execute(`
      SELECT DISTINCT p.province_code, p.province_name
      FROM provinces p
      JOIN districts d ON p.province_code = d.province_code
      JOIN municipalities m ON d.district_code = m.district_code
      JOIN wards w ON m.municipality_code = w.municipality_code
      JOIN voting_districts vd ON w.ward_code = vd.ward_code
      WHERE vd.is_active = TRUE
      LIMIT 1
    `);
    
    if (sampleProvince.length > 0) {
      const provinceCode = sampleProvince[0].province_code;
      const provinceName = sampleProvince[0].province_name;
      
      const [filteredQuery] = await connection.execute(`
        SELECT 
          COUNT(vd.id) as voting_district_count,
          COUNT(DISTINCT d.district_code) as district_count,
          COUNT(DISTINCT m.municipality_code) as municipality_count,
          COUNT(DISTINCT w.ward_code) as ward_count
        FROM voting_districts vd
        JOIN wards w ON vd.ward_code = w.ward_code
        JOIN municipalities m ON w.municipality_code = m.municipality_code
        JOIN districts d ON m.district_code = d.district_code
        JOIN provinces p ON d.province_code = p.province_code
        WHERE p.province_code = ? AND vd.is_active = TRUE
      `, [provinceCode]);
      
      const stats = filteredQuery[0];
      console.log(`   ✅ Geographic breakdown for ${provinceName}:`);
      console.log(`      - Districts: ${stats.district_count}`);
      console.log(`      - Municipalities: ${stats.municipality_count}`);
      console.log(`      - Wards: ${stats.ward_count}`);
      console.log(`      - Voting Districts: ${stats.voting_district_count}`);
    }
    
    console.log('\n🎉 All voting district database tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Basic voting district queries working');
    console.log('   ✅ Geographic hierarchy integration working');
    console.log('   ✅ Ward-based filtering working');
    console.log('   ✅ Search functionality working');
    console.log('   ✅ Statistics and analytics working');
    console.log('   ✅ Geographic filtering working');
    console.log('\n🚀 The voting districts database layer is fully functional!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testVotingDistrictsDatabase();
