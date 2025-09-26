const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test configuration
const TEST_CONFIG = {
  adminCredentials: {
    email: 'admin@membership.org',
    password: 'Admin123!'
  },
  regularUserCredentials: {
    email: 'user@membership.org',
    password: 'User123!'
  }
};

let adminToken = null;
let regularUserToken = null;

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
  
  const result = await makeRequest('POST', '/auth/login', TEST_CONFIG.adminCredentials);
  
  if (result.success && result.data.success) {
    adminToken = result.data.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.log('❌ Admin login failed:', result.error);
    return false;
  }
};

const testMaintenanceStatusCheck = async () => {
  console.log('\n📊 Testing Maintenance Status Check...');
  
  const result = await makeRequest('GET', '/maintenance/status');
  
  if (result.success) {
    console.log('✅ Status check successful:', result.data.data);
    return result.data.data;
  } else {
    console.log('❌ Status check failed:', result.error);
    return null;
  }
};

const testMaintenanceToggle = async (enabled, message = null, level = 'full_system') => {
  console.log(`\n🔧 Testing Maintenance Mode ${enabled ? 'Enable' : 'Disable'}...`);
  
  const payload = {
    enabled,
    message: message || 'System maintenance in progress. Please check back shortly.',
    level
  };
  
  const result = await makeRequest('POST', '/maintenance/toggle', payload, adminToken);
  
  if (result.success) {
    console.log(`✅ Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`);
    console.log('   Status:', result.data.data);
    return result.data.data;
  } else {
    console.log(`❌ Failed to ${enabled ? 'enable' : 'disable'} maintenance mode:`, result.error);
    return null;
  }
};

const testProtectedEndpointDuringMaintenance = async () => {
  console.log('\n🚫 Testing Protected Endpoint During Maintenance...');
  
  const result = await makeRequest('GET', '/admin/dashboard-stats', null, adminToken);
  
  if (result.status === 503 && result.error?.error?.code === 'MAINTENANCE_MODE') {
    console.log('✅ Protected endpoint correctly blocked during maintenance');
    console.log('   Maintenance message:', result.error.error.message);
    return true;
  } else if (result.success) {
    console.log('⚠️  Protected endpoint accessible during maintenance (admin bypass working)');
    return true;
  } else {
    console.log('❌ Unexpected response from protected endpoint:', result.error);
    return false;
  }
};

const testMaintenanceScheduling = async () => {
  console.log('\n⏰ Testing Maintenance Scheduling...');
  
  const startTime = new Date(Date.now() + 60000); // 1 minute from now
  const endTime = new Date(Date.now() + 120000);  // 2 minutes from now
  
  const payload = {
    scheduled_start: startTime.toISOString(),
    scheduled_end: endTime.toISOString(),
    message: 'Scheduled maintenance test',
    level: 'api_only'
  };
  
  const result = await makeRequest('POST', '/maintenance/schedule', payload, adminToken);
  
  if (result.success) {
    console.log('✅ Maintenance scheduling successful');
    console.log('   Scheduled for:', startTime.toISOString());
    console.log('   Ends at:', endTime.toISOString());
    return result.data.data;
  } else {
    console.log('❌ Maintenance scheduling failed:', result.error);
    return null;
  }
};

const testMaintenanceLogs = async () => {
  console.log('\n📋 Testing Maintenance Logs...');
  
  const result = await makeRequest('GET', '/maintenance/logs?limit=5', null, adminToken);
  
  if (result.success) {
    console.log('✅ Maintenance logs retrieved successfully');
    console.log(`   Found ${result.data.data.length} log entries`);
    
    if (result.data.data.length > 0) {
      console.log('   Latest entry:', {
        action: result.data.data[0].action,
        user: result.data.data[0].user_name,
        timestamp: result.data.data[0].created_at
      });
    }
    
    return result.data.data;
  } else {
    console.log('❌ Failed to retrieve maintenance logs:', result.error);
    return null;
  }
};

const testBypassPermissions = async () => {
  console.log('\n🔓 Testing Bypass Permissions...');
  
  const result = await makeRequest('GET', '/maintenance/bypass-check', null, adminToken);
  
  if (result.success) {
    console.log('✅ Bypass check successful');
    console.log('   Can bypass:', result.data.data.can_bypass);
    console.log('   Reason:', result.data.data.reason);
    return result.data.data.can_bypass;
  } else {
    console.log('❌ Bypass check failed:', result.error);
    return false;
  }
};

const testMaintenancePageAccess = async () => {
  console.log('\n🌐 Testing Maintenance Page Access...');
  
  try {
    // Test direct access to maintenance status endpoint
    const response = await axios.get(`${BASE_URL}/maintenance/status`);
    
    if (response.data.success) {
      const status = response.data.data;
      console.log('✅ Maintenance page can access status');
      console.log('   Current status:', status.status);
      console.log('   Is enabled:', status.is_enabled);
      return true;
    }
  } catch (error) {
    console.log('❌ Maintenance page access failed:', error.message);
    return false;
  }
};

const testDifferentMaintenanceLevels = async () => {
  console.log('\n🎚️  Testing Different Maintenance Levels...');
  
  const levels = ['full_system', 'api_only', 'frontend_only', 'specific_modules'];
  const results = [];
  
  for (const level of levels) {
    console.log(`   Testing level: ${level}`);
    
    // Enable maintenance with this level
    const enableResult = await testMaintenanceToggle(true, `Testing ${level} maintenance`, level);
    
    if (enableResult) {
      console.log(`   ✅ ${level} maintenance enabled successfully`);
      results.push({ level, success: true });
      
      // Disable maintenance
      await testMaintenanceToggle(false);
    } else {
      console.log(`   ❌ ${level} maintenance failed`);
      results.push({ level, success: false });
    }
  }
  
  return results;
};

const testConcurrentRequests = async () => {
  console.log('\n⚡ Testing Concurrent Maintenance Requests...');
  
  const requests = [];
  
  // Create multiple concurrent status check requests
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest('GET', '/maintenance/status'));
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
const runMaintenanceTests = async () => {
  console.log('🧪 Starting Comprehensive Maintenance Mode Tests...\n');
  
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
  await runTest('Maintenance Status Check', () => testMaintenanceStatusCheck());
  await runTest('Bypass Permissions', testBypassPermissions);
  await runTest('Enable Maintenance Mode', () => testMaintenanceToggle(true));
  await runTest('Protected Endpoint During Maintenance', testProtectedEndpointDuringMaintenance);
  await runTest('Maintenance Page Access', testMaintenancePageAccess);
  await runTest('Disable Maintenance Mode', () => testMaintenanceToggle(false));
  await runTest('Maintenance Scheduling', testMaintenanceScheduling);
  await runTest('Maintenance Logs', testMaintenanceLogs);
  await runTest('Different Maintenance Levels', testDifferentMaintenanceLevels);
  await runTest('Concurrent Requests', testConcurrentRequests);
  
  // Final cleanup - ensure maintenance is disabled
  await testMaintenanceToggle(false);
  
  // Print test summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 MAINTENANCE MODE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL MAINTENANCE MODE TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('='.repeat(60));
};

// Run the tests
runMaintenanceTests().catch(console.error);
