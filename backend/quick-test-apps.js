const axios = require('axios');

async function quickTestApps() {
  try {
    console.log('🔍 Quick test of applications endpoint...\n');

    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'membership.approver@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Test endpoint
    const response = await axios.get('http://localhost:5000/api/v1/membership-applications', { headers });
    console.log('✅ SUCCESS! Applications endpoint working');
    console.log('Status:', response.status);
    console.log('Applications found:', response.data.data?.applications?.length || 0);

  } catch (error) {
    console.log('❌ FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error?.message || error.message);
  }
}

quickTestApps();
