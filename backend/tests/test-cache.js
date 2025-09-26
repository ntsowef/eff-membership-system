#!/usr/bin/env node

/**
 * Redis Caching Implementation Test Suite
 * 
 * This script tests all aspects of the Redis caching implementation
 * including basic operations, middleware, invalidation, and performance.
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logTest = (testName, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? colors.green : colors.red;
  log(`${status} ${testName}${details ? ' - ' + details : ''}`, color);
  
  testResults.tests.push({ name: testName, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testRedisConnection() {
  log('\n🔌 Testing Redis Connection...', colors.blue);
  
  try {
    const response = await axios.get(`${API_BASE}/cache/health`);
    const isHealthy = response.data.data.status === 'healthy';
    logTest('Redis Connection', isHealthy, 
      isHealthy ? 'Connected successfully' : 'Connection failed');
    return isHealthy;
  } catch (error) {
    logTest('Redis Connection', false, `Error: ${error.message}`);
    return false;
  }
}

async function testBasicCacheOperations() {
  log('\n🧪 Testing Basic Cache Operations...', colors.blue);
  
  try {
    // Test cache health endpoint
    const healthResponse = await axios.get(`${API_BASE}/cache/health`);
    logTest('Cache Health Check', healthResponse.status === 200);
    
    // Test cache stats
    const statsResponse = await axios.get(`${API_BASE}/cache/stats`);
    logTest('Cache Stats', statsResponse.status === 200);
    
    // Test cache metrics
    const metricsResponse = await axios.get(`${API_BASE}/cache/metrics`);
    logTest('Cache Metrics', metricsResponse.status === 200);
    
    return true;
  } catch (error) {
    logTest('Basic Cache Operations', false, `Error: ${error.message}`);
    return false;
  }
}

async function testAnalyticsCaching() {
  log('\n📊 Testing Analytics Route Caching...', colors.blue);
  
  const endpoints = [
    '/analytics/dashboard',
    '/analytics/membership',
    '/analytics/meetings',
    '/analytics/leadership'
  ];
  
  for (const endpoint of endpoints) {
    try {
      // First request (cache miss)
      const start1 = performance.now();
      const response1 = await axios.get(`${API_BASE}${endpoint}`);
      const time1 = performance.now() - start1;
      
      const cacheStatus1 = response1.headers['x-cache'];
      logTest(`${endpoint} - First Request`, response1.status === 200, 
        `${time1.toFixed(2)}ms, Cache: ${cacheStatus1 || 'MISS'}`);
      
      // Second request (should be cache hit)
      await sleep(100); // Small delay
      const start2 = performance.now();
      const response2 = await axios.get(`${API_BASE}${endpoint}`);
      const time2 = performance.now() - start2;
      
      const cacheStatus2 = response2.headers['x-cache'];
      const isCacheHit = cacheStatus2 === 'HIT';
      const speedImprovement = ((time1 - time2) / time1 * 100).toFixed(1);
      
      logTest(`${endpoint} - Cache Hit`, isCacheHit, 
        `${time2.toFixed(2)}ms, ${speedImprovement}% faster`);
        
    } catch (error) {
      logTest(`${endpoint}`, false, `Error: ${error.message}`);
    }
  }
}

async function testStatisticsCaching() {
  log('\n📈 Testing Statistics Route Caching...', colors.blue);
  
  const endpoints = [
    '/statistics/system',
    '/statistics/demographics',
    '/statistics/ward-membership',
    '/statistics/membership-trends'
  ];
  
  for (const endpoint of endpoints) {
    try {
      // First request (cache miss)
      const start1 = performance.now();
      const response1 = await axios.get(`${API_BASE}${endpoint}`);
      const time1 = performance.now() - start1;
      
      const cacheStatus1 = response1.headers['x-cache'];
      logTest(`${endpoint} - First Request`, response1.status === 200, 
        `${time1.toFixed(2)}ms, Cache: ${cacheStatus1 || 'MISS'}`);
      
      // Second request (should be cache hit)
      await sleep(100);
      const start2 = performance.now();
      const response2 = await axios.get(`${API_BASE}${endpoint}`);
      const time2 = performance.now() - start2;
      
      const cacheStatus2 = response2.headers['x-cache'];
      const isCacheHit = cacheStatus2 === 'HIT';
      const speedImprovement = time1 > 0 ? ((time1 - time2) / time1 * 100).toFixed(1) : 0;
      
      logTest(`${endpoint} - Cache Hit`, isCacheHit, 
        `${time2.toFixed(2)}ms, ${speedImprovement}% faster`);
        
    } catch (error) {
      logTest(`${endpoint}`, false, `Error: ${error.message}`);
    }
  }
}

async function testCacheInvalidation() {
  log('\n🗑️ Testing Cache Invalidation...', colors.blue);
  
  try {
    // Test manual cache clearing
    const clearResponse = await axios.delete(`${API_BASE}/cache/clear`, {
      data: { type: 'analytics' }
    });
    logTest('Manual Cache Clear', clearResponse.status === 200);
    
    // Test cache invalidation patterns
    const patternsResponse = await axios.get(`${API_BASE}/cache/invalidation/patterns`);
    logTest('Invalidation Patterns', patternsResponse.status === 200);
    
    // Test manual invalidation trigger
    const triggerResponse = await axios.post(`${API_BASE}/cache/invalidation/trigger`, {
      type: 'analytics',
      operation: 'update'
    });
    logTest('Manual Invalidation Trigger', triggerResponse.status === 200);
    
    return true;
  } catch (error) {
    logTest('Cache Invalidation', false, `Error: ${error.message}`);
    return false;
  }
}

async function testCacheWarmup() {
  log('\n🔥 Testing Cache Warm-up...', colors.blue);
  
  try {
    // Test cache warm-up
    const warmupResponse = await axios.post(`${API_BASE}/cache/warmup`, {
      priority: 'high'
    });
    
    const success = warmupResponse.status === 200;
    const result = warmupResponse.data.data;
    
    logTest('Cache Warm-up', success, 
      success ? `${result.successful}/${result.total} endpoints warmed` : 'Failed');
    
    return success;
  } catch (error) {
    logTest('Cache Warm-up', false, `Error: ${error.message}`);
    return false;
  }
}

async function testPerformanceBenchmark() {
  log('\n⚡ Performance Benchmarking...', colors.blue);
  
  const endpoint = '/analytics/dashboard';
  const iterations = 5;
  
  try {
    // Clear cache first
    await axios.delete(`${API_BASE}/cache/clear`, {
      data: { type: 'analytics' }
    });
    
    // Test without cache (first requests)
    const uncachedTimes = [];
    for (let i = 0; i < iterations; i++) {
      await axios.delete(`${API_BASE}/cache/clear`, { data: { type: 'analytics' } });
      const start = performance.now();
      await axios.get(`${API_BASE}${endpoint}`);
      uncachedTimes.push(performance.now() - start);
      await sleep(100);
    }
    
    // Test with cache (subsequent requests)
    const cachedTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await axios.get(`${API_BASE}${endpoint}`);
      cachedTimes.push(performance.now() - start);
      await sleep(50);
    }
    
    const avgUncached = uncachedTimes.reduce((a, b) => a + b, 0) / uncachedTimes.length;
    const avgCached = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;
    const improvement = ((avgUncached - avgCached) / avgUncached * 100).toFixed(1);
    
    logTest('Performance Benchmark', avgCached < avgUncached, 
      `Uncached: ${avgUncached.toFixed(2)}ms, Cached: ${avgCached.toFixed(2)}ms, ${improvement}% faster`);
    
    return true;
  } catch (error) {
    logTest('Performance Benchmark', false, `Error: ${error.message}`);
    return false;
  }
}

async function testConcurrentRequests() {
  log('\n🚀 Testing Concurrent Requests...', colors.blue);
  
  const endpoint = '/analytics/dashboard';
  const concurrentRequests = 10;
  
  try {
    // Clear cache first
    await axios.delete(`${API_BASE}/cache/clear`, {
      data: { type: 'analytics' }
    });
    
    // Make concurrent requests
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(axios.get(`${API_BASE}${endpoint}`));
    }
    
    const responses = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    
    const allSuccessful = responses.every(r => r.status === 200);
    const avgTimePerRequest = totalTime / concurrentRequests;
    
    logTest('Concurrent Requests', allSuccessful, 
      `${concurrentRequests} requests in ${totalTime.toFixed(2)}ms (${avgTimePerRequest.toFixed(2)}ms avg)`);
    
    return allSuccessful;
  } catch (error) {
    logTest('Concurrent Requests', false, `Error: ${error.message}`);
    return false;
  }
}

async function displayFinalResults() {
  log('\n' + '='.repeat(60), colors.bold);
  log('🧪 REDIS CACHING TEST RESULTS', colors.bold);
  log('='.repeat(60), colors.bold);
  
  const totalTests = testResults.passed + testResults.failed;
  const successRate = ((testResults.passed / totalTests) * 100).toFixed(1);
  
  log(`\nTotal Tests: ${totalTests}`);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? colors.green : colors.yellow);
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', colors.red);
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => log(`  - ${t.name}: ${t.details}`, colors.red));
  }
  
  log('\n' + '='.repeat(60), colors.bold);
  
  if (successRate >= 80) {
    log('🎉 Cache implementation is working well!', colors.green);
  } else {
    log('⚠️  Some issues detected. Please review failed tests.', colors.yellow);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Redis Caching Implementation Tests...', colors.bold);
  log('=' .repeat(60), colors.bold);
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE}/health`);
  } catch (error) {
    log('❌ Backend server is not running. Please start the server first.', colors.red);
    log('Run: npm run dev (in backend directory)', colors.yellow);
    process.exit(1);
  }
  
  // Run all tests
  const redisConnected = await testRedisConnection();
  
  if (!redisConnected) {
    log('\n⚠️  Redis is not connected. Some tests will be skipped.', colors.yellow);
    log('To start Redis:', colors.yellow);
    log('  - Windows: Download and install Redis, or use Docker', colors.yellow);
    log('  - macOS: brew install redis && redis-server', colors.yellow);
    log('  - Linux: sudo apt-get install redis-server && redis-server', colors.yellow);
  }
  
  await testBasicCacheOperations();
  await testAnalyticsCaching();
  await testStatisticsCaching();
  await testCacheInvalidation();
  await testCacheWarmup();
  await testPerformanceBenchmark();
  await testConcurrentRequests();
  
  await displayFinalResults();
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n❌ Test runner error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
};
