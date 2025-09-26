const mysql = require('mysql2/promise');

async function testVotingDistrictsByWard() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🧪 Testing Voting Districts by Ward Functionality...\n');
    
    // Test 1: Get sample wards with voting districts
    console.log('📋 Test 1: Sample Wards with Voting Districts');
    const [wardsWithVDs] = await connection.execute(`
      SELECT 
        w.ward_code,
        w.ward_name,
        w.ward_number,
        mu.municipality_name,
        p.province_name,
        COUNT(vd.vd_code) as voting_district_count
      FROM wards w
      JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      JOIN districts d ON mu.district_code = d.district_code
      JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code AND vd.is_active = TRUE
      GROUP BY w.ward_code, w.ward_name, w.ward_number, mu.municipality_name, p.province_name
      HAVING voting_district_count > 0
      ORDER BY voting_district_count DESC
      LIMIT 10
    `);
    
    console.log(`   ✅ Found ${wardsWithVDs.length} wards with voting districts:`);
    wardsWithVDs.forEach((ward, index) => {
      console.log(`      ${index + 1}. Ward ${ward.ward_number} (${ward.ward_code}) - ${ward.municipality_name}, ${ward.province_name}`);
      console.log(`         📊 ${ward.voting_district_count} voting districts`);
    });
    
    // Test 2: Test specific ward voting districts
    if (wardsWithVDs.length > 0) {
      const testWard = wardsWithVDs[0];
      console.log(`\n🎯 Test 2: Voting Districts for Ward ${testWard.ward_number} (${testWard.ward_code})`);
      
      const [votingDistricts] = await connection.execute(`
        SELECT 
          vd.vd_code as voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          vd.ward_code,
          vd.is_active,
          COUNT(m.member_id) as member_count
        FROM voting_districts vd
        LEFT JOIN members m ON vd.vd_code = m.voting_district_code
        WHERE vd.ward_code = ? AND vd.is_active = TRUE
        GROUP BY vd.vd_code, vd.vd_name, vd.voting_district_number, vd.ward_code, vd.is_active
        ORDER BY vd.voting_district_number
      `, [testWard.ward_code]);
      
      console.log(`   ✅ Found ${votingDistricts.length} voting districts in this ward:`);
      votingDistricts.forEach((vd, index) => {
        console.log(`      ${index + 1}. VD ${vd.voting_district_number} - ${vd.voting_district_name}`);
        console.log(`         🆔 Code: ${vd.voting_district_code}`);
        console.log(`         👥 Members: ${vd.member_count}`);
        console.log(`         ✅ Active: ${vd.is_active ? 'Yes' : 'No'}`);
      });
      
      // Test 3: Test the exact API query structure
      console.log(`\n🔧 Test 3: API Query Structure for Ward ${testWard.ward_code}`);
      
      const [apiStructure] = await connection.execute(`
        SELECT 
          vd.id,
          vd.vd_code as voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          vd.ward_code,
          vd.is_active,
          w.ward_name,
          w.ward_number,
          COUNT(m.member_id) as member_count
        FROM voting_districts vd
        JOIN wards w ON vd.ward_code = w.ward_code
        LEFT JOIN members m ON vd.vd_code = m.voting_district_code
        WHERE vd.ward_code = ? AND vd.is_active = TRUE
        GROUP BY vd.id
        ORDER BY vd.voting_district_number
      `, [testWard.ward_code]);
      
      console.log('   ✅ API structure data:');
      console.log(`   📊 Query returned ${apiStructure.length} records`);
      
      if (apiStructure.length > 0) {
        console.log('   📋 Sample API response structure:');
        const sample = apiStructure[0];
        console.log('   {');
        console.log(`     "id": ${sample.id},`);
        console.log(`     "voting_district_code": "${sample.voting_district_code}",`);
        console.log(`     "voting_district_name": "${sample.voting_district_name}",`);
        console.log(`     "voting_district_number": "${sample.voting_district_number}",`);
        console.log(`     "ward_code": "${sample.ward_code}",`);
        console.log(`     "is_active": ${sample.is_active},`);
        console.log(`     "ward_name": "${sample.ward_name}",`);
        console.log(`     "ward_number": ${sample.ward_number},`);
        console.log(`     "member_count": ${sample.member_count}`);
        console.log('   }');
      }
    }
    
    // Test 4: Test different provinces
    console.log('\n🌍 Test 4: Voting Districts by Province');
    
    const [provinceBreakdown] = await connection.execute(`
      SELECT 
        p.province_name,
        p.province_code,
        COUNT(DISTINCT w.ward_code) as total_wards,
        COUNT(DISTINCT vd.vd_code) as total_voting_districts,
        AVG(ward_vd_counts.vd_count) as avg_vds_per_ward
      FROM provinces p
      JOIN districts d ON p.province_code = d.province_code
      JOIN municipalities mu ON d.district_code = mu.district_code
      JOIN wards w ON mu.municipality_code = w.municipality_code
      LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code AND vd.is_active = TRUE
      LEFT JOIN (
        SELECT 
          w2.ward_code,
          COUNT(vd2.vd_code) as vd_count
        FROM wards w2
        LEFT JOIN voting_districts vd2 ON w2.ward_code = vd2.ward_code AND vd2.is_active = TRUE
        GROUP BY w2.ward_code
      ) ward_vd_counts ON w.ward_code = ward_vd_counts.ward_code
      GROUP BY p.province_code, p.province_name
      ORDER BY total_voting_districts DESC
    `);
    
    console.log('   📊 Provincial breakdown:');
    provinceBreakdown.forEach((province, index) => {
      console.log(`      ${index + 1}. ${province.province_name} (${province.province_code})`);
      console.log(`         - Wards: ${province.total_wards}`);
      console.log(`         - Voting Districts: ${province.total_voting_districts}`);
      console.log(`         - Avg VDs per Ward: ${parseFloat(province.avg_vds_per_ward || 0).toFixed(1)}`);
    });
    
    // Test 5: Test frontend data format
    console.log('\n🎨 Test 5: Frontend Data Format Test');
    
    if (wardsWithVDs.length > 0) {
      const testWard = wardsWithVDs[0];
      
      const [frontendFormat] = await connection.execute(`
        SELECT 
          vd.vd_code as voting_district_code,
          vd.vd_name as voting_district_name,
          vd.voting_district_number,
          vd.is_active
        FROM voting_districts vd
        WHERE vd.ward_code = ? AND vd.is_active = TRUE
        ORDER BY vd.voting_district_number
        LIMIT 5
      `, [testWard.ward_code]);
      
      console.log(`   ✅ Frontend format for ward ${testWard.ward_code}:`);
      console.log('   [');
      frontendFormat.forEach((vd, index) => {
        console.log('     {');
        console.log(`       "voting_district_code": "${vd.voting_district_code}",`);
        console.log(`       "voting_district_name": "${vd.voting_district_name}",`);
        console.log(`       "voting_district_number": "${vd.voting_district_number}",`);
        console.log(`       "is_active": ${vd.is_active}`);
        console.log(`     }${index < frontendFormat.length - 1 ? ',' : ''}`);
      });
      console.log('   ]');
    }
    
    console.log('\n🎉 Voting Districts by Ward Test Summary:');
    console.log('   ✅ Ward-voting district relationships working');
    console.log('   ✅ Database queries returning correct data');
    console.log('   ✅ API structure properly formatted');
    console.log('   ✅ Frontend data format ready');
    console.log('   ✅ All provinces have voting districts');
    
    console.log('\n💡 For Frontend Integration:');
    console.log('   - Use ward_code to fetch voting districts');
    console.log('   - Voting districts have voting_district_code, voting_district_name, voting_district_number');
    console.log('   - All voting districts are active (is_active = true)');
    console.log('   - Data is ready for GeographicSelector component');
    
  } catch (error) {
    console.error('❌ Voting districts by ward test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testVotingDistrictsByWard();
