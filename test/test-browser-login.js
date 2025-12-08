const axios = require('axios');

async function testBrowserLogin() {
  console.log('🧪 Testing Browser Login Flow...\n');

  try {
    // Step 1: Login
    console.log('📝 Step 1: Attempting login...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'superadmin@eff.org.za',
      password: 'SuperAdmin@2024!'
    });

    console.log('✅ Login Response Status:', loginResponse.status);
    console.log('✅ Login Response Data:', JSON.stringify(loginResponse.data, null, 2));

    const { user, token, session_id } = loginResponse.data.data;

    // Step 2: Simulate what the frontend should store
    console.log('\n📝 Step 2: Simulating localStorage storage...');
    const authStorage = {
      state: {
        user: user,
        token: token,
        sessionId: session_id,
        isAuthenticated: true,
        provinceContext: {
          province_code: user.province_code,
          district_code: user.district_code,
          municipal_code: user.municipal_code,
          ward_code: user.ward_code,
          filtered_by_province: user.admin_level === 'province' && !!user.province_code
        }
      },
      version: 0
    };

    console.log('✅ Auth Storage Object:', JSON.stringify(authStorage, null, 2));
    console.log('\n✅ Token extracted from storage:', authStorage.state.token ? `${authStorage.state.token.substring(0, 30)}...` : 'NULL');

    // Step 3: Test dashboard access with token
    console.log('\n📝 Step 3: Testing dashboard access with token...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/v1/super-admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Dashboard Response Status:', dashboardResponse.status);
    console.log('✅ Dashboard accessible!');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\nSummary:');
    console.log('  ✅ Login successful');
    console.log('  ✅ Token received:', token ? 'YES' : 'NO');
    console.log('  ✅ User role:', user.role);
    console.log('  ✅ Dashboard accessible with token');

  } catch (error) {
    console.error('\n🚨 Error occurred:', {
      name: error.name,
      message: error.message,
      statusCode: error.response?.status,
      code: error.code,
      stack: error.stack,
      path: error.response?.config?.url,
      method: error.response?.config?.method,
      body: error.response?.config?.data,
      query: error.response?.config?.params,
      params: error.response?.config?.params
    });
  }
}

testBrowserLogin();

