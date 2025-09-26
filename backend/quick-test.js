const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing login...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    console.log('Login successful, token length:', token.length);

    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('Testing metrics...');
    const metricsResponse = await axios.get('http://localhost:5000/api/v1/financial-dashboard/metrics', { headers });
    console.log('Metrics status:', metricsResponse.status);
    console.log('Metrics data keys:', Object.keys(metricsResponse.data));

  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data?.error?.message || error.message);
  }
}

quickTest();
