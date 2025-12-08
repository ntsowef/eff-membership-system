const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testLimitIssue() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Test 1: Request limit=5000
    console.log('📋 Test 1: Requesting limit=5000...\n');
    const response1 = await axios.get(`${API_URL}/membership-applications?limit=5000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  Backend returned: ${response1.data.data.applications.length} applications`);
    console.log(`  Pagination limit: ${response1.data.data.pagination.limit}`);
    console.log(`  Total count: ${response1.data.data.pagination.total_count}\n`);

    // Test 2: Request limit=100
    console.log('📋 Test 2: Requesting limit=100...\n');
    const response2 = await axios.get(`${API_URL}/membership-applications?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  Backend returned: ${response2.data.data.applications.length} applications`);
    console.log(`  Pagination limit: ${response2.data.data.pagination.limit}`);
    console.log(`  Total count: ${response2.data.data.pagination.total_count}\n`);

    // Test 3: Request limit=50
    console.log('📋 Test 3: Requesting limit=50...\n');
    const response3 = await axios.get(`${API_URL}/membership-applications?limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  Backend returned: ${response3.data.data.applications.length} applications`);
    console.log(`  Pagination limit: ${response3.data.data.pagination.limit}`);
    console.log(`  Total count: ${response3.data.data.pagination.total_count}\n`);

    // Test 4: No limit (default)
    console.log('📋 Test 4: No limit parameter (default)...\n');
    const response4 = await axios.get(`${API_URL}/membership-applications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  Backend returned: ${response4.data.data.applications.length} applications`);
    console.log(`  Pagination limit: ${response4.data.data.pagination.limit}`);
    console.log(`  Total count: ${response4.data.data.pagination.total_count}\n`);

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testLimitIssue();

