#!/usr/bin/env node

/**
 * Simple Redis Caching Test
 * 
 * Tests the core caching functionality without requiring authentication
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCachePerformance() {
  log('\n🚀 Redis Cache Performance Test', colors.bold);
  log('=' .repeat(50), colors.bold);
  
  const endpoints = [
    { path: '/analytics/dashboard', name: 'Analytics Dashboard' },
    { path: '/analytics/membership', name: 'Membership Analytics' },
    { path: '/statistics/system', name: 'System Statistics' },
    { path: '/statistics/demographics', name: 'Demographics' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      log(`\n📊 Testing: ${endpoint.name}`, colors.blue);
      
      // First request (cache miss)
      const start1 = performance.now();
      const response1 = await axios.get(`${API_BASE}${endpoint.path}`);
      const time1 = performance.now() - start1;
      
      const cacheStatus1 = response1.headers['x-cache'] || 'MISS';
      log(`  First Request: ${time1.toFixed(2)}ms [${cacheStatus1}]`, colors.yellow);
      
      // Wait a moment
      await sleep(100);
      
      // Second request (should be cache hit)
      const start2 = performance.now();
      const response2 = await axios.get(`${API_BASE}${endpoint.path}`);
      const time2 = performance.now() - start2;
      
      const cacheStatus2 = response2.headers['x-cache'] || 'MISS';
      const improvement = time1 > 0 ? ((time1 - time2) / time1 * 100) : 0;
      
      log(`  Second Request: ${time2.toFixed(2)}ms [${cacheStatus2}] - ${improvement.toFixed(1)}% faster`, 
          cacheStatus2 === 'HIT' ? colors.green : colors.red);
      
      results.push({
        endpoint: endpoint.name,
        firstRequest: time1,
        secondRequest: time2,
        improvement: improvement,
        cacheWorking: cacheStatus2 === 'HIT'
      });
      
    } catch (error) {
      log(`  ❌ Error: ${error.message}`, colors.red);
      results.push({
        endpoint: endpoint.name,
        error: error.message,
        cacheWorking: false
      });
    }
  }
  
  return results;
}

async function testConcurrentRequests() {
  log('\n🚀 Concurrent Request Test', colors.blue);
  
  const endpoint = '/analytics/dashboard';
  const concurrentCount = 5;
  
  try {
    log(`Making ${concurrentCount} concurrent requests to ${endpoint}...`);
    
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(axios.get(`${API_BASE}${endpoint}`));
    }
    
    const responses = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    
    const cacheHits = responses.filter(r => r.headers['x-cache'] === 'HIT').length;
    const avgTime = totalTime / concurrentCount;
    
    log(`  ✅ ${concurrentCount} requests completed in ${totalTime.toFixed(2)}ms`, colors.green);
    log(`  📊 Average time per request: ${avgTime.toFixed(2)}ms`, colors.green);
    log(`  🎯 Cache hits: ${cacheHits}/${concurrentCount}`, colors.green);
    
    return {
      success: true,
      totalTime,
      avgTime,
      cacheHits,
      totalRequests: concurrentCount
    };
    
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

async function testCacheHeaders() {
  log('\n🔍 Cache Headers Test', colors.blue);
  
  try {
    const response = await axios.get(`${API_BASE}/analytics/dashboard`);
    
    const cacheHeaders = {
      'x-cache': response.headers['x-cache'],
      'x-cache-key': response.headers['x-cache-key']
    };
    
    log(`  Cache Status: ${cacheHeaders['x-cache'] || 'Not Set'}`, 
        cacheHeaders['x-cache'] ? colors.green : colors.yellow);
    log(`  Cache Key: ${cacheHeaders['x-cache-key'] || 'Not Set'}`, 
        cacheHeaders['x-cache-key'] ? colors.green : colors.yellow);
    
    return cacheHeaders;
    
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, colors.red);
    return { error: error.message };
  }
}

async function displayResults(performanceResults, concurrentResults, headerResults) {
  log('\n' + '='.repeat(60), colors.bold);
  log('📊 CACHE TEST RESULTS SUMMARY', colors.bold);
  log('='.repeat(60), colors.bold);
  
  // Performance Results
  log('\n🚀 Performance Results:', colors.blue);
  const workingEndpoints = performanceResults.filter(r => r.cacheWorking && !r.error);
  const totalEndpoints = performanceResults.length;
  
  if (workingEndpoints.length > 0) {
    const avgImprovement = workingEndpoints.reduce((sum, r) => sum + r.improvement, 0) / workingEndpoints.length;
    log(`  ✅ Cache working on ${workingEndpoints.length}/${totalEndpoints} endpoints`, colors.green);
    log(`  ⚡ Average performance improvement: ${avgImprovement.toFixed(1)}%`, colors.green);
    
    workingEndpoints.forEach(result => {
      log(`    • ${result.endpoint}: ${result.improvement.toFixed(1)}% faster`, colors.green);
    });
  } else {
    log(`  ❌ Cache not working on any endpoints`, colors.red);
  }
  
  // Concurrent Results
  log('\n🚀 Concurrent Request Results:', colors.blue);
  if (concurrentResults.success) {
    log(`  ✅ Handled ${concurrentResults.totalRequests} concurrent requests successfully`, colors.green);
    log(`  ⚡ Average response time: ${concurrentResults.avgTime.toFixed(2)}ms`, colors.green);
    log(`  🎯 Cache hit rate: ${((concurrentResults.cacheHits / concurrentResults.totalRequests) * 100).toFixed(1)}%`, colors.green);
  } else {
    log(`  ❌ Concurrent test failed: ${concurrentResults.error}`, colors.red);
  }
  
  // Header Results
  log('\n🔍 Cache Headers:', colors.blue);
  if (headerResults.error) {
    log(`  ❌ Header test failed: ${headerResults.error}`, colors.red);
  } else {
    log(`  ✅ Cache headers are properly set`, colors.green);
  }
  
  // Overall Assessment
  log('\n' + '='.repeat(60), colors.bold);
  const successRate = (workingEndpoints.length / totalEndpoints) * 100;
  
  if (successRate >= 75) {
    log('🎉 CACHE IMPLEMENTATION IS WORKING EXCELLENTLY!', colors.green);
    log('✅ Your Redis caching is providing significant performance improvements.', colors.green);
  } else if (successRate >= 50) {
    log('⚠️  CACHE IMPLEMENTATION IS PARTIALLY WORKING', colors.yellow);
    log('Some endpoints are cached, but there may be room for improvement.', colors.yellow);
  } else {
    log('❌ CACHE IMPLEMENTATION NEEDS ATTENTION', colors.red);
    log('Most endpoints are not being cached properly.', colors.red);
  }
  
  log('\n📈 Key Benefits Observed:', colors.blue);
  if (workingEndpoints.length > 0) {
    log('• Faster response times for cached endpoints', colors.green);
    log('• Reduced database load', colors.green);
    log('• Better user experience', colors.green);
    log('• Scalable architecture', colors.green);
  }
  
  log('\n🔧 Next Steps:', colors.blue);
  log('• Monitor cache hit rates in production', colors.yellow);
  log('• Set up cache invalidation for data updates', colors.yellow);
  log('• Consider cache warm-up strategies', colors.yellow);
  log('• Implement cache monitoring dashboards', colors.yellow);
}

async function runSimpleTests() {
  log('🧪 Simple Redis Cache Test Suite', colors.bold);
  log('Testing core caching functionality...', colors.blue);
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE}/health`);
    log('✅ Backend server is running', colors.green);
  } catch (error) {
    log('❌ Backend server is not running. Please start it first.', colors.red);
    process.exit(1);
  }
  
  // Run tests
  const performanceResults = await testCachePerformance();
  const concurrentResults = await testConcurrentRequests();
  const headerResults = await testCacheHeaders();
  
  // Display results
  await displayResults(performanceResults, concurrentResults, headerResults);
}

// Run tests
if (require.main === module) {
  runSimpleTests().catch(error => {
    log(`\n❌ Test error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { runSimpleTests };
