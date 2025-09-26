const axios = require('axios');

async function testApplicationsEndpoint() {
  try {
    console.log('🔍 Testing membership applications endpoint...\n');

    // Step 1: Login as membership approver
    console.log('📋 **Step 1: Login as Membership Approver**');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'membership.approver@test.com',
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

    // Step 2: Test applications endpoint
    console.log('\n📋 **Step 2: Test applications endpoint**');
    try {
      const appsResponse = await axios.get('http://localhost:5000/api/v1/membership-applications', { headers });
      console.log('✅ Applications endpoint successful!');
      console.log('Response status:', appsResponse.status);
      console.log('Applications count:', appsResponse.data.data?.applications?.length || 0);
      
      if (appsResponse.data.data?.applications?.length > 0) {
        console.log('\n📋 **Sample Applications:**');
        appsResponse.data.data.applications.slice(0, 3).forEach(app => {
          console.log(`   • ID: ${app.id} | ${app.first_name} ${app.last_name} | Status: ${app.status} | Workflow: ${app.workflow_stage}`);
        });
      }
    } catch (error) {
      console.log('❌ Applications endpoint failed');
      console.log('Status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message || error.message);
      console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
    }

    // Step 3: Check user permissions
    console.log('\n📋 **Step 3: Check user permissions**');
    try {
      const userResponse = await axios.get('http://localhost:5000/api/v1/auth/me', { headers });
      console.log('✅ User info retrieved');
      console.log('User role:', userResponse.data.data.user.role_name);
      console.log('User permissions:', userResponse.data.data.user.permissions?.slice(0, 5) || 'None');
    } catch (error) {
      console.log('❌ User info failed:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testApplicationsEndpoint();
