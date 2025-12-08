const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testSuperAdminDashboard() {
  try {
    // Step 1: Authenticate as Super Admin
    console.log('🔐 Authenticating as Super Admin...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@eff.org.za',
      password: 'SuperAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Test Super Admin Dashboard endpoint
    console.log('📋 Testing Super Admin Dashboard API...\n');
    console.log('URL: /super-admin/dashboard\n');
    
    const response = await axios.get(`${API_URL}/super-admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response structure:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n\nChecking data structure:');
    console.log('response.data.success:', response.data.success);
    console.log('response.data.data:', typeof response.data.data);
    
    if (response.data.data) {
      const data = response.data.data;
      console.log('\n✅ Dashboard data structure:');
      console.log('  - system_health:', !!data.system_health);
      console.log('  - user_statistics:', !!data.user_statistics);
      console.log('  - queue_statistics:', !!data.queue_statistics);
      console.log('  - storage_statistics:', !!data.storage_statistics);
      console.log('  - recent_activity:', !!data.recent_activity);
      
      if (data.user_statistics) {
        console.log('\n📊 User Statistics:');
        console.log('  - Total Users:', data.user_statistics.total_users);
        console.log('  - Active Users:', data.user_statistics.active_users);
        console.log('  - Super Admins:', data.user_statistics.super_admins);
      }
      
      if (data.system_health) {
        console.log('\n🏥 System Health:');
        console.log('  - Overall Status:', data.system_health.overall_status);
        console.log('  - Database Status:', data.system_health.database?.status);
        console.log('  - Redis Status:', data.system_health.redis?.status);
      }
      
      if (data.queue_statistics) {
        console.log('\n📦 Queue Statistics:');
        console.log('  - Total Waiting:', data.queue_statistics.total_waiting);
        console.log('  - Total Active:', data.queue_statistics.total_active);
        console.log('  - Total Completed:', data.queue_statistics.total_completed);
        console.log('  - Total Failed:', data.queue_statistics.total_failed);
      }
    } else {
      console.log('\n❌ No data found in response.data.data');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testSuperAdminDashboard();

