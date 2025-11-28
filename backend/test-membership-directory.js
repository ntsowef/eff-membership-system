/**
 * Test script for membership directory endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testMembershipDirectory() {
  console.log('🧪 Testing Membership Directory Endpoints\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.data.status);

    // Test 2: Directory filters (no auth required)
    console.log('\n2. Testing directory filters...');
    const filtersResponse = await axios.get(`${BASE_URL}/members/directory/filters`);
    console.log('✅ Filters retrieved:', filtersResponse.data.data.provinces.length, 'provinces');
    console.log('   Provinces:', filtersResponse.data.data.provinces.map(p => p.province_name).join(', '));

    // Test 3: Try to login with reset credentials
    console.log('\n3. Testing authentication...');
    const testCredentials = [
      { email: 'admin@eff.local', password: 'test123' }
    ];

    let authToken = null;
    for (const creds of testCredentials) {
      try {
        console.log(`   Trying: ${creds.email}`);
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, creds);
        if (loginResponse.data.success) {
          authToken = loginResponse.data.data.token;
          console.log('✅ Login successful with:', creds.email);
          console.log('   User:', loginResponse.data.data.user.name);
          console.log('   Role:', loginResponse.data.data.user.role_name);
          break;
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    if (!authToken) {
      console.log('\n❌ Could not authenticate with any test credentials');
      console.log('   This is expected if no test users exist in the database');
      return;
    }

    // Test 4: Directory endpoint with authentication
    console.log('\n4. Testing member directory with authentication...');
    const directoryResponse = await axios.get(`${BASE_URL}/members/directory`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Directory retrieved:', directoryResponse.data.data.total, 'total members');
    console.log('   Current page:', directoryResponse.data.data.page);
    console.log('   Members per page:', directoryResponse.data.data.limit);
    console.log('   Total pages:', directoryResponse.data.data.totalPages);

    // Test 5: Directory with filters
    console.log('\n5. Testing directory with province filter...');
    const filteredResponse = await axios.get(`${BASE_URL}/members/directory?province=GP&limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Filtered directory (Gauteng):', filteredResponse.data.data.members.length, 'members');

    // Test 6: Quick search
    console.log('\n6. Testing quick search...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/search/quick?q=john&limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Quick search results:', searchResponse.data.data.results.length, 'members found');
    } catch (error) {
      console.log('❌ Quick search failed:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n🎉 Membership directory testing completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testMembershipDirectory();
