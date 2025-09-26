#!/usr/bin/env node

/**
 * GEOMAPS Backend API Testing Script
 * 
 * This script tests all major API endpoints to ensure they're working correctly.
 * Run this after the server is started to verify functionality.
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 10000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.magenta}${msg}${colors.reset}`)
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GEOMAPS-API-Tester/1.0',
        ...options.headers
      },
      timeout: config.timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test helper
async function testEndpoint(name, url, expectedStatus = 200, options = {}) {
  try {
    log.test(`Testing ${name}...`);
    const response = await makeRequest(url, options);
    
    if (response.status === expectedStatus) {
      log.success(`${name} - Status: ${response.status}`);
      
      if (response.data && response.data.success !== undefined) {
        if (response.data.success) {
          log.info(`  Response: ${response.data.message || 'Success'}`);
        } else {
          log.warning(`  API returned success=false: ${response.data.error?.message || 'Unknown error'}`);
        }
      }
      
      return { success: true, response };
    } else {
      log.error(`${name} - Expected ${expectedStatus}, got ${response.status}`);
      if (response.data && response.data.error) {
        log.error(`  Error: ${response.data.error.message}`);
      }
      return { success: false, response };
    }
  } catch (error) {
    log.error(`${name} - Request failed: ${error.message}`);
    return { success: false, error };
  }
}

// Authentication helper
async function authenticate() {
  log.header('🔐 Authentication Tests');
  
  // Test login with demo credentials
  const loginResult = await testEndpoint(
    'Login',
    `${config.baseUrl}/auth/login`,
    200,
    {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'admin123'
      }
    }
  );
  
  if (loginResult.success && loginResult.response.data.data?.token) {
    const token = loginResult.response.data.data.token;
    log.success('Authentication successful, token obtained');
    
    // Test token validation
    await testEndpoint(
      'Token Validation',
      `${config.baseUrl}/auth/validate`,
      200,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return token;
  } else {
    log.warning('Authentication failed, continuing with unauthenticated tests');
    return null;
  }
}

// Test all endpoints
async function runTests() {
  log.header('🚀 GEOMAPS Backend API Tests');
  log.info(`Testing API at: ${config.baseUrl}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Helper to track results
  const trackResult = (result) => {
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  };
  
  // Authentication tests
  const token = await authenticate();
  
  // Health check tests
  log.header('🏥 Health Check Tests');
  trackResult(await testEndpoint('Basic Health', `${config.baseUrl}/health`));
  trackResult(await testEndpoint('Detailed Health', `${config.baseUrl}/health/detailed`));
  trackResult(await testEndpoint('Database Health', `${config.baseUrl}/health/database`));
  trackResult(await testEndpoint('Readiness Probe', `${config.baseUrl}/health/ready`));
  trackResult(await testEndpoint('Liveness Probe', `${config.baseUrl}/health/live`));
  
  // Geographic data tests
  log.header('🗺️ Geographic Data Tests');
  trackResult(await testEndpoint('Provinces List', `${config.baseUrl}/geographic/provinces`));
  trackResult(await testEndpoint('Districts List', `${config.baseUrl}/geographic/districts`));
  trackResult(await testEndpoint('Municipalities List', `${config.baseUrl}/geographic/municipalities`));
  trackResult(await testEndpoint('Wards List', `${config.baseUrl}/geographic/wards?limit=5`));
  trackResult(await testEndpoint('Geographic Summary', `${config.baseUrl}/geographic/summary`));
  
  // Test specific geographic items (if they exist)
  trackResult(await testEndpoint('Specific Province', `${config.baseUrl}/geographic/provinces/GP`, 200));
  
  // Lookup data tests
  log.header('📋 Lookup Data Tests');
  trackResult(await testEndpoint('All Lookups', `${config.baseUrl}/lookups`));
  trackResult(await testEndpoint('Genders', `${config.baseUrl}/lookups/genders`));
  trackResult(await testEndpoint('Races', `${config.baseUrl}/lookups/races`));
  trackResult(await testEndpoint('Languages', `${config.baseUrl}/lookups/languages`));
  trackResult(await testEndpoint('Occupations', `${config.baseUrl}/lookups/occupations`));
  trackResult(await testEndpoint('Membership Statuses', `${config.baseUrl}/lookups/membership-statuses`));
  
  // Members tests (basic read operations)
  log.header('👥 Members Tests');
  trackResult(await testEndpoint('Members List', `${config.baseUrl}/members?limit=5`));
  trackResult(await testEndpoint('Member Statistics', `${config.baseUrl}/members/statistics/summary`));
  
  // Memberships tests (basic read operations)
  log.header('📝 Memberships Tests');
  trackResult(await testEndpoint('Memberships List', `${config.baseUrl}/memberships?limit=5`));
  trackResult(await testEndpoint('Membership Statistics', `${config.baseUrl}/memberships/statistics/summary`));
  
  // Statistics tests
  log.header('📊 Statistics Tests');
  trackResult(await testEndpoint('System Statistics', `${config.baseUrl}/statistics/system`));
  trackResult(await testEndpoint('Dashboard Data', `${config.baseUrl}/statistics/dashboard`));
  trackResult(await testEndpoint('Demographics', `${config.baseUrl}/statistics/demographics`));
  trackResult(await testEndpoint('Membership Trends', `${config.baseUrl}/statistics/membership-trends`));
  
  // Error handling tests
  log.header('🚫 Error Handling Tests');
  trackResult(await testEndpoint('404 Not Found', `${config.baseUrl}/nonexistent`, 404));
  trackResult(await testEndpoint('Invalid Province', `${config.baseUrl}/geographic/provinces/INVALID`, 404));
  
  // Results summary
  log.header('📋 Test Results Summary');
  log.info(`Total tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}`);
  } else {
    log.success('All tests passed! 🎉');
  }
  
  const successRate = Math.round((results.passed / results.total) * 100);
  log.info(`Success rate: ${successRate}%`);
  
  if (successRate >= 90) {
    log.success('API is functioning well!');
  } else if (successRate >= 70) {
    log.warning('API has some issues but is mostly functional');
  } else {
    log.error('API has significant issues that need attention');
  }
  
  return results;
}

// Performance test
async function performanceTest() {
  log.header('⚡ Performance Test');
  
  const testUrl = `${config.baseUrl}/health`;
  const iterations = 10;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await makeRequest(testUrl);
      const duration = Date.now() - start;
      times.push(duration);
    } catch (error) {
      log.warning(`Performance test iteration ${i + 1} failed: ${error.message}`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    log.info(`Average response time: ${avgTime}ms`);
    log.info(`Min response time: ${minTime}ms`);
    log.info(`Max response time: ${maxTime}ms`);
    
    if (avgTime < 100) {
      log.success('Excellent response times!');
    } else if (avgTime < 500) {
      log.info('Good response times');
    } else {
      log.warning('Response times could be improved');
    }
  }
}

// Main function
async function main() {
  try {
    const results = await runTests();
    await performanceTest();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log.error('Test suite failed: ' + error.message);
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  main();
}

module.exports = { runTests, performanceTest };
