/**
 * Performance Optimization Test Suite
 * Tests the optimized dashboard and expired-members endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function measureEndpointPerformance(endpoint, description) {
  console.log(`\n${colors.cyan}Testing: ${description}${colors.reset}`);
  console.log(`Endpoint: ${endpoint}`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 60000 // 60 second timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const performanceRating = duration < 1000 ? 'Excellent' : 
                             duration < 3000 ? 'Good' : 
                             duration < 10000 ? 'Acceptable' : 'Slow';
    
    const color = duration < 1000 ? colors.green : 
                  duration < 3000 ? colors.yellow : colors.red;
    
    console.log(`${color}✓ Response Time: ${duration}ms (${performanceRating})${colors.reset}`);
    console.log(`Status: ${response.status}`);
    console.log(`Data Size: ${JSON.stringify(response.data).length} bytes`);
    
    return {
      success: true,
      duration,
      status: response.status,
      dataSize: JSON.stringify(response.data).length,
      performanceRating
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`${colors.red}✗ Request Failed after ${duration}ms${colors.reset}`);
    console.log(`Error: ${error.message}`);
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

async function runPerformanceTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  PERFORMANCE OPTIMIZATION TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  const tests = [
    {
      endpoint: '/statistics/dashboard',
      description: 'Dashboard Statistics (Optimized)'
    },
    {
      endpoint: '/statistics/expired-members',
      description: 'Expired Members Statistics (Optimized)'
    },
    {
      endpoint: '/statistics/system',
      description: 'System Statistics'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await measureEndpointPerformance(test.endpoint, test.description);
    results.push({ ...test, ...result });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`${colors.green}Passed: ${successfulTests.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests.length}${colors.reset}\n`);
  
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    const maxDuration = Math.max(...successfulTests.map(r => r.duration));
    const minDuration = Math.min(...successfulTests.map(r => r.duration));
    
    console.log(`Performance Metrics:`);
    console.log(`  Average Response Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Fastest Response: ${minDuration}ms`);
    console.log(`  Slowest Response: ${maxDuration}ms\n`);
    
    const excellentCount = successfulTests.filter(r => r.performanceRating === 'Excellent').length;
    const goodCount = successfulTests.filter(r => r.performanceRating === 'Good').length;
    const acceptableCount = successfulTests.filter(r => r.performanceRating === 'Acceptable').length;
    const slowCount = successfulTests.filter(r => r.performanceRating === 'Slow').length;
    
    console.log(`Performance Ratings:`);
    console.log(`  ${colors.green}Excellent (<1s): ${excellentCount}${colors.reset}`);
    console.log(`  ${colors.yellow}Good (1-3s): ${goodCount}${colors.reset}`);
    console.log(`  Acceptable (3-10s): ${acceptableCount}`);
    console.log(`  ${colors.red}Slow (>10s): ${slowCount}${colors.reset}\n`);
  }
  
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the tests
runPerformanceTests().catch(console.error);

