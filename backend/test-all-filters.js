const axios = require('axios');

async function testAllFilters() {
  try {
    console.log('🧪 Testing all member filters...\n');

    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    const headers = { 'Authorization': `Bearer ${token}` };

    // Test cases
    const tests = [
      {
        name: 'Province Filter (MP)',
        params: { page: 1, limit: 10, province_code: 'MP' },
        expectedMin: 74000
      },
      {
        name: 'District Filter (DC32)',
        params: { page: 1, limit: 10, district_code: 'DC32' },
        expectedMin: 15000
      },
      {
        name: 'Province + District Filter (MP + DC32)',
        params: { page: 1, limit: 10, province_code: 'MP', district_code: 'DC32' },
        expectedMin: 15000
      },
      {
        name: 'Municipality Filter (MP304)',
        params: { page: 1, limit: 10, municipality_code: 'MP304' },
        expectedMin: 1
      },
      {
        name: 'Ward Filter (83004006)',
        params: { page: 1, limit: 10, ward_code: '83004006' },
        expectedMin: 1
      },
      {
        name: 'No Filter (All Members)',
        params: { page: 1, limit: 10 },
        expectedMin: 626000
      }
    ];

    console.log('📊 Test Results:\n');
    console.log('='.repeat(80));

    for (const test of tests) {
      try {
        const response = await axios.get('http://localhost:5000/api/v1/members', {
          params: test.params,
          headers
        });

        const total = response.data.pagination.total;
        const passed = total >= test.expectedMin;
        const status = passed ? '✅ PASS' : '❌ FAIL';

        console.log(`\n${status} ${test.name}`);
        console.log(`   Total Members: ${total.toLocaleString()}`);
        console.log(`   Expected Min: ${test.expectedMin.toLocaleString()}`);
        
        if (response.data.data.length > 0) {
          const sample = response.data.data[0];
          console.log(`   Sample: ${sample.firstname} ${sample.surname || ''} (${sample.province_code})`);
        }

        if (!passed) {
          console.log(`   ⚠️  WARNING: Expected at least ${test.expectedMin.toLocaleString()} but got ${total.toLocaleString()}`);
        }
      } catch (error) {
        console.log(`\n❌ FAIL ${test.name}`);
        console.log(`   Error: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ All tests complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testAllFilters();

