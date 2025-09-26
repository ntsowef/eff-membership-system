/**
 * Complete Geographic Flow Test
 * Tests the entire hierarchical geographic data flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
});

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
    
    if (response.status === expectedStatus && response.data?.success) {
      const dataLength = response.data?.data?.length || 0;
      log.success(`${name}: ${response.status} - ${dataLength} items`);
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

// Test complete hierarchical flow
async function testCompleteFlow() {
  log.header('Testing Complete Geographic Hierarchical Flow');
  
  try {
    // Step 1: Get provinces
    log.info('Step 1: Fetching provinces...');
    const provincesResult = await testEndpoint('Provinces', '/geographic/provinces');
    
    if (!provincesResult.success || !provincesResult.data?.data?.length) {
      log.error('No provinces found - cannot continue test');
      return false;
    }
    
    // Test with Gauteng province (GP)
    const gautengProvince = provincesResult.data.data.find(p => p.province_code === 'GP');
    if (!gautengProvince) {
      log.error('Gauteng province not found');
      return false;
    }
    
    log.info(`Using province: ${gautengProvince.province_name} (${gautengProvince.province_code})`);
    
    // Step 2: Get districts for Gauteng
    log.info('Step 2: Fetching districts for Gauteng...');
    const districtsResult = await testEndpoint(
      'Districts by Province', 
      `/geographic/districts?province=${gautengProvince.province_code}`
    );
    
    if (!districtsResult.success || !districtsResult.data?.data?.length) {
      log.warning('No districts found for Gauteng');
      return false;
    }
    
    // Test with Johannesburg district (JHB)
    const jhbDistrict = districtsResult.data.data.find(d => d.district_code === 'JHB');
    if (!jhbDistrict) {
      log.error('Johannesburg district not found');
      return false;
    }
    
    log.info(`Using district: ${jhbDistrict.district_name} (${jhbDistrict.district_code})`);
    
    // Step 3: Get municipalities for Johannesburg
    log.info('Step 3: Fetching municipalities for Johannesburg...');
    const municipalitiesResult = await testEndpoint(
      'Municipalities by District', 
      `/geographic/municipalities?district=${jhbDistrict.district_code}`
    );
    
    if (!municipalitiesResult.success || !municipalitiesResult.data?.data?.length) {
      log.warning('No municipalities found for Johannesburg');
      return false;
    }
    
    const jhbMunicipality = municipalitiesResult.data.data[0];
    log.info(`Using municipality: ${jhbMunicipality.municipality_name} (${jhbMunicipality.municipality_code})`);
    
    // Step 4: Get wards for the municipality
    log.info('Step 4: Fetching wards for municipality...');
    const wardsResult = await testEndpoint(
      'Wards by Municipality', 
      `/geographic/wards?municipality=${jhbMunicipality.municipality_code}&limit=5`
    );
    
    if (!wardsResult.success) {
      log.warning('Could not fetch wards for this municipality');
      return false;
    }
    
    if (wardsResult.data?.data?.length === 0) {
      log.warning('No wards found for this municipality');
      return false;
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
    } else if (votingDistrictsResult.data?.data?.length === 0) {
      log.warning('No voting districts found for this ward');
    } else {
      const firstVotingDistrict = votingDistrictsResult.data.data[0];
      log.info(`Found voting district: VD ${firstVotingDistrict.voting_district_number} - ${firstVotingDistrict.voting_district_name}`);
    }
    
    log.success('Complete hierarchical flow test completed successfully!');
    return true;
    
  } catch (error) {
    log.error(`Complete flow test failed: ${error.message}`);
    return false;
  }
}

// Test multiple provinces
async function testMultipleProvinces() {
  log.header('Testing Multiple Provinces');
  
  const testProvinces = ['GP', 'WC', 'KZN']; // Gauteng, Western Cape, KwaZulu-Natal
  
  for (const provinceCode of testProvinces) {
    log.info(`Testing province: ${provinceCode}`);
    
    // Get districts
    const districtsResult = await testEndpoint(
      `Districts for ${provinceCode}`, 
      `/geographic/districts?province=${provinceCode}`
    );
    
    if (districtsResult.success && districtsResult.data?.data?.length > 0) {
      const firstDistrict = districtsResult.data.data[0];
      
      // Get municipalities for first district
      const municipalitiesResult = await testEndpoint(
        `Municipalities for ${firstDistrict.district_code}`, 
        `/geographic/municipalities?district=${firstDistrict.district_code}`
      );
      
      if (municipalitiesResult.success && municipalitiesResult.data?.data?.length > 0) {
        log.success(`Province ${provinceCode} has complete hierarchy`);
      } else {
        log.warning(`Province ${provinceCode} has districts but no municipalities`);
      }
    } else {
      log.warning(`Province ${provinceCode} has no districts`);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Complete Geographic Flow Test Suite');
  console.log('=====================================\n');
  
  // Test basic endpoints
  log.header('Basic Endpoint Tests');
  await testEndpoint('Provinces List', '/geographic/provinces');
  await testEndpoint('Districts List', '/geographic/districts');
  await testEndpoint('Municipalities List', '/geographic/municipalities?limit=10');
  await testEndpoint('Wards List', '/geographic/wards?limit=5');
  
  // Test complete hierarchical flow
  const flowSuccess = await testCompleteFlow();
  
  // Test multiple provinces
  await testMultipleProvinces();
  
  // Test summary
  log.header('Test Summary');
  log.info(`Total tests: ${testResults.total}`);
  log.success(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    log.error(`Failed: ${testResults.failed}`);
  }
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log.info(`Success rate: ${successRate}%`);
  
  if (testResults.failed === 0 && flowSuccess) {
    log.success('🎉 All tests passed! Geographic hierarchical flow is working correctly.');
    log.info('✨ The membership application form should now work properly.');
  } else {
    log.warning('⚠️  Some tests failed or incomplete data found.');
    log.info('💡 The basic functionality should work, but some areas may have incomplete data.');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint, testCompleteFlow };
