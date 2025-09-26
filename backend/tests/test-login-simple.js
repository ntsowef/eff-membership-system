const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await axios.post('http://127.0.0.1:5000/api/v1/auth/login', {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('Login failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testLogin();
