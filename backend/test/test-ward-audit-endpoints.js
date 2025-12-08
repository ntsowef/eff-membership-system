/**
 * Ward Audit API Endpoints Test Script
 * Tests both Ward Audit and Ward Membership Audit endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Test data
let testWardCode = '';
let testMunicipalityCode = '';

// Helper function to log test results
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
  testResults.tests.push({ name: testName, passed, details });
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, params = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) config.data = data;
    if (params) config.params = params;

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// =====================================================
// Authentication
// =====================================================

async function authenticate() {
  console.log('\n🔐 AUTHENTICATING...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });

    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    console.log(`   User: ${response.data.data.user.name}`);
    console.log(`   Role: ${response.data.data.user.role_name}\n`);
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

// =====================================================
// Ward Membership Audit Tests
// =====================================================

async function testWardMembershipAudit() {
  console.log('\n📊 TESTING WARD MEMBERSHIP AUDIT ENDPOINTS\n');
  console.log('='.repeat(60));

  // Test 1: Get wards list
  console.log('\n1️⃣  Testing GET /audit/ward-membership/wards');
  const wardsResult = await makeRequest('GET', '/audit/ward-membership/wards', null, {
    page: 1,
    limit: 5
  });
  
  if (wardsResult.success && wardsResult.data.data?.wards?.length > 0) {
    testWardCode = wardsResult.data.data.wards[0].ward_code;
    testMunicipalityCode = wardsResult.data.data.wards[0].municipality_code;
    logTest('Get wards list', true, 
      `Found ${wardsResult.data.data.wards.length} wards, Total: ${wardsResult.data.data.pagination.total}`);
    console.log(`   Test Ward: ${wardsResult.data.data.wards[0].ward_name} (${testWardCode})`);
    console.log(`   Municipality: ${wardsResult.data.data.wards[0].municipality_name} (${testMunicipalityCode})`);
  } else {
    logTest('Get wards list', false, wardsResult.error?.message || 'No wards found');
  }

  // Test 2: Get wards with filters
  console.log('\n2️⃣  Testing GET /audit/ward-membership/wards (with filters)');
  const filteredWardsResult = await makeRequest('GET', '/audit/ward-membership/wards', null, {
    page: 1,
    limit: 5,
    standing: 'Good Standing',
    sort_by: 'active_members',
    sort_order: 'desc'
  });
  
  logTest('Get wards with filters', filteredWardsResult.success,
    filteredWardsResult.success ? 
      `Found ${filteredWardsResult.data.data.wards.length} wards in Good Standing` :
      filteredWardsResult.error?.message);

  // Test 3: Get municipalities list
  console.log('\n3️⃣  Testing GET /audit/ward-membership/municipalities');
  const municipalitiesResult = await makeRequest('GET', '/audit/ward-membership/municipalities', null, {
    page: 1,
    limit: 5
  });
  
  logTest('Get municipalities list', municipalitiesResult.success,
    municipalitiesResult.success ?
      `Found ${municipalitiesResult.data.data.municipalities.length} municipalities` :
      municipalitiesResult.error?.message);

  // Test 4: Get ward details
  if (testWardCode) {
    console.log(`\n4️⃣  Testing GET /audit/ward-membership/ward/${testWardCode}/details`);
    const wardDetailsResult = await makeRequest('GET', `/audit/ward-membership/ward/${testWardCode}/details`);

    if (wardDetailsResult.success) {
      logTest('Get ward details', true,
        `Ward: ${wardDetailsResult.data.data.ward_info.ward_name}, Active Members: ${wardDetailsResult.data.data.ward_info.active_members}`);
    } else {
      logTest('Get ward details', false,
        `Error: ${wardDetailsResult.error?.message || JSON.stringify(wardDetailsResult.error)}`);
      console.log(`   Status: ${wardDetailsResult.status}`);
    }
  }

  // Test 5: Get municipality details
  if (testMunicipalityCode) {
    console.log(`\n5️⃣  Testing GET /audit/ward-membership/municipality/${testMunicipalityCode}/details`);
    const municipalityDetailsResult = await makeRequest('GET', `/audit/ward-membership/municipality/${testMunicipalityCode}/details`);

    if (municipalityDetailsResult.success) {
      logTest('Get municipality details', true,
        `Municipality: ${municipalityDetailsResult.data.data.municipality_info.municipality_name}`);
    } else {
      logTest('Get municipality details', false,
        `Error: ${municipalityDetailsResult.error?.message || JSON.stringify(municipalityDetailsResult.error)}`);
      console.log(`   Status: ${municipalityDetailsResult.status}`);
    }
  }

  // Test 6: Export ward audit (PDF)
  console.log('\n6️⃣  Testing GET /audit/ward-membership/export (PDF)');
  const exportPdfResult = await makeRequest('GET', '/audit/ward-membership/export', null, {
    format: 'pdf',
    type: 'ward',
    limit: 10
  });
  
  logTest('Export ward audit (PDF)', exportPdfResult.success,
    exportPdfResult.success ?
      'PDF export successful' :
      exportPdfResult.error?.message);

  // Test 7: Export ward audit (Excel - expected to be not implemented)
  console.log('\n7️⃣  Testing GET /audit/ward-membership/export (Excel)');
  const exportExcelResult = await makeRequest('GET', '/audit/ward-membership/export', null, {
    format: 'excel',
    type: 'ward',
    limit: 10
  });
  
  logTest('Export ward audit (Excel)', exportExcelResult.status === 501,
    exportExcelResult.status === 501 ?
      'Correctly returns 501 Not Implemented' :
      'Unexpected response');
}

// =====================================================
// Ward Audit (Compliance) Tests
// =====================================================

async function testWardAuditCompliance() {
  console.log('\n\n🔍 TESTING WARD AUDIT COMPLIANCE ENDPOINTS\n');
  console.log('='.repeat(60));

  // Test 1: Get wards by municipality
  if (testMunicipalityCode) {
    console.log(`\n1️⃣  Testing GET /ward-audit/wards?municipality_code=${testMunicipalityCode}`);
    const wardsResult = await makeRequest('GET', '/ward-audit/wards', null, {
      municipality_code: testMunicipalityCode
    });
    
    logTest('Get wards by municipality', wardsResult.success,
      wardsResult.success ?
        `Found ${wardsResult.data.data.length} wards` :
        wardsResult.error?.message);
  }

  // Test 2: Get ward compliance summary
  if (testWardCode) {
    console.log(`\n2️⃣  Testing GET /ward-audit/ward/${testWardCode}/compliance`);
    const complianceResult = await makeRequest('GET', `/ward-audit/ward/${testWardCode}/compliance`);
    
    if (complianceResult.success) {
      const data = complianceResult.data.data;
      logTest('Get ward compliance summary', true,
        `Criterion 1: ${data.criterion_1_compliant ? '✅' : '❌'}, Total Members: ${data.total_members}`);
      console.log(`   Criterion 1 Compliant: ${data.criterion_1_compliant}`);
      console.log(`   Total Members: ${data.total_members}`);
      console.log(`   Voting Districts: ${data.voting_districts_count}`);
    } else {
      logTest('Get ward compliance summary', false, complianceResult.error?.message);
    }
  }

  // Test 3: Get voting districts compliance
  if (testWardCode) {
    console.log(`\n3️⃣  Testing GET /ward-audit/ward/${testWardCode}/voting-districts`);
    const vdResult = await makeRequest('GET', `/ward-audit/ward/${testWardCode}/voting-districts`);
    
    logTest('Get voting districts compliance', vdResult.success,
      vdResult.success ?
        `Found ${vdResult.data.data.length} voting districts` :
        vdResult.error?.message);
  }

  // Test 4: Get ward compliance details (all 5 criteria)
  if (testWardCode) {
    console.log(`\n4️⃣  Testing GET /ward-audit/ward/${testWardCode}/compliance/details`);
    const detailsResult = await makeRequest('GET', `/ward-audit/ward/${testWardCode}/compliance/details`);
    
    if (detailsResult.success) {
      const data = detailsResult.data.data;
      logTest('Get ward compliance details', true, 'All 5 criteria checked');
      console.log(`   Criterion 1 (200+ members): ${data.criterion_1_compliant ? '✅' : '❌'}`);
      console.log(`   Criterion 2 (Meeting records): ${data.criterion_2_compliant ? '✅' : '❌'}`);
      console.log(`   Criterion 3 (Leadership): ${data.criterion_3_compliant ? '✅' : '❌'}`);
      console.log(`   Criterion 4 (Gender balance): ${data.criterion_4_compliant ? '✅' : '❌'}`);
      console.log(`   Criterion 5 (Youth representation): ${data.criterion_5_compliant ? '✅' : '❌'}`);
    } else {
      logTest('Get ward compliance details', false, detailsResult.error?.message);
    }
  }

  // Test 5: Get ward meetings
  if (testWardCode) {
    console.log(`\n5️⃣  Testing GET /ward-audit/ward/${testWardCode}/meetings`);
    const meetingsResult = await makeRequest('GET', `/ward-audit/ward/${testWardCode}/meetings`);
    
    logTest('Get ward meetings', meetingsResult.success,
      meetingsResult.success ?
        `Found ${meetingsResult.data.data.length} meeting records` :
        meetingsResult.error?.message);
  }
}

// =====================================================
// Main Test Runner
// =====================================================

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 WARD AUDIT API ENDPOINTS TEST SUITE');
  console.log('='.repeat(60));

  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('\n❌ Cannot proceed without authentication\n');
    return;
  }

  // Run all tests
  await testWardMembershipAudit();
  await testWardAuditCompliance();

  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
}

// Run the tests
runTests().catch(console.error);

