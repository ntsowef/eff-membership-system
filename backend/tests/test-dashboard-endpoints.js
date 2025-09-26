const axios = require('axios');

async function testDashboardEndpoints() {
  console.log('🔍 Testing Financial Dashboard Endpoints...\n');

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

    // Step 2: Test dashboard metrics endpoint
    console.log('📋 **Step 2: Test dashboard metrics...**');
    try {
      const metricsResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/metrics', { headers });
      console.log('✅ Dashboard metrics successful!');
      console.log('Response status:', metricsResponse.status);
      console.log('Metrics data:', JSON.stringify(metricsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Dashboard metrics failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n');

    // Step 3: Test realtime stats endpoint
    console.log('📋 **Step 3: Test realtime stats...**');
    try {
      const realtimeResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/realtime-stats', { headers });
      console.log('✅ Realtime stats successful!');
      console.log('Response status:', realtimeResponse.status);
      console.log('Realtime data:', JSON.stringify(realtimeResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Realtime stats failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n');

    // Step 4: Test trends endpoint
    console.log('📋 **Step 4: Test trends...**');
    try {
      const trendsResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/trends?period=daily&limit=7', { headers });
      console.log('✅ Trends successful!');
      console.log('Response status:', trendsResponse.status);
      console.log('Trends data:', JSON.stringify(trendsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Trends failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n');

    // Step 5: Test performance endpoint
    console.log('📋 **Step 5: Test performance...**');
    try {
      const performanceResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/performance?period=daily', { headers });
      console.log('✅ Performance successful!');
      console.log('Response status:', performanceResponse.status);
      console.log('Performance data:', JSON.stringify(performanceResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Performance failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardEndpoints();
