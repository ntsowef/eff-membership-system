const axios = require('axios');

async function testStatisticsEndpoint() {
  console.log('=== Testing Statistics Endpoint ===\n');

  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // Test the membership-status-breakdown endpoint
    console.log('2. Testing /api/v1/statistics/membership-status-breakdown...');
    const statsResponse = await axios.get('http://localhost:5000/api/v1/statistics/membership-status-breakdown', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Statistics endpoint successful!\n');
    console.log('Response data:');
    console.log(JSON.stringify(statsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
    process.exit(1);
  }
}

testStatisticsEndpoint();

