const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testSMSEndpointsWithAuth() {
  console.log('=== TESTING SMS ENDPOINTS WITH AUTHENTICATION ===\n');

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 50)}...`);
    console.log(`   User: ${loginResponse.data.data.user.name}`);
    console.log(`   Admin Level: ${loginResponse.data.data.user.admin_level}\n`);

    // Step 2: Test SMS Dashboard Stats
    console.log('2. Testing SMS Dashboard Stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/sms/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.data.success) {
        console.log('✅ SMS Dashboard Stats retrieved successfully');
        console.log('   Campaign Statistics:', JSON.stringify(statsResponse.data.data.campaign_statistics, null, 2));
        console.log('   Template Statistics:', JSON.stringify(statsResponse.data.data.template_statistics, null, 2));
        console.log('   Recent Campaigns:', statsResponse.data.data.recent_campaigns.length, 'campaigns\n');
      } else {
        console.error('❌ SMS Dashboard Stats failed:', statsResponse.data);
      }
    } catch (error) {
      console.error('❌ SMS Dashboard Stats error:', error.response?.data || error.message);
      console.error('   Status:', error.response?.status);
      console.error('   Headers:', error.response?.headers);
    }

    // Step 3: Test Birthday SMS Statistics
    console.log('3. Testing Birthday SMS Statistics...');
    try {
      const birthdayStatsResponse = await axios.get(`${BASE_URL}/birthday-sms/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (birthdayStatsResponse.data.success) {
        console.log('✅ Birthday SMS Statistics retrieved successfully');
        console.log('   Data:', JSON.stringify(birthdayStatsResponse.data.data, null, 2));
      } else {
        console.error('❌ Birthday SMS Statistics failed:', birthdayStatsResponse.data);
      }
    } catch (error) {
      console.error('❌ Birthday SMS Statistics error:', error.response?.data || error.message);
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testSMSEndpointsWithAuth();

