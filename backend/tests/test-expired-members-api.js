const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test configuration - try different admin accounts
const TEST_CONFIGS = [
  {
    email: 'admin@membership.org',
    password: 'Admin123!'
  },
  {
    email: 'admin@geomaps.local',
    password: 'Admin123!'
  },
  {
    email: 'ntsowef@gmail.com',
    password: 'password123'
  }
];

let adminToken = null;

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test functions
const testAdminLogin = async () => {
  console.log('\n🔐 Testing Admin Login...');

  // Try different admin credentials
  for (const credentials of TEST_CONFIGS) {
    console.log(`   Trying: ${credentials.email}`);
    const result = await makeRequest('POST', '/auth/login', credentials);

    if (result.success && result.data.success) {
      adminToken = result.data.data.token;
      console.log(`✅ Admin login successful with ${credentials.email}`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${result.error?.message || result.error}`);
    }
  }

  console.log('❌ All admin login attempts failed');
  return false;
};

const testExpiredMembersEndpoint = async () => {
  console.log('\n📊 Testing Expired Members Endpoint...');
  
  const result = await makeRequest('GET', '/statistics/expired-members', null, adminToken);
  
  if (result.success) {
    console.log('✅ Expired members endpoint successful');
    console.log('📈 National Summary:', result.data.data.national_summary);
    console.log('🗺️  Province Breakdown Count:', result.data.data.province_breakdown.length);
    
    if (result.data.data.province_breakdown.length > 0) {
      console.log('🏆 Top 3 Provinces by Expired Members:');
      result.data.data.province_breakdown
        .sort((a, b) => b.expired_count - a.expired_count)
        .slice(0, 3)
        .forEach((province, index) => {
          console.log(`   ${index + 1}. ${province.province_name}: ${province.expired_count} expired, ${province.expiring_soon_count} expiring soon`);
        });
    }
    
    return result.data.data;
  } else {
    console.log('❌ Expired members endpoint failed:', result.error);
    return null;
  }
};

const testDashboardEndpoint = async () => {
  console.log('\n📊 Testing Enhanced Dashboard Endpoint...');
  
  const result = await makeRequest('GET', '/statistics/dashboard', null, adminToken);
  
  if (result.success) {
    console.log('✅ Dashboard endpoint successful');
    console.log('📈 System Stats:', {
      total_members: result.data.data.system.total_members,
      expired_members: result.data.data.system.expired_members,
      expiring_soon_members: result.data.data.system.expiring_soon_members
    });
    
    if (result.data.data.expired_members) {
      console.log('🚨 Expired Members Data:', result.data.data.expired_members);
    }
    
    return result.data.data;
  } else {
    console.log('❌ Dashboard endpoint failed:', result.error);
    return null;
  }
};

const testConcurrentRequests = async () => {
  console.log('\n⚡ Testing Concurrent Expired Members Requests...');
  
  const requests = [];
  
  // Create multiple concurrent requests
  for (let i = 0; i < 3; i++) {
    requests.push(makeRequest('GET', '/statistics/expired-members', null, adminToken));
  }
  
  try {
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ Concurrent requests handled: ${successCount}/${results.length} successful`);
    return successCount === results.length;
  } catch (error) {
    console.log('❌ Concurrent requests failed:', error.message);
    return false;
  }
};

// Main test runner
const runExpiredMembersTests = async () => {
  console.log('🧪 Starting Expired Members API Tests...\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  const runTest = async (testName, testFunction) => {
    testResults.total++;
    try {
      const result = await testFunction();
      if (result) {
        testResults.passed++;
        console.log(`✅ ${testName}: PASSED`);
      } else {
        testResults.failed++;
        console.log(`❌ ${testName}: FAILED`);
      }
    } catch (error) {
      testResults.failed++;
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
    }
  };
  
  // Run all tests
  await runTest('Admin Login', testAdminLogin);
  await runTest('Expired Members Endpoint', testExpiredMembersEndpoint);
  await runTest('Enhanced Dashboard Endpoint', testDashboardEndpoint);
  await runTest('Concurrent Requests', testConcurrentRequests);
  
  // Print test summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 EXPIRED MEMBERS API TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL EXPIRED MEMBERS API TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('='.repeat(60));
};

// Run the tests
runExpiredMembersTests().catch(console.error);
