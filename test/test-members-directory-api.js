const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testMembersDirectoryAPI() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@eff.org.za',
      password: 'SuperAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Test members-with-voting-districts endpoint
    console.log('📊 Testing GET /views/members-with-voting-districts\n');
    const membersResponse = await axios.get(`${API_URL}/views/members-with-voting-districts`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 5 }
    });

    console.log('Response structure:');
    console.log('  - success:', membersResponse.data.success);
    console.log('  - message:', membersResponse.data.message);
    console.log('  - data type:', typeof membersResponse.data.data);
    console.log('  - data keys:', Object.keys(membersResponse.data.data || {}));
    
    if (membersResponse.data.data) {
      console.log('\nData structure:');
      console.log('  - has members:', 'members' in membersResponse.data.data);
      console.log('  - has pagination:', 'pagination' in membersResponse.data.data);
      
      if (membersResponse.data.data.members) {
        console.log('  - members count:', membersResponse.data.data.members.length);
        console.log('  - first member keys:', Object.keys(membersResponse.data.data.members[0] || {}));
      }
      
      if (membersResponse.data.data.pagination) {
        console.log('  - pagination:', membersResponse.data.data.pagination);
      }
    }

    // Step 3: Test voting-district-summary endpoint
    console.log('\n\n📊 Testing GET /views/voting-district-summary\n');
    const summaryResponse = await axios.get(`${API_URL}/views/voting-district-summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Response structure:');
    console.log('  - success:', summaryResponse.data.success);
    console.log('  - message:', summaryResponse.data.message);
    console.log('  - data type:', typeof summaryResponse.data.data);
    console.log('  - data is array:', Array.isArray(summaryResponse.data.data));
    
    if (Array.isArray(summaryResponse.data.data)) {
      console.log('  - summary count:', summaryResponse.data.data.length);
      if (summaryResponse.data.data.length > 0) {
        console.log('  - first summary keys:', Object.keys(summaryResponse.data.data[0]));
      }
    }

    console.log('\n\n✅ API tests completed!');
    console.log('\n📝 Expected frontend access patterns:');
    console.log('  - Members: membersData.members (after apiGet extraction)');
    console.log('  - Summary: summaryData (after apiGet extraction, already an array)');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testMembersDirectoryAPI();

