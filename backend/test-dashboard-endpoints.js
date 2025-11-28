#!/usr/bin/env node

/**
 * Dashboard Endpoints Testing Script
 * Tests all dashboard statistics endpoints in the membership management system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = null;

// Test configuration
const testConfig = {
  timeout: 10000,
  retries: 3
};

console.log('🧪 Dashboard Endpoints Testing Started...\n');

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    timeout: testConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
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
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message
    };
  }
}

// Test authentication
async function testAuthentication() {
  console.log('🔐 Testing Authentication...');
  
  const loginData = {
    email: 'admin@eff.org.za',
    password: 'admin123'
  };

  const result = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (result.success && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Authentication successful');
    return true;
  } else {
    console.log('❌ Authentication failed:', result.error);
    console.log('ℹ️  Proceeding without authentication for public endpoints...');
    return false;
  }
}

// Test dashboard overview metrics
async function testOverviewMetrics() {
  console.log('\n📊 Testing Overview Metrics...');
  
  const endpoints = [
    '/api/dashboard/overview',
    '/api/dashboard/metrics',
    '/api/analytics/overview'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
      if (result.data) {
        console.log(`   📈 Keys: ${Object.keys(result.data).join(', ')}`);
      }
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test financial dashboard metrics
async function testFinancialMetrics() {
  console.log('\n💰 Testing Financial Dashboard Metrics...');
  
  const endpoints = [
    '/api/financial/dashboard/metrics',
    '/api/financial/dashboard/realtime-stats',
    '/api/financial/dashboard/trends?period=daily&limit=30',
    '/api/financial/dashboard/alerts',
    '/api/unified-financial/dashboard'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
      if (result.data) {
        const keys = Object.keys(result.data);
        console.log(`   📊 Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test application statistics
async function testApplicationStats() {
  console.log('\n📝 Testing Application Statistics...');
  
  const endpoints = [
    '/api/applications/stats',
    '/api/applications/dashboard',
    '/api/membership/applications/statistics',
    '/api/analytics/applications'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test renewal statistics
async function testRenewalStats() {
  console.log('\n🔄 Testing Renewal Statistics...');
  
  const endpoints = [
    '/api/renewals/stats',
    '/api/renewals/dashboard',
    '/api/membership/renewals/statistics',
    '/api/analytics/renewals'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test performance metrics
async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...');
  
  const endpoints = [
    '/api/performance/metrics',
    '/api/dashboard/performance',
    '/api/analytics/performance',
    '/api/system/performance'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test real-time statistics
async function testRealtimeStats() {
  console.log('\n🔴 Testing Real-time Statistics...');
  
  const endpoints = [
    '/api/realtime/stats',
    '/api/dashboard/realtime',
    '/api/analytics/realtime',
    '/api/queue/status'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Test alert system
async function testAlertSystem() {
  console.log('\n🚨 Testing Alert System...');
  
  const endpoints = [
    '/api/alerts',
    '/api/dashboard/alerts',
    '/api/system/alerts',
    '/api/alerts?severity=high',
    '/api/alerts?category=performance'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest('GET', endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: ${result.status} - Data received`);
    } else {
      console.log(`❌ ${endpoint}: ${result.status} - ${result.error}`);
    }
  }
}

// Main test execution
async function runAllTests() {
  try {
    // Test server availability
    console.log('🔍 Checking server availability...');
    const healthCheck = await makeRequest('GET', '/health');
    
    if (!healthCheck.success) {
      console.log('❌ Server is not running on port 5000');
      console.log('ℹ️  Please start the backend server first: npm start');
      return;
    }
    
    console.log('✅ Server is running\n');

    // Run authentication test
    await testAuthentication();

    // Run all dashboard tests
    await testOverviewMetrics();
    await testFinancialMetrics();
    await testApplicationStats();
    await testRenewalStats();
    await testPerformanceMetrics();
    await testRealtimeStats();
    await testAlertSystem();

    console.log('\n🏆 Dashboard Endpoints Testing Complete!');
    console.log('📋 Check the results above for endpoint status and data validation.');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runAllTests();
