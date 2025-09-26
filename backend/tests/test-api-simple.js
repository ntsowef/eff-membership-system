const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testing API with proper authentication...');

    // Login first
    console.log('\n📋 **Step 1: Login...**');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Test the problematic endpoint
    console.log('\n📋 **Step 2: Test financial transactions query...**');
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/query', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          offset: 0,
          limit: 25,
          sort_by: 'created_at',
          sort_order: 'DESC'
        }
      });

      console.log('✅ API call successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log('❌ API call failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
      
      // If it's a 500 error, let's check the server logs
      if (error.response?.status === 500) {
        console.log('\n🔍 This is a server error. The issue is likely in the backend code.');
        console.log('The database queries work fine, so the issue is in the service layer.');
      }
    }

    // Test a simpler endpoint to see if the issue is specific to the query endpoint
    console.log('\n📋 **Step 3: Test quick stats endpoint...**');
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/financial-transactions/quick-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Quick stats API call successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log('❌ Quick stats API call failed');
      console.log('Status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPI();
