#!/usr/bin/env node

/**
 * Redis Cache Performance Benchmark
 * 
 * Comprehensive performance testing of the caching implementation
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test endpoints with expected performance characteristics
const TEST_ENDPOINTS = [
  {
    path: '/analytics/dashboard',
    name: 'Analytics Dashboard',
    category: 'Analytics',
    expectedImprovement: 80
  },
  {
    path: '/analytics/membership',
    name: 'Membership Analytics',
    category: 'Analytics',
    expectedImprovement: 85
  },
  {
    path: '/analytics/meetings',
    name: 'Meeting Analytics',
    category: 'Analytics',
    expectedImprovement: 70
  },
  {
    path: '/analytics/leadership',
    name: 'Leadership Analytics',
    category: 'Analytics',
    expectedImprovement: 75
  },
  {
    path: '/statistics/system',
    name: 'System Statistics',
    category: 'Statistics',
    expectedImprovement: 70
  },
  {
    path: '/statistics/demographics',
    name: 'Demographics',
    category: 'Statistics',
    expectedImprovement: 75
  },
  {
    path: '/statistics/ward-membership',
    name: 'Ward Membership Stats',
    category: 'Statistics',
    expectedImprovement: 80
  },
  {
    path: '/statistics/membership-trends',
    name: 'Membership Trends',
    category: 'Statistics',
    expectedImprovement: 70
  }
];

async function clearCacheForEndpoint(endpoint) {
  // Simulate cache clearing by making a request and ignoring the result
  // In a real scenario, you'd call a cache invalidation endpoint
  try {
    await axios.get(`${API_BASE}${endpoint}?_cache_bust=${Date.now()}`);
  } catch (error) {
    // Ignore errors for cache busting
  }
}

async function measureEndpointPerformance(endpoint, iterations = 3) {
  const results = {
    endpoint: endpoint.name,
    path: endpoint.path,
    category: endpoint.category,
    expectedImprovement: endpoint.expectedImprovement,
    uncachedTimes: [],
    cachedTimes: [],
    errors: []
  };
  
  log(`\n📊 Testing: ${endpoint.name}`, colors.blue);
  
  // Measure uncached performance (first requests)
  for (let i = 0; i < iterations; i++) {
    try {
      // Clear any existing cache
      await clearCacheForEndpoint(endpoint.path);
      await sleep(100);
      
      const start = performance.now();
      const response = await axios.get(`${API_BASE}${endpoint.path}`);
      const time = performance.now() - start;
      
      results.uncachedTimes.push(time);
      
      const cacheStatus = response.headers['x-cache'] || 'UNKNOWN';
      log(`  Uncached ${i + 1}: ${time.toFixed(2)}ms [${cacheStatus}]`, colors.yellow);
      
    } catch (error) {
      results.errors.push(`Uncached ${i + 1}: ${error.message}`);
      log(`  Uncached ${i + 1}: ERROR - ${error.message}`, colors.red);
    }
  }
  
  // Wait for cache to be populated
  await sleep(200);
  
  // Measure cached performance (subsequent requests)
  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();
      const response = await axios.get(`${API_BASE}${endpoint.path}`);
      const time = performance.now() - start;
      
      results.cachedTimes.push(time);
      
      const cacheStatus = response.headers['x-cache'] || 'UNKNOWN';
      log(`  Cached ${i + 1}: ${time.toFixed(2)}ms [${cacheStatus}]`, 
          cacheStatus === 'HIT' ? colors.green : colors.red);
      
    } catch (error) {
      results.errors.push(`Cached ${i + 1}: ${error.message}`);
      log(`  Cached ${i + 1}: ERROR - ${error.message}`, colors.red);
    }
    
    await sleep(50);
  }
  
  // Calculate statistics
  if (results.uncachedTimes.length > 0 && results.cachedTimes.length > 0) {
    results.avgUncached = results.uncachedTimes.reduce((a, b) => a + b, 0) / results.uncachedTimes.length;
    results.avgCached = results.cachedTimes.reduce((a, b) => a + b, 0) / results.cachedTimes.length;
    results.improvement = ((results.avgUncached - results.avgCached) / results.avgUncached) * 100;
    results.speedupFactor = results.avgUncached / results.avgCached;
    
    const improvementColor = results.improvement >= endpoint.expectedImprovement ? colors.green : 
                            results.improvement >= 50 ? colors.yellow : colors.red;
    
    log(`  📈 Performance: ${results.improvement.toFixed(1)}% faster (${results.speedupFactor.toFixed(1)}x speedup)`, 
        improvementColor);
  }
  
  return results;
}

async function runLoadTest(endpoint, concurrentRequests = 10, duration = 5000) {
  log(`\n🚀 Load Testing: ${endpoint.name}`, colors.cyan);
  log(`  ${concurrentRequests} concurrent requests for ${duration/1000}s`, colors.cyan);
  
  const results = {
    endpoint: endpoint.name,
    concurrentRequests,
    duration,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    responseTimes: [],
    errors: []
  };
  
  const startTime = Date.now();
  const promises = [];
  
  // Create concurrent request workers
  for (let i = 0; i < concurrentRequests; i++) {
    const worker = async () => {
      while (Date.now() - startTime < duration) {
        try {
          const requestStart = performance.now();
          const response = await axios.get(`${API_BASE}${endpoint.path}`);
          const requestTime = performance.now() - requestStart;
          
          results.totalRequests++;
          results.successfulRequests++;
          results.responseTimes.push(requestTime);
          
          const cacheStatus = response.headers['x-cache'];
          if (cacheStatus === 'HIT') {
            results.cacheHits++;
          } else {
            results.cacheMisses++;
          }
          
        } catch (error) {
          results.totalRequests++;
          results.failedRequests++;
          results.errors.push(error.message);
        }
        
        await sleep(10); // Small delay between requests
      }
    };
    
    promises.push(worker());
  }
  
  await Promise.all(promises);
  
  // Calculate statistics
  if (results.responseTimes.length > 0) {
    results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    results.minResponseTime = Math.min(...results.responseTimes);
    results.maxResponseTime = Math.max(...results.responseTimes);
    results.requestsPerSecond = results.totalRequests / (duration / 1000);
    results.cacheHitRate = (results.cacheHits / results.totalRequests) * 100;
  }
  
  log(`  📊 Results:`, colors.cyan);
  log(`    Total Requests: ${results.totalRequests}`, colors.green);
  log(`    Successful: ${results.successfulRequests} (${((results.successfulRequests/results.totalRequests)*100).toFixed(1)}%)`, colors.green);
  log(`    Failed: ${results.failedRequests}`, results.failedRequests > 0 ? colors.red : colors.green);
  log(`    Requests/sec: ${results.requestsPerSecond.toFixed(1)}`, colors.green);
  log(`    Cache Hit Rate: ${results.cacheHitRate.toFixed(1)}%`, colors.green);
  log(`    Avg Response: ${results.avgResponseTime.toFixed(2)}ms`, colors.green);
  log(`    Min/Max: ${results.minResponseTime.toFixed(2)}ms / ${results.maxResponseTime.toFixed(2)}ms`, colors.green);
  
  return results;
}

async function generateBenchmarkReport(performanceResults, loadTestResults) {
  log('\n' + '='.repeat(80), colors.bold);
  log('📊 REDIS CACHE PERFORMANCE BENCHMARK REPORT', colors.bold);
  log('='.repeat(80), colors.bold);
  
  // Performance Summary
  log('\n🚀 PERFORMANCE SUMMARY', colors.blue);
  log('-'.repeat(50), colors.blue);
  
  const successfulTests = performanceResults.filter(r => r.avgUncached && r.avgCached);
  const totalTests = performanceResults.length;
  
  if (successfulTests.length > 0) {
    const avgImprovement = successfulTests.reduce((sum, r) => sum + r.improvement, 0) / successfulTests.length;
    const avgSpeedup = successfulTests.reduce((sum, r) => sum + r.speedupFactor, 0) / successfulTests.length;
    
    log(`✅ Successful Tests: ${successfulTests.length}/${totalTests}`, colors.green);
    log(`⚡ Average Performance Improvement: ${avgImprovement.toFixed(1)}%`, colors.green);
    log(`🚀 Average Speedup Factor: ${avgSpeedup.toFixed(1)}x`, colors.green);
    
    // Category breakdown
    const categories = {};
    successfulTests.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    });
    
    log('\n📈 Performance by Category:', colors.blue);
    Object.entries(categories).forEach(([category, results]) => {
      const categoryAvg = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
      log(`  ${category}: ${categoryAvg.toFixed(1)}% average improvement`, colors.green);
    });
    
    // Top performers
    log('\n🏆 Top Performing Endpoints:', colors.blue);
    const topPerformers = successfulTests
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 3);
    
    topPerformers.forEach((result, index) => {
      log(`  ${index + 1}. ${result.endpoint}: ${result.improvement.toFixed(1)}% faster`, colors.green);
    });
    
  } else {
    log('❌ No successful performance tests', colors.red);
  }
  
  // Load Test Summary
  log('\n🚀 LOAD TEST SUMMARY', colors.blue);
  log('-'.repeat(50), colors.blue);
  
  if (loadTestResults.length > 0) {
    const totalRequests = loadTestResults.reduce((sum, r) => sum + r.totalRequests, 0);
    const avgHitRate = loadTestResults.reduce((sum, r) => sum + r.cacheHitRate, 0) / loadTestResults.length;
    const avgResponseTime = loadTestResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / loadTestResults.length;
    const avgRPS = loadTestResults.reduce((sum, r) => sum + r.requestsPerSecond, 0) / loadTestResults.length;
    
    log(`📊 Total Requests Processed: ${totalRequests}`, colors.green);
    log(`🎯 Average Cache Hit Rate: ${avgHitRate.toFixed(1)}%`, colors.green);
    log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`, colors.green);
    log(`🚀 Average Requests/Second: ${avgRPS.toFixed(1)}`, colors.green);
  }
  
  // Recommendations
  log('\n💡 RECOMMENDATIONS', colors.blue);
  log('-'.repeat(50), colors.blue);
  
  if (successfulTests.length > 0) {
    const avgImprovement = successfulTests.reduce((sum, r) => sum + r.improvement, 0) / successfulTests.length;
    
    if (avgImprovement >= 70) {
      log('🎉 Excellent cache performance! Your implementation is working optimally.', colors.green);
    } else if (avgImprovement >= 50) {
      log('✅ Good cache performance with room for optimization.', colors.yellow);
    } else {
      log('⚠️ Cache performance could be improved.', colors.yellow);
    }
    
    log('\n🔧 Next Steps:', colors.blue);
    log('• Monitor cache hit rates in production', colors.cyan);
    log('• Set up automated cache warm-up', colors.cyan);
    log('• Implement cache invalidation monitoring', colors.cyan);
    log('• Consider cache clustering for scale', colors.cyan);
    log('• Add cache metrics to dashboards', colors.cyan);
  }
  
  log('\n' + '='.repeat(80), colors.bold);
}

async function runBenchmark() {
  log('🧪 Redis Cache Performance Benchmark Suite', colors.bold);
  log('Comprehensive performance testing of caching implementation...', colors.blue);
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE}/health`);
    log('✅ Backend server is running', colors.green);
  } catch (error) {
    log('❌ Backend server is not running. Please start it first.', colors.red);
    process.exit(1);
  }
  
  // Run performance tests
  log('\n🔬 Running Performance Tests...', colors.bold);
  const performanceResults = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await measureEndpointPerformance(endpoint);
    performanceResults.push(result);
    await sleep(500); // Brief pause between tests
  }
  
  // Run load tests on a subset of endpoints
  log('\n🚀 Running Load Tests...', colors.bold);
  const loadTestEndpoints = TEST_ENDPOINTS.slice(0, 3); // Test first 3 endpoints
  const loadTestResults = [];
  
  for (const endpoint of loadTestEndpoints) {
    const result = await runLoadTest(endpoint, 5, 3000); // 5 concurrent for 3 seconds
    loadTestResults.push(result);
    await sleep(1000); // Pause between load tests
  }
  
  // Generate comprehensive report
  await generateBenchmarkReport(performanceResults, loadTestResults);
}

// Run benchmark
if (require.main === module) {
  runBenchmark().catch(error => {
    log(`\n❌ Benchmark error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { runBenchmark };
