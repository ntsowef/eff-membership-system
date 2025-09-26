const axios = require('axios');

async function testSimpleDashboard() {
  console.log('🔍 Testing simple dashboard endpoints...\n');

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

    // Step 2: Test simple metrics endpoint
    console.log('📋 **Step 2: Test simple metrics...**');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/simple-dashboard/simple-metrics', { headers });
      console.log('✅ Simple metrics successful!');
      console.log('Response status:', response.status);
      console.log('Metrics data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Simple metrics failed');
      console.log('Status:', error.response?.status);
      console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n📋 **Step 3: Test simple trends...**');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/simple-dashboard/simple-trends', { headers });
      console.log('✅ Simple trends successful!');
      console.log('Response status:', response.status);
      console.log('Trends data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Simple trends failed');
      console.log('Status:', error.response?.status);
      console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n📋 **Step 4: Test simple performance...**');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/simple-dashboard/simple-performance', { headers });
      console.log('✅ Simple performance successful!');
      console.log('Response status:', response.status);
      console.log('Performance data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Simple performance failed');
      console.log('Status:', error.response?.status);
      console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleDashboard();
