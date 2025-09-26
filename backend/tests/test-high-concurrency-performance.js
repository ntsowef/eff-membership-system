const fs = require('fs');
const { performance } = require('perf_hooks');

// High Concurrency Performance Test for 20,000+ Users
async function testHighConcurrencyPerformance() {
  console.log('🚀 TESTING HIGH CONCURRENCY PERFORMANCE (20,000+ USERS)\n');
  console.log('='.repeat(80));

  const testConfig = {
    baseUrl: 'http://localhost:5000/api/v1',
    concurrentUsers: 20000,
    testDuration: 300, // 5 minutes
    rampUpTime: 60, // 1 minute to reach full load
    testScenarios: [
      { name: 'Member Lookup by ID', endpoint: '/optimized-cards/member/', weight: 40 },
      { name: 'Card Generation', endpoint: '/optimized-cards/generate-data/', weight: 30 },
      { name: 'Card Verification', endpoint: '/optimized-cards/verify', weight: 20 },
      { name: 'Cache Stats', endpoint: '/optimized-cards/cache-stats', weight: 10 }
    ],
    testIdNumbers: [
      '9904015641081', '9710220470087', '9707221156087',
      '8901015641081', '8710220470087', '8707221156087',
      '7901015641081', '7710220470087', '7707221156087'
    ]
  };

  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: [],
    errorTypes: {},
    throughput: 0,
    concurrencyAchieved: 0,
    cacheHitRate: 0,
    systemMetrics: {
      startTime: Date.now(),
      endTime: null,
      peakMemoryUsage: 0,
      averageCpuUsage: 0
    }
  };

  try {
    console.log('📋 TEST CONFIGURATION:');
    console.log(`   Target Concurrent Users: ${testConfig.concurrentUsers.toLocaleString()}`);
    console.log(`   Test Duration: ${testConfig.testDuration} seconds`);
    console.log(`   Ramp-up Time: ${testConfig.rampUpTime} seconds`);
    console.log(`   Base URL: ${testConfig.baseUrl}`);
    console.log('');

    // Step 1: Warm up the system
    console.log('🔥 STEP 1: Warming up the system...');
    await warmUpSystem(testConfig);
    console.log('✅ System warm-up completed\n');

    // Step 2: Start performance monitoring
    console.log('📊 STEP 2: Starting performance monitoring...');
    const monitoringInterval = startPerformanceMonitoring(results);
    console.log('✅ Performance monitoring started\n');

    // Step 3: Execute high concurrency test
    console.log('⚡ STEP 3: Executing high concurrency test...');
    await executeHighConcurrencyTest(testConfig, results);
    console.log('✅ High concurrency test completed\n');

    // Step 4: Stop monitoring and collect final metrics
    clearInterval(monitoringInterval);
    results.systemMetrics.endTime = Date.now();
    
    // Step 5: Analyze results
    console.log('📈 STEP 4: Analyzing performance results...');
    const analysis = analyzeResults(results, testConfig);
    
    // Step 6: Generate comprehensive report
    console.log('📋 STEP 5: Generating performance report...');
    generatePerformanceReport(analysis, testConfig, results);

  } catch (error) {
    console.error('❌ High concurrency test failed:', error);
    throw error;
  }
}

