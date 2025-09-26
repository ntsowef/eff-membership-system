/**
 * Geographic API Test Script
 * Tests the hierarchical geographic data flow for membership application
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test configuration
const config = {
  baseURL: BASE_URL,
  timeout: 10000
};

// Create axios instance
const api = axios.create(config);

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Logging utilities
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  header: (msg) => console.log(`\n🔍 ${msg}\n${'='.repeat(50)}`)
};

// Test helper function
async function testEndpoint(name, url, expectedStatus = 200) {
  testResults.total++;
  try {
    const response = await api.get(url);
    
    if (response.status === expectedStatus) {
      log.success(`${name}: ${response.status} - ${response.data?.data?.length || 0} items`);
      testResults.passed++;
      return { success: true, data: response.data };
    } else {
      log.error(`${name}: Expected ${expectedStatus}, got ${response.status}`);
      testResults.failed++;
      return { success: false, status: response.status };
    }
  } catch (error) {
    log.error(`${name}: ${error.message}`);
    testResults.failed++;
    return { success: false, error: error.message };
  }
}

// Test hierarchical data flow
async function testHierarchicalFlow() {
  log.header('Testing Hierarchical Geographic Data Flow');
  
  try {
    // Step 1: Get provinces
    log.info('Step 1: Fetching provinces...');
    const provincesResult = await testEndpoint('Provinces', '/geographic/provinces');
    
    if (!provincesResult.success || !provincesResult.data?.data?.length) {
      log.error('No provinces found - cannot continue hierarchical test');
      return;
    }
    
    const firstProvince = provincesResult.data.data[0];
    log.info(`Using province: ${firstProvince.province_name} (${firstProvince.province_code})`);
    
    // Step 2: Get districts for the province
    log.info('Step 2: Fetching districts for province...');
    const districtsResult = await testEndpoint(
      'Districts by Province', 
      `/geographic/districts?province=${firstProvince.province_code}`
    );
    
    if (!districtsResult.success || !districtsResult.data?.data?.length) {
      log.warning('No districts found for this province');
      return;
    }
    
    const firstDistrict = districtsResult.data.data[0];
    log.info(`Using district: ${firstDistrict.district_name} (${firstDistrict.district_code})`);
    
    // Step 3: Get municipalities for the district
    log.info('Step 3: Fetching municipalities for district...');
    const municipalitiesResult = await testEndpoint(
      'Municipalities by District', 
      `/geographic/municipalities?district=${firstDistrict.district_code}`
    );
    
    if (!municipalitiesResult.success || !municipalitiesResult.data?.data?.length) {
      log.warning('No municipalities found for this district');
      return;
    }
    
    const firstMunicipality = municipalitiesResult.data.data[0];
    log.info(`Using municipality: ${firstMunicipality.municipality_name} (${firstMunicipality.municipality_code})`);
    
    // Step 4: Get wards for the municipality
    log.info('Step 4: Fetching wards for municipality...');
    const wardsResult = await testEndpoint(
      'Wards by Municipality', 
      `/geographic/wards?municipality=${firstMunicipality.municipality_code}`
    );
    
    if (!wardsResult.success || !wardsResult.data?.data?.length) {
      log.warning('No wards found for this municipality');
      return;
    }
    
    const firstWard = wardsResult.data.data[0];
    log.info(`Using ward: Ward ${firstWard.ward_number} - ${firstWard.ward_name} (${firstWard.ward_code})`);
    
    // Step 5: Get voting districts for the ward
    log.info('Step 5: Fetching voting districts for ward...');
    const votingDistrictsResult = await testEndpoint(
      'Voting Districts by Ward', 
      `/geographic/voting-districts/by-ward/${firstWard.ward_code}`
    );
    
    if (!votingDistrictsResult.success) {
      log.warning('Could not fetch voting districts for this ward');
      return;
    }
    
    if (votingDistrictsResult.data?.data?.length === 0) {
      log.warning('No voting districts found for this ward');
    } else {
      const firstVotingDistrict = votingDistrictsResult.data.data[0];
      log.info(`Found voting district: VD ${firstVotingDistrict.voting_district_number} - ${firstVotingDistrict.voting_district_name}`);
    }
    
    log.success('Hierarchical flow test completed successfully!');
    
  } catch (error) {
    log.error(`Hierarchical flow test failed: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Geographic API Test Suite');
  console.log('============================\n');
  
  // Test basic endpoints
  log.header('Basic Endpoint Tests');
  await testEndpoint('Provinces List', '/geographic/provinces');
  await testEndpoint('Districts List', '/geographic/districts');
  await testEndpoint('Municipalities List', '/geographic/municipalities');
  await testEndpoint('Wards List', '/geographic/wards?limit=5');
  
  // Test hierarchical flow
  await testHierarchicalFlow();
  
  // Test summary
  log.header('Test Summary');
  log.info(`Total tests: ${testResults.total}`);
  log.success(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    log.error(`Failed: ${testResults.failed}`);
  }
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log.info(`Success rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    log.success('🎉 All tests passed! Geographic API is working correctly.');
  } else {
    log.warning('⚠️  Some tests failed. Please check the backend server and database.');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };
