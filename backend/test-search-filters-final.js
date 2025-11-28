/**
 * Test the advanced search endpoint to verify search_filters column issue is resolved
 */

const axios = require('axios');

async function testAdvancedSearchEndpoint() {
  console.log('🧪 Testing Advanced Search GET endpoint with search_filters logging...');

  try {
    // Test the GET endpoint that was previously failing
    const response = await axios.get('http://localhost:5000/api/v1/search/advanced', {
      params: {
        q: 'test search',
        limit: 5
      },
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Advanced Search GET Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log('\n🎉 SUCCESS: Advanced search GET endpoint is working!');
      console.log('✅ No search_filters column errors detected');

      // Test POST endpoint as well
      console.log('\n🧪 Testing Advanced Search POST endpoint...');

      const postResponse = await axios.post('http://localhost:5000/api/v1/search/advanced', {
        search: 'test search',
        filters: {
          province: 'GP',
          has_email: true
        },
        limit: 5
      }, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Advanced Search POST Response Status:', postResponse.status);
      console.log('✅ POST Response Data:', JSON.stringify(postResponse.data, null, 2));

      if (postResponse.status === 200) {
        console.log('\n🎉 COMPLETE SUCCESS: Both GET and POST advanced search endpoints are working!');
        console.log('✅ search_filters column issue has been completely resolved!');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    // Check if it's the specific search_filters column error
    if (error.message.includes('search_filters') && error.message.includes('does not exist')) {
      console.error('\n🚨 CRITICAL: search_filters column error still exists!');
      console.error('The database table structure may not be properly synchronized.');
    }
  }
}

// Run the test
testAdvancedSearchEndpoint();