// Warm up the system with cache preloading
async function warmUpSystem(config) {
  console.log('   Warming up cache...');
  
  try {
    // Warm up member cache
    const warmUpResponse = await fetch(`${config.baseUrl}/optimized-cards/warm-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_limit: 5000 })
    });
    
    if (warmUpResponse.ok) {
      console.log('   ✅ Cache warmed up with 5000 members');
    }
  } catch (error) {
    console.log('   ⚠️  Cache warm-up failed, continuing with test');
  }

  // Pre-load test data
  console.log('   Pre-loading test data...');
  const preloadPromises = config.testIdNumbers.slice(0, 3).map(async (idNumber) => {
    try {
      await fetch(`${config.baseUrl}/optimized-cards/member/${idNumber}`);
    } catch (error) {
      // Ignore errors during warm-up
    }
  });
  
  await Promise.all(preloadPromises);
  console.log('   ✅ Test data pre-loaded');
}

// Start performance monitoring
function startPerformanceMonitoring(results) {
  return setInterval(() => {
    const memUsage = process.memoryUsage();
    results.systemMetrics.peakMemoryUsage = Math.max(
      results.systemMetrics.peakMemoryUsage,
      memUsage.heapUsed
    );
  }, 1000);
}

// Execute the main high concurrency test
async function executeHighConcurrencyTest(config, results) {
  const startTime = performance.now();
  const testPromises = [];
  
  // Calculate requests per user per second
  const requestsPerUserPerSecond = 0.5; // Each user makes a request every 2 seconds
  const totalRequestsExpected = config.concurrentUsers * requestsPerUserPerSecond * config.testDuration;
  
  console.log(`   Expected total requests: ${totalRequestsExpected.toLocaleString()}`);
  console.log(`   Ramping up to ${config.concurrentUsers.toLocaleString()} concurrent users...`);

  // Ramp up users gradually
  const usersPerSecond = config.concurrentUsers / config.rampUpTime;
  
  for (let second = 0; second < config.rampUpTime; second++) {
    const usersThisSecond = Math.min(usersPerSecond, config.concurrentUsers - (second * usersPerSecond));
    
    setTimeout(() => {
      for (let user = 0; user < usersThisSecond; user++) {
        const userPromise = simulateUser(config, results, config.testDuration - second);
        testPromises.push(userPromise);
      }
    }, second * 1000);
  }

  // Wait for all users to complete
  console.log('   Waiting for all users to complete...');
  await Promise.all(testPromises);
  
  const endTime = performance.now();
  const totalTestTime = (endTime - startTime) / 1000;
  
  results.throughput = results.totalRequests / totalTestTime;
  results.concurrencyAchieved = testPromises.length;
  
  console.log(`   ✅ Test completed in ${totalTestTime.toFixed(2)} seconds`);
  console.log(`   📊 Achieved concurrency: ${results.concurrencyAchieved.toLocaleString()} users`);
}

// Simulate a single user's behavior
async function simulateUser(config, results, duration) {
  const userStartTime = Date.now();
  const userEndTime = userStartTime + (duration * 1000);
  
  while (Date.now() < userEndTime) {
    try {
      // Select random scenario based on weights
      const scenario = selectRandomScenario(config.testScenarios);
      const requestStartTime = performance.now();
      
      let response;
      
      if (scenario.name === 'Member Lookup by ID') {
        const randomId = config.testIdNumbers[Math.floor(Math.random() * config.testIdNumbers.length)];
        response = await fetch(`${config.baseUrl}${scenario.endpoint}${randomId}`, {
          timeout: 30000 // 30 second timeout
        });
      } else if (scenario.name === 'Card Generation') {
        // Use member ID instead of ID number for card generation
        const memberId = '186328'; // Use a known member ID
        response = await fetch(`${config.baseUrl}${scenario.endpoint}${memberId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'standard',
            issued_by: 'performance_test'
          }),
          timeout: 30000
        });
      } else if (scenario.name === 'Card Verification') {
        response = await fetch(`${config.baseUrl}${scenario.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_data: JSON.stringify({
              member_id: '186328',
              membership_number: 'MEM186328',
              expiry_date: '2026-09-04T04:11:00.000Z'
            })
          }),
          timeout: 30000
        });
      } else {
        response = await fetch(`${config.baseUrl}${scenario.endpoint}`, {
          timeout: 30000
        });
      }
      
      const requestEndTime = performance.now();
      const responseTime = requestEndTime - requestStartTime;
      
      // Record metrics
      results.totalRequests++;
      results.responseTimes.push(responseTime);
      results.minResponseTime = Math.min(results.minResponseTime, responseTime);
      results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
      
      if (response.ok) {
        results.successfulRequests++;
        
        // Check for cache hits
        const cacheHeader = response.headers.get('X-Cache');
        if (cacheHeader === 'HIT') {
          results.cacheHitRate++;
        }
      } else {
        results.failedRequests++;
        const errorType = `HTTP_${response.status}`;
        results.errorTypes[errorType] = (results.errorTypes[errorType] || 0) + 1;
      }
      
    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
      const errorType = error.name || 'UNKNOWN_ERROR';
      results.errorTypes[errorType] = (results.errorTypes[errorType] || 0) + 1;
    }
    
    // Wait before next request (simulate realistic user behavior)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000)); // 2-3 seconds
  }
}

// Select random scenario based on weights
function selectRandomScenario(scenarios) {
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario;
    }
  }
  
  return scenarios[0]; // Fallback
}

// Analyze test results
function analyzeResults(results, config) {
  const totalTime = (results.systemMetrics.endTime - results.systemMetrics.startTime) / 1000;
  
  results.averageResponseTime = results.responseTimes.length > 0 
    ? results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length 
    : 0;
  
  results.cacheHitRate = results.successfulRequests > 0 
    ? (results.cacheHitRate / results.successfulRequests) * 100 
    : 0;

  // Calculate percentiles
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

  return {
    successRate: (results.successfulRequests / results.totalRequests) * 100,
    errorRate: (results.failedRequests / results.totalRequests) * 100,
    averageResponseTime: results.averageResponseTime,
    responseTimePercentiles: { p50, p95, p99 },
    throughput: results.throughput,
    concurrencyAchieved: results.concurrencyAchieved,
    cacheHitRate: results.cacheHitRate,
    testDuration: totalTime,
    peakMemoryUsageMB: results.systemMetrics.peakMemoryUsage / 1024 / 1024
  };
}

// Generate comprehensive performance report
function generatePerformanceReport(analysis, config, results) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 HIGH CONCURRENCY PERFORMANCE TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n📊 OVERALL PERFORMANCE:');
  console.log(`   Target Concurrent Users: ${config.concurrentUsers.toLocaleString()}`);
  console.log(`   Achieved Concurrency: ${analysis.concurrencyAchieved.toLocaleString()}`);
  console.log(`   Total Requests: ${results.totalRequests.toLocaleString()}`);
  console.log(`   Success Rate: ${analysis.successRate.toFixed(2)}%`);
  console.log(`   Error Rate: ${analysis.errorRate.toFixed(2)}%`);
  console.log(`   Throughput: ${analysis.throughput.toFixed(2)} requests/second`);
  
  console.log('\n⏱️  RESPONSE TIME ANALYSIS:');
  console.log(`   Average Response Time: ${analysis.averageResponseTime.toFixed(2)}ms`);
  console.log(`   Min Response Time: ${results.minResponseTime.toFixed(2)}ms`);
  console.log(`   Max Response Time: ${results.maxResponseTime.toFixed(2)}ms`);
  console.log(`   50th Percentile (P50): ${analysis.responseTimePercentiles.p50.toFixed(2)}ms`);
  console.log(`   95th Percentile (P95): ${analysis.responseTimePercentiles.p95.toFixed(2)}ms`);
  console.log(`   99th Percentile (P99): ${analysis.responseTimePercentiles.p99.toFixed(2)}ms`);
  
  console.log('\n🎯 PERFORMANCE TARGETS:');
  const subSecondTarget = analysis.averageResponseTime < 1000;
  const throughputTarget = analysis.throughput > 1000;
  const successRateTarget = analysis.successRate > 99;
  const concurrencyTarget = analysis.concurrencyAchieved >= config.concurrentUsers * 0.8;
  
  console.log(`   ✅ Sub-second Response Time: ${subSecondTarget ? 'PASSED' : 'FAILED'} (${analysis.averageResponseTime.toFixed(2)}ms)`);
  console.log(`   ✅ High Throughput (>1000 req/s): ${throughputTarget ? 'PASSED' : 'FAILED'} (${analysis.throughput.toFixed(2)} req/s)`);
  console.log(`   ✅ High Success Rate (>99%): ${successRateTarget ? 'PASSED' : 'FAILED'} (${analysis.successRate.toFixed(2)}%)`);
  console.log(`   ✅ Concurrency Target (80%): ${concurrencyTarget ? 'PASSED' : 'FAILED'} (${((analysis.concurrencyAchieved/config.concurrentUsers)*100).toFixed(1)}%)`);
  
  console.log('\n💾 CACHING PERFORMANCE:');
  console.log(`   Cache Hit Rate: ${analysis.cacheHitRate.toFixed(2)}%`);
  console.log(`   Cache Effectiveness: ${analysis.cacheHitRate > 70 ? 'EXCELLENT' : analysis.cacheHitRate > 50 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
  
  console.log('\n🖥️  SYSTEM RESOURCES:');
  console.log(`   Peak Memory Usage: ${analysis.peakMemoryUsageMB.toFixed(2)}MB`);
  console.log(`   Test Duration: ${analysis.testDuration.toFixed(2)} seconds`);
  
  if (Object.keys(results.errorTypes).length > 0) {
    console.log('\n❌ ERROR BREAKDOWN:');
    Object.entries(results.errorTypes).forEach(([errorType, count]) => {
      console.log(`   ${errorType}: ${count} occurrences`);
    });
  }
  
  console.log('\n🎊 PERFORMANCE ASSESSMENT:');
  const overallScore = [subSecondTarget, throughputTarget, successRateTarget, concurrencyTarget]
    .filter(Boolean).length;
  
  if (overallScore === 4) {
    console.log('   🏆 EXCELLENT: System handles 20,000+ concurrent users perfectly!');
  } else if (overallScore === 3) {
    console.log('   ✅ GOOD: System performs well under high load with minor issues');
  } else if (overallScore === 2) {
    console.log('   ⚠️  ACCEPTABLE: System handles load but needs optimization');
  } else {
    console.log('   ❌ NEEDS IMPROVEMENT: System requires significant optimization');
  }
  
  console.log('\n📈 RECOMMENDATIONS:');
  if (!subSecondTarget) {
    console.log('   • Optimize database queries and add more indexes');
    console.log('   • Increase cache TTL and improve cache hit rates');
  }
  if (!throughputTarget) {
    console.log('   • Consider horizontal scaling with load balancers');
    console.log('   • Optimize application code and reduce blocking operations');
  }
  if (!successRateTarget) {
    console.log('   • Investigate error causes and improve error handling');
    console.log('   • Increase timeout values and retry mechanisms');
  }
  if (analysis.cacheHitRate < 70) {
    console.log('   • Improve caching strategy and cache key design');
    console.log('   • Increase cache memory allocation');
  }
  
  console.log('\n🎯 PRODUCTION READINESS:');
  if (overallScore >= 3) {
    console.log('✅ SYSTEM IS READY FOR 20,000+ CONCURRENT USERS!');
  } else {
    console.log('⚠️  SYSTEM NEEDS OPTIMIZATION BEFORE HANDLING 20,000+ USERS');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the high concurrency performance test
testHighConcurrencyPerformance().catch(console.error);
