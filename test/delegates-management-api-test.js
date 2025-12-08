/**
 * Delegates Management API Test Script
 * 
 * This script tests all the new Delegates Management endpoints
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:5000
 * 2. Valid authentication token
 * 3. Database populated with delegate data
 * 
 * Usage:
 * node test/delegates-management-api-test.js <AUTH_TOKEN>
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
const AUTH_TOKEN = process.argv[2];

// Test without auth first to verify routes are registered
const testWithoutAuth = !AUTH_TOKEN;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
    'Content-Type': 'application/json'
  }
});

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

async function testGetStatistics() {
  console.log('\n📊 Testing: GET /delegates-management/statistics');
  try {
    const response = await api.get('/delegates-management/statistics');

    if (response.status === 200) {
      const data = response.data;
      console.log('   Response:', JSON.stringify(data, null, 2));

      logTest('Get Statistics - Status 200', true);
      logTest('Get Statistics - Has total_delegates',
        data.hasOwnProperty('total_delegates'),
        `Total: ${data.total_delegates}`);
      logTest('Get Statistics - Has active_delegates',
        data.hasOwnProperty('active_delegates'),
        `Active: ${data.active_delegates}`);
      logTest('Get Statistics - Has assembly breakdown',
        data.hasOwnProperty('srpa_delegates') &&
        data.hasOwnProperty('ppa_delegates') &&
        data.hasOwnProperty('npa_delegates'),
        `SRPA: ${data.srpa_delegates}, PPA: ${data.ppa_delegates}, NPA: ${data.npa_delegates}`);

      return data;
    }
  } catch (error) {
    if (testWithoutAuth && error.response?.status === 401) {
      logTest('Get Statistics - Route Registered', true, 'Requires authentication (401)');
    } else {
      logTest('Get Statistics', false, error.response?.data?.message || error.message);
    }
  }
}

async function testGetAllDelegates() {
  console.log('\n👥 Testing: GET /delegates-management/delegates');
  try {
    const response = await api.get('/delegates-management/delegates', {
      params: { limit: 10 }
    });

    if (response.status === 200) {
      const data = response.data;
      console.log(`   Found ${data.length} delegates (limited to 10)`);

      if (data.length > 0) {
        console.log('   Sample delegate:', JSON.stringify(data[0], null, 2));

        logTest('Get All Delegates - Status 200', true);
        logTest('Get All Delegates - Returns array', Array.isArray(data));
        logTest('Get All Delegates - Has required fields',
          data[0].hasOwnProperty('delegate_id') &&
          data[0].hasOwnProperty('member_name') &&
          data[0].hasOwnProperty('assembly_code'),
          `Fields: delegate_id, member_name, assembly_code present`);
      } else {
        logTest('Get All Delegates - Status 200', true);
        logTest('Get All Delegates - No data', true, 'No delegates found in database');
      }

      return data;
    }
  } catch (error) {
    if (testWithoutAuth && error.response?.status === 401) {
      logTest('Get All Delegates - Route Registered', true, 'Requires authentication (401)');
    } else {
      logTest('Get All Delegates', false, error.response?.data?.message || error.message);
    }
  }
}

async function testGetDelegatesWithFilters() {
  console.log('\n🔍 Testing: GET /delegates-management/delegates (with filters)');
  try {
    // Test with assembly filter
    const response = await api.get('/delegates-management/delegates', {
      params: {
        assembly_code: 'SRPA',
        limit: 5
      }
    });

    if (response.status === 200) {
      const data = response.data;
      console.log(`   Found ${data.length} SRPA delegates`);

      logTest('Get Delegates with Filter - Status 200', true);
      logTest('Get Delegates with Filter - Filters work',
        data.length === 0 || data.every(d => d.assembly_code === 'SRPA'),
        `All results are SRPA delegates`);

      return data;
    }
  } catch (error) {
    if (testWithoutAuth && error.response?.status === 401) {
      logTest('Get Delegates with Filter - Route Registered', true, 'Requires authentication (401)');
    } else {
      logTest('Get Delegates with Filter', false, error.response?.data?.message || error.message);
    }
  }
}

async function testGetDelegateSummary() {
  console.log('\n📈 Testing: GET /delegates-management/summary');
  try {
    const response = await api.get('/delegates-management/summary');

    if (response.status === 200) {
      const data = response.data;
      console.log(`   Found ${data.length} summary records`);

      if (data.length > 0) {
        console.log('   Sample summary:', JSON.stringify(data[0], null, 2));

        logTest('Get Delegate Summary - Status 200', true);
        logTest('Get Delegate Summary - Returns array', Array.isArray(data));
        logTest('Get Delegate Summary - Has required fields',
          data[0].hasOwnProperty('province_name') &&
          data[0].hasOwnProperty('total_delegates'),
          `Fields: province_name, total_delegates present`);
      } else {
        logTest('Get Delegate Summary - Status 200', true);
        logTest('Get Delegate Summary - No data', true, 'No summary data available');
      }

      return data;
    }
  } catch (error) {
    if (testWithoutAuth && error.response?.status === 401) {
      logTest('Get Delegate Summary - Route Registered', true, 'Requires authentication (401)');
    } else {
      logTest('Get Delegate Summary', false, error.response?.data?.message || error.message);
    }
  }
}

async function testGetConferenceDelegates() {
  console.log('\n🎯 Testing: GET /delegates-management/conference/:assembly_code');

  const assemblies = ['SRPA', 'PPA', 'NPA'];

  for (const assembly of assemblies) {
    try {
      const response = await api.get(`/delegates-management/conference/${assembly}`);

      if (response.status === 200) {
        const data = response.data;
        console.log(`   ${assembly}: ${data.total_delegates} delegates`);

        logTest(`Get ${assembly} Conference Delegates - Status 200`, true);
        logTest(`Get ${assembly} Conference Delegates - Has structure`,
          data.hasOwnProperty('assembly_code') &&
          data.hasOwnProperty('total_delegates') &&
          Array.isArray(data.delegates),
          `Structure: assembly_code, total_delegates, delegates[]`);
      }
    } catch (error) {
      if (testWithoutAuth && error.response?.status === 401) {
        logTest(`Get ${assembly} Conference Delegates - Route Registered`, true, 'Requires authentication (401)');
      } else {
        logTest(`Get ${assembly} Conference Delegates`, false,
          error.response?.data?.message || error.message);
      }
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Delegates Management API Tests\n');
  console.log('=' .repeat(60));

  if (testWithoutAuth) {
    console.log('⚠️  Running without authentication - testing route registration only\n');
  }

  await testGetStatistics();
  await testGetAllDelegates();
  await testGetDelegatesWithFilters();
  await testGetDelegateSummary();
  await testGetConferenceDelegates();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${results.passed + results.failed}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }

  if (testWithoutAuth) {
    console.log('\n💡 To test with authentication:');
    console.log('   1. Login to get a token');
    console.log('   2. Run: node test/delegates-management-api-test.js <YOUR_TOKEN>');
  }

  console.log('\n' + '='.repeat(60));
}

runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});

