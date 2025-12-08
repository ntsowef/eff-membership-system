/**
 * Super Admin API Test Script
 * 
 * This script tests all super admin endpoints to ensure they're working correctly.
 * 
 * Prerequisites:
 * 1. Backend server must be running on http://localhost:5000
 * 2. You must have a super_admin user account
 * 3. You must be logged in and have a valid JWT token
 * 
 * Usage:
 * 1. Replace YOUR_SUPER_ADMIN_TOKEN with your actual JWT token
 * 2. Run: node test/super-admin-api-test.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';
const SUPER_ADMIN_TOKEN = 'YOUR_SUPER_ADMIN_TOKEN'; // Replace with actual token

// Configure axios with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
  }
}

// Test functions
async function testDashboard() {
  const response = await api.get('/super-admin/dashboard');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Dashboard data:', JSON.stringify(response.data.data, null, 2).substring(0, 200) + '...');
}

async function testSystemHealth() {
  const response = await api.get('/super-admin/system/health');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   System health:', response.data.data.overall_status);
}

async function testRedisMetrics() {
  const response = await api.get('/super-admin/redis/status');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Redis status:', response.data.data.status);
}

async function testDatabaseConnections() {
  const response = await api.get('/super-admin/database/connections');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   DB connections:', response.data.data.total_connections);
}

async function testQueueJobs() {
  const response = await api.get('/super-admin/queue/jobs?limit=5');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Queue jobs count:', response.data.data.total);
}

async function testAllUploads() {
  const response = await api.get('/super-admin/uploads/all?limit=5');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Total uploads:', response.data.data.total);
}

async function testUploadStatistics() {
  const response = await api.get('/super-admin/uploads/statistics');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Upload stats:', JSON.stringify(response.data.data).substring(0, 100) + '...');
}

async function testActiveSessions() {
  const response = await api.get('/super-admin/sessions/active');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Active sessions:', response.data.data.length);
}

async function testSystemConfiguration() {
  const response = await api.get('/super-admin/config');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Config loaded:', Object.keys(response.data.data).length + ' sections');
}

async function testRateLimitStatistics() {
  const response = await api.get('/super-admin/rate-limits/statistics');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Rate limit stats loaded');
}

async function testLookupTables() {
  const response = await api.get('/super-admin/lookups/tables');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Lookup tables:', response.data.data.length);
}

async function testLookupEntries() {
  const response = await api.get('/super-admin/lookups/provinces?limit=5');
  if (!response.data.success) throw new Error('Response not successful');
  console.log('   Province entries:', response.data.data.total);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Super Admin API Tests...');
  console.log('=' .repeat(60));

  // Check if token is set
  if (SUPER_ADMIN_TOKEN === 'YOUR_SUPER_ADMIN_TOKEN') {
    console.log('❌ ERROR: Please set your super admin JWT token in the script');
    console.log('   Replace YOUR_SUPER_ADMIN_TOKEN with your actual token');
    process.exit(1);
  }

  // Run all tests
  await runTest('Dashboard Data', testDashboard);
  await runTest('System Health', testSystemHealth);
  await runTest('Redis Metrics', testRedisMetrics);
  await runTest('Database Connections', testDatabaseConnections);
  await runTest('Queue Jobs', testQueueJobs);
  await runTest('All Uploads', testAllUploads);
  await runTest('Upload Statistics', testUploadStatistics);
  await runTest('Active Sessions', testActiveSessions);
  await runTest('System Configuration', testSystemConfiguration);
  await runTest('Rate Limit Statistics', testRateLimitStatistics);
  await runTest('Lookup Tables', testLookupTables);
  await runTest('Lookup Entries (Provinces)', testLookupEntries);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total:  ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAILED').forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});

