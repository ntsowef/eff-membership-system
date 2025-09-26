const axios = require('axios');

async function testApplicationDetailEndpoint() {
  try {
    console.log('🔍 Testing application detail endpoint...\n');

    // Login as membership approver
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'membership.approver@test.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('✅ Login successful');
    console.log('User role:', loginResponse.data.data.user.role_name);

    // Test the two-tier approval endpoint (the one frontend is calling)
    console.log('\n🧪 Testing two-tier approval endpoint...');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/two-tier-approval/applications/1002', { headers });
      console.log('✅ SUCCESS! Two-tier approval endpoint working');
      console.log('Status:', response.status);
      console.log('Application found:', response.data.data?.application?.first_name || 'Unknown');
    } catch (error) {
      console.log('❌ Two-tier approval endpoint failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.error?.message || error.message);
    }

    // Test the regular membership applications endpoint
    console.log('\n🧪 Testing regular applications endpoint...');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/membership-applications/1002', { headers });
      console.log('✅ SUCCESS! Regular applications endpoint working');
      console.log('Status:', response.status);
      console.log('Application found:', response.data.data?.application?.first_name || 'Unknown');
    } catch (error) {
      console.log('❌ Regular applications endpoint failed');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.error?.message || error.message);
    }

    // Check what applications exist in the database
    console.log('\n📋 Checking available applications...');
    try {
      const response = await axios.get('http://localhost:5000/api/v1/membership-applications', { headers });
      console.log('✅ Applications list endpoint working');
      const applications = response.data.data?.applications || [];
      console.log(`Found ${applications.length} applications:`);
      applications.slice(0, 5).forEach(app => {
        console.log(`  • ID: ${app.id}, Name: ${app.first_name} ${app.last_name}, Status: ${app.status}`);
      });
    } catch (error) {
      console.log('❌ Applications list failed:', error.response?.data?.error?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testApplicationDetailEndpoint();
