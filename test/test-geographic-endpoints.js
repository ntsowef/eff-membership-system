/**
 * Geographic Statistics Endpoints Test Suite
 * Tests the optimized geographic statistics endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1/members';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testEndpoint(endpoint, description, expectedFields = []) {
  console.log(`\n${colors.cyan}Testing: ${description}${colors.reset}`);
  console.log(`Endpoint: ${endpoint}`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 10000 // 10 second timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const color = duration < 1000 ? colors.green : 
                  duration < 3000 ? colors.yellow : colors.red;
    
    console.log(`${color}✓ Response Time: ${duration}ms${colors.reset}`);
    console.log(`Status: ${response.status}`);
    
    // Check if data exists (handle nested data.data structure)
    const dataArray = response.data?.data?.data || response.data?.data || [];
    if (dataArray && dataArray.length > 0) {
      console.log(`${colors.green}✓ Data Count: ${dataArray.length} records${colors.reset}`);

      // Show first record if available
      console.log(`${colors.magenta}Sample Record:${colors.reset}`);
      console.log(JSON.stringify(dataArray[0], null, 2));

      // Validate expected fields
      if (expectedFields.length > 0) {
        const firstRecord = dataArray[0];
        const missingFields = expectedFields.filter(field => !(field in firstRecord));

        if (missingFields.length === 0) {
          console.log(`${colors.green}✓ All expected fields present${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ Missing fields: ${missingFields.join(', ')}${colors.reset}`);
        }
      }

      // Show total member count across all records
      const totalMembers = dataArray.reduce((sum, record) => {
        return sum + parseInt(record.member_count || 0);
      }, 0);
      console.log(`${colors.cyan}Total Members: ${totalMembers.toLocaleString()}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ No data returned${colors.reset}`);
    }
    
    return {
      success: true,
      duration,
      status: response.status,
      recordCount: dataArray.length
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`${colors.red}✗ Request Failed after ${duration}ms${colors.reset}`);
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Response Status: ${error.response.status}`);
      console.log(`Response Data:`, error.response.data);
    }
    
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

async function runGeographicTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  GEOGRAPHIC STATISTICS ENDPOINTS TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  const tests = [
    {
      endpoint: '/stats/provinces',
      description: 'All Provinces Statistics',
      expectedFields: ['province_code', 'province_name', 'member_count']
    },
    {
      endpoint: '/stats/provinces?membership_status=good_standing',
      description: 'Provinces Statistics (Good Standing Only)',
      expectedFields: ['province_code', 'province_name', 'member_count']
    },
    {
      endpoint: '/stats/districts?province=KZN',
      description: 'Districts in KwaZulu-Natal (KZN)',
      expectedFields: ['district_code', 'district_name', 'member_count']
    },
    {
      endpoint: '/stats/districts?province=GT',
      description: 'Districts in Gauteng (GT)',
      expectedFields: ['district_code', 'district_name', 'member_count']
    },
    {
      endpoint: '/stats/districts?province=WC',
      description: 'Districts in Western Cape (WC)',
      expectedFields: ['district_code', 'district_name', 'member_count']
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.description, test.expectedFields);
    results.push({ ...test, ...result });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
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
    const totalRecords = successfulTests.reduce((sum, r) => sum + r.recordCount, 0);
    
    console.log(`Performance Metrics:`);
    console.log(`  Average Response Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Fastest Response: ${minDuration}ms`);
    console.log(`  Slowest Response: ${maxDuration}ms`);
    console.log(`  Total Records Retrieved: ${totalRecords}\n`);
  }
  
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the tests
runGeographicTests().catch(console.error);

