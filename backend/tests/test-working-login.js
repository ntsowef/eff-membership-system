const axios = require('axios');

async function testWorkingLogin() {
  try {
    console.log('Testing working login with user management API...');
    
    // Test the user management login endpoint
    const response = await axios.post('http://localhost:5000/api/v1/admin-management/login', {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test accessing protected endpoint
    const token = response.data.data.token;
    console.log('\nTesting protected endpoint access...');
    
    const protectedResponse = await axios.get('http://localhost:5000/api/v1/admin-management/admins', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Protected endpoint access successful!');
    console.log('Admins count:', protectedResponse.data.data.admins.length);
    
  } catch (error) {
    console.log('Test failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testWorkingLogin();
