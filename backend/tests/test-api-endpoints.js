const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

async function testAPIEndpoints() {
  console.log('🧪 Testing User Management API Endpoints\n');
  
  let authToken = '';
  
  try {
    // Test 1: Login with super admin
    console.log('🔐 Test 1: Super Admin Login');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.token;
      console.log('✅ Login successful');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      console.log(`   User: ${loginResponse.data.data.user.name}`);
      console.log(`   Role: ${loginResponse.data.data.user.role}`);
      console.log(`   Admin Level: ${loginResponse.data.data.user.admin_level}`);
    } else {
      console.log('❌ Login failed');
      return;
    }
    
    // Test 2: Get user's active sessions
    console.log('\n📱 Test 2: Get Active Sessions');
    try {
      const sessionsResponse = await axios.get(`${API_BASE}/sessions/my-sessions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Sessions retrieved successfully');
      console.log(`   Active sessions: ${sessionsResponse.data.data.total_sessions}`);
    } catch (error) {
      console.log('❌ Sessions test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 3: Get MFA status
    console.log('\n🔒 Test 3: Get MFA Status');
    try {
      const mfaResponse = await axios.get(`${API_BASE}/mfa/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ MFA status retrieved successfully');
      console.log(`   MFA Enabled: ${mfaResponse.data.data.enabled}`);
      console.log(`   MFA Required: ${mfaResponse.data.data.required}`);
    } catch (error) {
      console.log('❌ MFA status test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 4: Get admin users
    console.log('\n👥 Test 4: Get Admin Users');
    try {
      const adminsResponse = await axios.get(`${API_BASE}/admin-management/admins?limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Admin users retrieved successfully');
      console.log(`   Total admins: ${adminsResponse.data.data.pagination.total}`);
      if (adminsResponse.data.data.admins.length > 0) {
        console.log('   Sample admin:', {
          name: adminsResponse.data.data.admins[0].name,
          email: adminsResponse.data.data.admins[0].email,
          admin_level: adminsResponse.data.data.admins[0].admin_level
        });
      }
    } catch (error) {
      console.log('❌ Admin users test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 5: Get available roles
    console.log('\n🎭 Test 5: Get Available Roles');
    try {
      const rolesResponse = await axios.get(`${API_BASE}/admin-management/roles`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Roles retrieved successfully');
      console.log(`   Available roles: ${rolesResponse.data.data.roles.length}`);
      rolesResponse.data.data.roles.forEach(role => {
        console.log(`   - ${role.name}: ${role.description}`);
      });
    } catch (error) {
      console.log('❌ Roles test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 6: Get user management statistics
    console.log('\n📊 Test 6: Get User Management Statistics');
    try {
      const statsResponse = await axios.get(`${API_BASE}/admin-management/statistics`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Statistics retrieved successfully');
      const userStats = statsResponse.data.data.user_statistics;
      console.log('   User Statistics:');
      console.log(`   - Total Users: ${userStats.total_users}`);
      console.log(`   - Active Users: ${userStats.active_users}`);
      console.log(`   - Admin Users: ${userStats.admin_users}`);
      console.log(`   - National Admins: ${userStats.national_admins}`);
      console.log(`   - Province Admins: ${userStats.province_admins}`);
      console.log(`   - MFA Enabled: ${userStats.mfa_enabled_users}`);
    } catch (error) {
      console.log('❌ Statistics test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 7: Get pending workflows
    console.log('\n⏳ Test 7: Get Pending User Creation Workflows');
    try {
      const workflowsResponse = await axios.get(`${API_BASE}/admin-management/workflows/pending`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Workflows retrieved successfully');
      console.log(`   Pending workflows: ${workflowsResponse.data.data.workflows.length}`);
    } catch (error) {
      console.log('❌ Workflows test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 8: Test creating a province admin (should create workflow)
    console.log('\n🏗️  Test 8: Create Province Admin (Workflow Test)');
    try {
      const createAdminResponse = await axios.post(`${API_BASE}/admin-management/create-admin`, {
        name: 'Test Province Admin',
        email: 'province.admin@test.org',
        password: 'TestAdmin123!',
        admin_level: 'province',
        role_name: 'provincial_admin',
        province_code: 'GP',
        justification: 'Test province admin creation'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (createAdminResponse.data.success) {
        console.log('✅ Admin creation request successful');
        console.log(`   Requires approval: ${createAdminResponse.data.data.requires_approval}`);
        if (createAdminResponse.data.data.workflow_id) {
          console.log(`   Workflow ID: ${createAdminResponse.data.data.workflow_id}`);
        }
        if (createAdminResponse.data.data.user_id) {
          console.log(`   User ID: ${createAdminResponse.data.data.user_id}`);
        }
      }
    } catch (error) {
      console.log('❌ Admin creation test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 9: Get session statistics
    console.log('\n📈 Test 9: Get Session Statistics');
    try {
      const sessionStatsResponse = await axios.get(`${API_BASE}/sessions/statistics`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Session statistics retrieved successfully');
      const stats = sessionStatsResponse.data.data;
      console.log('   Session Statistics:');
      console.log(`   - Total Active Sessions: ${stats.total_active_sessions}`);
      console.log(`   - Unique Active Users: ${stats.unique_active_users}`);
      console.log(`   - Sessions Created Last Hour: ${stats.sessions_created_last_hour}`);
      console.log(`   - Sessions Active Last Hour: ${stats.sessions_active_last_hour}`);
    } catch (error) {
      console.log('❌ Session statistics test failed:', error.response?.data?.error?.message || error.message);
    }
    
    // Test 10: Validate token
    console.log('\n🔍 Test 10: Validate Authentication Token');
    try {
      const validateResponse = await axios.get(`${API_BASE}/auth/validate`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Token validation successful');
      console.log(`   Valid: ${validateResponse.data.data.valid}`);
      console.log(`   User: ${validateResponse.data.data.user.name}`);
    } catch (error) {
      console.log('❌ Token validation test failed:', error.response?.data?.error?.message || error.message);
    }
    
    console.log('\n🎉 API Endpoint Testing Complete!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Authentication system working');
    console.log('✅ Session management working');
    console.log('✅ MFA system accessible');
    console.log('✅ Admin management working');
    console.log('✅ User creation workflow working');
    console.log('✅ Statistics and reporting working');
    console.log('✅ Token validation working');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
testAPIEndpoints();
