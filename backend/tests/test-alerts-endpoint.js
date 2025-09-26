const axios = require('axios');

async function testAlertsEndpoint() {
  try {
    console.log('🔍 Testing alerts endpoint...\n');

    // Step 1: Login
    console.log('📋 **Step 1: Login**');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    if (loginResponse.status !== 200) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test alerts endpoint
    console.log('\n📋 **Step 2: Test alerts endpoint**');
    try {
      const alertsResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/alerts', { headers });
      console.log('✅ Alerts endpoint successful!');
      console.log('Response status:', alertsResponse.status);
      console.log('Alerts data:', JSON.stringify(alertsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Alerts endpoint failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    }

    // Step 3: Test other dashboard endpoints
    console.log('\n📋 **Step 3: Test other endpoints**');
    
    const endpoints = [
      { name: 'Metrics', url: '/financial-dashboard/metrics' },
      { name: 'Trends', url: '/financial-dashboard/trends?period=daily&limit=7' },
      { name: 'Performance', url: '/financial-dashboard/performance?period=daily' },
      { name: 'Realtime Stats', url: '/financial-dashboard/realtime-stats' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`http://localhost:5000/api/v1${endpoint.url}`, { headers });
        console.log(`✅ ${endpoint.name}: Status ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Status ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAlertsEndpoint();
