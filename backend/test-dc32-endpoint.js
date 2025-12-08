const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function testDC32Endpoint() {
  try {
    console.log('🔍 Checking DC32 district data in database...\n');

    // Check if DC32 exists and what province it belongs to
    const districtQuery = `
      SELECT district_code, district_name, province_code 
      FROM districts 
      WHERE district_code = 'DC32';
    `;
    const districtResult = await pool.query(districtQuery);
    console.log('📊 District DC32 info:');
    console.table(districtResult.rows);
    console.log('');

    // Check members in members_consolidated with district_code = DC32
    const consolidatedQuery = `
      SELECT COUNT(*) as member_count 
      FROM members_consolidated 
      WHERE district_code = 'DC32';
    `;
    const consolidatedResult = await pool.query(consolidatedQuery);
    console.log('📊 Members in members_consolidated with district_code = DC32:');
    console.log('Count:', consolidatedResult.rows[0].member_count);
    console.log('');

    // Check members in vw_enhanced_member_search with district_code = DC32
    const viewQuery = `
      SELECT COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      WHERE district_code = 'DC32';
    `;
    const viewResult = await pool.query(viewQuery);
    console.log('📊 Members in vw_enhanced_member_search with district_code = DC32:');
    console.log('Count:', viewResult.rows[0].member_count);
    console.log('');

    // Sample members from the view
    const sampleQuery = `
      SELECT member_id, firstname, surname, province_code, district_code, municipality_code, ward_code
      FROM vw_enhanced_member_search 
      WHERE district_code = 'DC32' 
      LIMIT 5;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log('📊 Sample members from vw_enhanced_member_search:');
    console.table(sampleResult.rows);
    console.log('');

    await pool.end();

    // Now test the API endpoint
    console.log('🧪 Testing /api/v1/members endpoint with district_code=DC32...\n');

    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    // Test the endpoint with district_code=DC32
    console.log('📡 Calling /api/v1/members?page=1&limit=10&sortBy=firstname&sortOrder=asc&district_code=DC32');
    const response = await axios.get('http://localhost:5000/api/v1/members', {
      params: {
        page: 1,
        limit: 10,
        sortBy: 'firstname',
        sortOrder: 'asc',
        district_code: 'DC32'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📊 API Response:');
    console.log('Status:', response.status);
    console.log('Total Members:', response.data.pagination.total);
    console.log('Total Pages:', response.data.pagination.totalPages);
    console.log('Current Page:', response.data.pagination.page);
    console.log('Members on this page:', response.data.data.length);
    console.log('');

    if (response.data.data.length > 0) {
      console.log('✅ SUCCESS! DC32 members are being returned!\n');
      console.log('📋 Sample members:');
      response.data.data.slice(0, 3).forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.firstname} ${member.surname || ''}`);
        console.log(`   ID: ${member.id_number}`);
        console.log(`   Province: ${member.province_code} - ${member.province_name || 'N/A'}`);
        console.log(`   District: ${member.district_code} - ${member.district_name || 'N/A'}`);
        console.log(`   Municipality: ${member.municipality_code || 'N/A'}`);
        console.log(`   Ward: ${member.ward_code || 'N/A'}`);
      });
    } else {
      console.log('❌ FAILED! No members returned for district_code=DC32');
      console.log('\n⚠️  This might be because:');
      console.log('   1. District DC32 has no members in the database');
      console.log('   2. The district_code in members_consolidated doesn\'t match');
      console.log('   3. The view JOIN logic is not working correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    await pool.end();
    process.exit(1);
  }
}

testDC32Endpoint();

