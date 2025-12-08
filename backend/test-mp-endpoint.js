const axios = require('axios');

async function testMPEndpoint() {
  try {
    console.log('🧪 Testing /api/v1/members endpoint with province_code=MP...\n');

    // First, login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    // Test the endpoint with province_code=MP
    console.log('📡 Calling /api/v1/members?page=1&limit=10&sortBy=firstname&sortOrder=asc&province_code=MP');
    const response = await axios.get('http://localhost:5000/api/v1/members', {
      params: {
        page: 1,
        limit: 10,
        sortBy: 'firstname',
        sortOrder: 'asc',
        province_code: 'MP'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📊 Response:');
    console.log('Status:', response.status);
    console.log('Total Members:', response.data.pagination.total);
    console.log('Total Pages:', response.data.pagination.totalPages);
    console.log('Current Page:', response.data.pagination.page);
    console.log('Members on this page:', response.data.data.length);
    console.log('');

    if (response.data.data.length > 0) {
      console.log('✅ SUCCESS! MP members are being returned!\n');
      console.log('📋 Sample members:');
      response.data.data.slice(0, 3).forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.firstname} ${member.surname || ''}`);
        console.log(`   ID: ${member.id_number}`);
        console.log(`   Province: ${member.province_code} - ${member.province_name}`);
        console.log(`   Municipality: ${member.municipality_code || 'N/A'}`);
        console.log(`   Ward: ${member.ward_code || 'N/A'}`);
      });
    } else {
      console.log('❌ FAILED! No members returned for province_code=MP');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testMPEndpoint();

