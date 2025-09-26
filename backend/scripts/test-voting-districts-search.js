const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

// Test configuration - using existing user
const testConfig = {
  testUser: {
    email: 'admin@geomaps.local',
    password: 'admin123' // Try common password, or we'll test without auth
  }
};

let authToken = null;

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        error: true,
        status: error.response.status,
        message: error.response.data?.error?.message || error.response.data?.message || 'API Error',
        data: error.response.data
      };
    }
    return {
      error: true,
      message: error.message
    };
  }
}

// Test authentication (optional - for testing without auth, we'll skip this)
async function testAuthentication() {
  console.log('🔐 Testing Authentication...');
  
  try {
    const result = await apiRequest('POST', '/auth/login', testConfig.testUser);
    
    if (result.error) {
      console.log('   ⚠️  Authentication failed (will test without auth):', result.message);
      return false;
    }
    
    if (result.success && result.data?.token) {
      authToken = result.data.token;
      console.log('   ✅ Authentication successful');
      return true;
    }
    
    console.log('   ⚠️  No token received (will test without auth)');
    return false;
  } catch (error) {
    console.log('   ⚠️  Authentication error (will test without auth):', error.message);
    return false;
  }
}

// Test 1: Get all voting districts
async function testGetVotingDistricts() {
  console.log('\n📋 Test 1: Get Voting Districts');
  
  const result = await apiRequest('GET', '/geographic/voting-districts?limit=5');
  
  if (result.error) {
    console.log('   ❌ Failed:', result.message);
    return false;
  }
  
  if (result.success && result.data) {
    console.log(`   ✅ Success: Retrieved ${result.data.length} voting districts`);
    
    // Show sample data
    if (result.data.length > 0) {
      const sample = result.data[0];
      console.log('   📋 Sample voting district:');
      console.log(`      - Code: ${sample.voting_district_code}`);
      console.log(`      - Name: ${sample.voting_district_name}`);
      console.log(`      - Ward: ${sample.ward_name} (${sample.ward_number})`);
      console.log(`      - Municipality: ${sample.municipal_name}`);
      console.log(`      - Province: ${sample.province_name}`);
      console.log(`      - Members: ${sample.member_count || 0}`);
    }
    
    return true;
  }
  
  console.log('   ❌ Unexpected response format');
  return false;
}

// Test 2: Get voting districts by ward
async function testGetVotingDistrictsByWard() {
  console.log('\n🏘️  Test 2: Get Voting Districts by Ward');
  
  // First get a ward code from the voting districts
  const allDistricts = await apiRequest('GET', '/geographic/voting-districts?limit=1');
  
  if (allDistricts.error || !allDistricts.data || allDistricts.data.length === 0) {
    console.log('   ⚠️  Could not get sample ward code');
    return false;
  }
  
  const sampleWardCode = allDistricts.data[0].ward_code;
  console.log(`   🎯 Testing with ward code: ${sampleWardCode}`);
  
  const result = await apiRequest('GET', `/geographic/voting-districts/by-ward/${sampleWardCode}`);
  
  if (result.error) {
    console.log('   ❌ Failed:', result.message);
    return false;
  }
  
  if (result.success && result.data) {
    console.log(`   ✅ Success: Found ${result.data.length} voting districts in ward ${sampleWardCode}`);
    
    result.data.forEach((district, index) => {
      console.log(`      ${index + 1}. ${district.voting_district_name} (${district.voting_district_code}) - ${district.member_count || 0} members`);
    });
    
    return true;
  }
  
  console.log('   ❌ Unexpected response format');
  return false;
}

// Test 3: Get voting district statistics
async function testGetVotingDistrictStatistics() {
  console.log('\n📊 Test 3: Get Voting District Statistics');
  
  const result = await apiRequest('GET', '/geographic/voting-districts/statistics');
  
  if (result.error) {
    console.log('   ❌ Failed:', result.message);
    return false;
  }
  
  if (result.success && result.data) {
    const stats = result.data;
    console.log('   ✅ Success: Retrieved voting district statistics');
    console.log(`      - Total voting districts: ${stats.total_voting_districts || 0}`);
    console.log(`      - Active voting districts: ${stats.active_voting_districts || 0}`);
    
    if (stats.voting_districts_by_province && stats.voting_districts_by_province.length > 0) {
      console.log('      - Top provinces by voting districts:');
      stats.voting_districts_by_province.slice(0, 3).forEach((province, index) => {
        console.log(`        ${index + 1}. ${province.province_name}: ${province.voting_district_count} districts`);
      });
    }
    
    if (stats.member_distribution && stats.member_distribution.length > 0) {
      console.log('      - Top voting districts by members:');
      stats.member_distribution.slice(0, 3).forEach((district, index) => {
        console.log(`        ${index + 1}. ${district.voting_district_name}: ${district.member_count} members`);
      });
    }
    
    return true;
  }
  
  console.log('   ❌ Unexpected response format');
  return false;
}

// Test 4: Test geographic hierarchy
async function testGeographicHierarchy() {
  console.log('\n🗺️  Test 4: Test Geographic Hierarchy');
  
  const result = await apiRequest('GET', '/geographic/voting-districts/hierarchy?limit=5');
  
  if (result.error) {
    console.log('   ❌ Failed:', result.message);
    return false;
  }
  
  if (result.success && result.data) {
    console.log(`   ✅ Success: Retrieved ${result.data.length} hierarchy records`);
    
    if (result.data.length > 0) {
      const sample = result.data[0];
      console.log('   📋 Sample hierarchy:');
      console.log(`      - Full hierarchy: ${sample.full_hierarchy}`);
      console.log(`      - Province: ${sample.province_name}`);
      console.log(`      - District: ${sample.district_name}`);
      console.log(`      - Municipality: ${sample.municipal_name}`);
      console.log(`      - Ward: ${sample.ward_name} (${sample.ward_number})`);
      console.log(`      - Voting District: ${sample.voting_district_name} (${sample.voting_district_number})`);
    }
    
    return true;
  }
  
  console.log('   ❌ Unexpected response format');
  return false;
}

// Test 5: Test search functionality
async function testSearchFunctionality() {
  console.log('\n🔍 Test 5: Test Search Functionality');
  
  // Test search by name
  const searchResult = await apiRequest('GET', '/geographic/voting-districts?search=HALL&limit=3');
  
  if (searchResult.error) {
    console.log('   ❌ Search failed:', searchResult.message);
    return false;
  }
  
  if (searchResult.success && searchResult.data) {
    console.log(`   ✅ Search success: Found ${searchResult.data.length} voting districts containing "HALL"`);
    
    searchResult.data.forEach((district, index) => {
      console.log(`      ${index + 1}. ${district.voting_district_name} (${district.voting_district_code})`);
    });
    
    return true;
  }
  
  console.log('   ❌ Unexpected search response format');
  return false;
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Voting Districts Search Tests...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Optional authentication test
  await testAuthentication();
  
  // Run all tests
  const tests = [
    { name: 'Get Voting Districts', fn: testGetVotingDistricts },
    { name: 'Get Voting Districts by Ward', fn: testGetVotingDistrictsByWard },
    { name: 'Get Voting District Statistics', fn: testGetVotingDistrictStatistics },
    { name: 'Test Geographic Hierarchy', fn: testGeographicHierarchy },
    { name: 'Test Search Functionality', fn: testSearchFunctionality }
  ];
  
  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.log(`   ❌ Test "${test.name}" threw an error:`, error.message);
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   Total tests: ${results.total}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All voting district search tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
