const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testDashboardApplications() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Test the exact API call that the dashboard makes
    console.log('📋 Testing dashboard API call...\n');
    console.log('URL: /membership-applications?limit=5&page=1&sort_by=created_at&sort_order=desc\n');
    
    const response = await axios.get(`${API_URL}/membership-applications`, {
      params: {
        limit: 5,
        page: 1,
        sort_by: 'created_at',
        sort_order: 'desc'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response structure:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n\nChecking data path:');
    console.log('response.data:', typeof response.data);
    console.log('response.data.data:', typeof response.data.data);
    console.log('response.data.data.applications:', Array.isArray(response.data.data?.applications));
    
    if (response.data.data?.applications) {
      console.log(`\n✅ Found ${response.data.data.applications.length} applications`);
      console.log('\nFirst application:');
      console.log(JSON.stringify(response.data.data.applications[0], null, 2));
    } else {
      console.log('\n❌ No applications found in response.data.data.applications');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testDashboardApplications();

