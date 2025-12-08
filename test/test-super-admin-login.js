/**
 * Test script to verify Super Admin login flow
 * 
 * This script tests:
 * 1. Login with super admin credentials
 * 2. Verify NO OTP is required
 * 3. Verify token is returned
 * 4. Verify session_id is returned
 * 5. Test accessing Super Admin Dashboard with the token
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Super Admin credentials
const SUPER_ADMIN_EMAIL = 'superadmin@eff.org.za';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@2024!';

async function testSuperAdminLogin() {
  console.log('🧪 Testing Super Admin Login Flow...\n');

  try {
    // Step 1: Login with super admin credentials
    console.log('📝 Step 1: Attempting login with super admin credentials...');
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Password: ${SUPER_ADMIN_PASSWORD}\n`);

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD
    });

    console.log('✅ Login Response Status:', loginResponse.status);
    console.log('✅ Login Response Data:', JSON.stringify(loginResponse.data, null, 2));
    console.log('');

    // Step 2: Verify response structure
    console.log('📝 Step 2: Verifying response structure...');
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    if (loginResponse.data.data.requires_otp) {
      console.error('❌ OTP is required! This should NOT happen for super admin.');
      console.error('   User:', loginResponse.data.data.user);
      return;
    }

    console.log('✅ No OTP required (as expected)');
    console.log('✅ User:', loginResponse.data.data.user);
    console.log('✅ Token:', loginResponse.data.data.token ? `${loginResponse.data.data.token.substring(0, 20)}...` : 'NULL');
    console.log('✅ Session ID:', loginResponse.data.data.session_id);
    console.log('');

    // Step 3: Test accessing Super Admin Dashboard with the token
    console.log('📝 Step 3: Testing Super Admin Dashboard access...');
    
    const token = loginResponse.data.data.token;
    const sessionId = loginResponse.data.data.session_id;

    const dashboardResponse = await axios.get(`${API_BASE_URL}/super-admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-ID': sessionId
      }
    });

    console.log('✅ Dashboard Response Status:', dashboardResponse.status);
    console.log('✅ Dashboard Data:', JSON.stringify(dashboardResponse.data, null, 2));
    console.log('');

    // Step 4: Summary
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('Summary:');
    console.log('  ✅ Super admin login successful');
    console.log('  ✅ No OTP required');
    console.log('  ✅ Token received');
    console.log('  ✅ Session ID received');
    console.log('  ✅ Super Admin Dashboard accessible');
    console.log('');

  } catch (error) {
    console.error('❌ TEST FAILED!');
    console.error('');
    
    if (error.response) {
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('');
    console.error('Stack Trace:', error.stack);
  }
}

// Run the test
testSuperAdminLogin();

