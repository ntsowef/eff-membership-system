const axios = require('axios');

async function testBackendAuth() {
  console.log('Testing backend authentication...\n');
  
  const baseURL = 'http://localhost:5000/api/v1';
  
  try {
    // Test login with demo credentials
    console.log('Testing login with admin@membership.org...');
    const response = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBackendAuth();
