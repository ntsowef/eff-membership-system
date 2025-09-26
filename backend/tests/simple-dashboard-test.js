const axios = require('axios');

async function simpleDashboardTest() {
  console.log('🔍 Testing dashboard endpoints with detailed error info...\n');

  try {
    // Step 1: Login to get token
    console.log('📋 **Step 1: Login...**');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test metrics endpoint with detailed error handling
    console.log('📋 **Step 2: Test metrics endpoint...**');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-dashboard/metrics', { headers });
      console.log('✅ Metrics successful!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Metrics failed');
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.error?.message) {
        console.log('Error Message:', error.response.data.error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleDashboardTest();
