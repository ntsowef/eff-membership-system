const axios = require('axios');

async function testServerStatus() {
  try {
    console.log('🔍 Testing backend server status...\n');

    // Test 1: Check if server is running
    console.log('📋 Step 1: Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:5000/api/v1/health', {
        timeout: 5000
      });
      console.log('✅ Server is running');
      console.log('   Status:', healthResponse.status);
      console.log('   Response:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      console.log('🚨 CRITICAL: Backend server is not running!');
      console.log('   Please start the server with: npm start or npm run dev');
      return;
    }

    // Test 2: Test authentication
    console.log('\n📋 Step 2: Testing authentication...');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'membership.approver@test.com',
        password: 'password123'
      }, { timeout: 10000 });

      const token = loginResponse.data.data.token;
      console.log('✅ Authentication successful');
      console.log('   Token received:', token ? 'Yes' : 'No');

      // Test 3: Test applications endpoint
      console.log('\n📋 Step 3: Testing applications endpoint...');
      try {
        const appsResponse = await axios.get('http://localhost:5000/api/v1/membership-applications', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        console.log('✅ Applications endpoint working');
        console.log('   Status:', appsResponse.status);
        console.log('   Data structure:', {
          success: appsResponse.data.success,
          hasData: !!appsResponse.data.data,
          hasApplications: !!appsResponse.data.data?.applications,
          applicationsCount: appsResponse.data.data?.applications?.length || 0,
          totalCount: appsResponse.data.data?.total || 0
        });

        if (appsResponse.data.data?.applications?.length > 0) {
          console.log('   Sample application:', {
            id: appsResponse.data.data.applications[0].id,
            name: `${appsResponse.data.data.applications[0].first_name} ${appsResponse.data.data.applications[0].last_name}`,
            status: appsResponse.data.data.applications[0].status
          });
        }

      } catch (error) {
        console.log('❌ Applications endpoint failed');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message || error.message);
        
        if (error.response?.status === 500) {
          console.log('🚨 CRITICAL: Database query error - server needs restart!');
        }
      }

      // Test 4: Test application detail endpoint
      console.log('\n📋 Step 4: Testing application detail endpoint...');
      try {
        const detailResponse = await axios.get('http://localhost:5000/api/v1/membership-applications/1', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        console.log('✅ Application detail endpoint working');
        console.log('   Status:', detailResponse.status);
        console.log('   Has application data:', !!detailResponse.data.data?.application);

      } catch (error) {
        console.log('❌ Application detail endpoint failed');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message || error.message);
      }

    } catch (error) {
      console.log('❌ Authentication failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('   If you see database errors above, the server needs to be restarted.');
    console.log('   If authentication fails, check user permissions.');
    console.log('   If server health fails, start the backend server.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerStatus();
