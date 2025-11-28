#!/usr/bin/env node

/**
 * Simple Dashboard Endpoints Testing Script
 * Tests dashboard endpoints without requiring full server compilation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = null;

console.log('🧪 Simple Dashboard Endpoints Testing Started...\n');

// Helper function to make requests
async function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      code: error.code
    };
  }
}

// Test server availability
async function testServerAvailability() {
  console.log('🔍 Checking server availability...');
  
  const endpoints = [
    '/health',
    '/api/health',
    '/',
    '/status'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ Server is running - ${endpoint}: ${result.status}`);
      return true;
    } else if (result.code === 'ECONNREFUSED') {
      console.log(`❌ Server not running on port 5000`);
      return false;
    }
  }
  
  return false;
}

// Test authentication endpoints
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Endpoints...');
  
  const authEndpoints = [
    '/api/auth/login',
    '/api/login',
    '/auth/login',
    '/login'
  ];

  const testCredentials = [
    { email: 'admin@eff.org.za', password: 'admin123' },
    { username: 'admin', password: 'admin123' },
    { email: 'test@test.com', password: 'test123' }
  ];

  for (const endpoint of authEndpoints) {
    for (const creds of testCredentials) {
      const result = await makeRequest('POST', endpoint, creds);
      
      if (result.success && result.data?.token) {
        authToken = result.data.token;
        console.log(`✅ Authentication successful: ${endpoint}`);
        console.log(`   🔑 Token obtained: ${authToken.substring(0, 20)}...`);
        return true;
      } else if (result.status === 404) {
        console.log(`⚠️  Endpoint not found: ${endpoint}`);
      } else if (result.status === 401) {
        console.log(`⚠️  Invalid credentials for: ${endpoint}`);
      } else {
        console.log(`❌ Auth failed: ${endpoint} - ${result.status} - ${result.error}`);
      }
    }
  }
  
  console.log('ℹ️  Proceeding without authentication...');
  return false;
}

// Test dashboard endpoints
async function testDashboardEndpoints() {
  console.log('\n📊 Testing Dashboard Endpoints...');
  
  const dashboardEndpoints = [
    // Overview endpoints
    '/api/dashboard',
    '/api/dashboard/overview',
    '/api/dashboard/metrics',
    '/api/dashboard/stats',
    '/dashboard',
    '/dashboard/overview',
    
    // Financial dashboard endpoints
    '/api/financial/dashboard',
    '/api/financial/dashboard/metrics',
    '/api/financial/dashboard/stats',
    '/api/financial/dashboard/realtime-stats',
    '/api/financial/dashboard/trends',
    '/api/financial/dashboard/alerts',
    '/api/unified-financial/dashboard',
    
    // Analytics endpoints
    '/api/analytics',
    '/api/analytics/overview',
    '/api/analytics/dashboard',
    '/api/analytics/metrics',
    '/api/analytics/performance',
    '/api/analytics/realtime',
    
    // Application statistics
    '/api/applications/stats',
    '/api/applications/dashboard',
    '/api/applications/metrics',
    '/api/membership/applications/statistics',
    
    // Renewal statistics
    '/api/renewals/stats',
    '/api/renewals/dashboard',
    '/api/renewals/metrics',
    '/api/membership/renewals/statistics',
    
    // Performance metrics
    '/api/performance/metrics',
    '/api/performance/dashboard',
    '/api/system/performance',
    
    // Real-time statistics
    '/api/realtime/stats',
    '/api/realtime/dashboard',
    '/api/queue/status',
    '/api/queue/stats',
    
    // Alert system
    '/api/alerts',
    '/api/alerts/dashboard',
    '/api/system/alerts'
  ];

  let successCount = 0;
  let totalCount = dashboardEndpoints.length;

  for (const endpoint of dashboardEndpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
      if (result.data && typeof result.data === 'object') {
        const keys = Object.keys(result.data);
        if (keys.length > 0) {
          console.log(`   📊 Keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
        }
      }
      successCount++;
    } else if (result.status === 404) {
      console.log(`⚠️  ${endpoint}: Not Found (404)`);
    } else if (result.status === 401) {
      console.log(`🔒 ${endpoint}: Unauthorized (401) - May need authentication`);
    } else if (result.status === 403) {
      console.log(`🚫 ${endpoint}: Forbidden (403) - Access denied`);
    } else if (result.status === 500) {
      console.log(`❌ ${endpoint}: Server Error (500) - ${result.error}`);
    } else if (result.code === 'ECONNREFUSED') {
      console.log(`❌ ${endpoint}: Connection refused - Server not running`);
      break;
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }

  console.log(`\n📈 Dashboard Endpoints Summary: ${successCount}/${totalCount} successful`);
  return successCount;
}

// Test with query parameters
async function testEndpointsWithParams() {
  console.log('\n🔧 Testing Endpoints with Parameters...');
  
  const parameterizedEndpoints = [
    '/api/financial/dashboard/trends?period=daily&limit=30',
    '/api/financial/dashboard/trends?period=weekly&limit=12',
    '/api/financial/dashboard/trends?period=monthly&limit=6',
    '/api/alerts?severity=high',
    '/api/alerts?category=performance',
    '/api/alerts?category=financial',
    '/api/analytics/performance?timeframe=24h',
    '/api/analytics/performance?timeframe=7d',
    '/api/queue/status?detailed=true'
  ];

  let successCount = 0;

  for (const endpoint of parameterizedEndpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status}`);
      successCount++;
    } else if (result.status === 404) {
      console.log(`⚠️  ${endpoint}: Not Found`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }

  console.log(`\n📊 Parameterized Endpoints: ${successCount}/${parameterizedEndpoints.length} successful`);
  return successCount;
}

// Main test execution
async function runTests() {
  try {
    console.log('🚀 Starting Dashboard Endpoints Testing...\n');

    // Test server availability
    const serverRunning = await testServerAvailability();
    
    if (!serverRunning) {
      console.log('\n❌ Server is not running on port 5000');
      console.log('ℹ️  Please start the backend server first:');
      console.log('   cd backend');
      console.log('   npm start');
      console.log('\n   Or if there are compilation errors, try:');
      console.log('   npm run dev  (if available)');
      console.log('   node dist/app.js  (if already compiled)');
      return;
    }

    // Test authentication
    await testAuthentication();

    // Test dashboard endpoints
    const dashboardSuccess = await testDashboardEndpoints();

    // Test parameterized endpoints
    const paramSuccess = await testEndpointsWithParams();

    // Final summary
    console.log('\n🏆 Testing Complete!');
    console.log(`📊 Dashboard endpoints working: ${dashboardSuccess > 0 ? '✅' : '❌'}`);
    console.log(`🔧 Parameterized endpoints working: ${paramSuccess > 0 ? '✅' : '❌'}`);
    
    if (dashboardSuccess === 0 && paramSuccess === 0) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('   1. Check if the server is properly configured');
      console.log('   2. Verify database connection');
      console.log('   3. Check server logs for errors');
      console.log('   4. Ensure all required services are running');
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runTests();
