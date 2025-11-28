/**
 * Test the live leadership analytics endpoint
 */

const axios = require('axios');

async function testLiveLeadershipAnalytics() {
  console.log('🎯 Testing live leadership analytics endpoint...');
  
  try {
    // Test the leadership analytics endpoint
    console.log('\n1. Testing /api/v1/analytics/leadership endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/v1/analytics/leadership', {
      headers: {
        'Authorization': 'Bearer test-token', // Use a test token
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ SUCCESS! Leadership analytics endpoint responded with status: ${response.status}`);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ HTTP Error ${error.response.status}: ${error.response.statusText}`);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's the TIMESTAMPDIFF error
      if (error.response.data && error.response.data.message && 
          error.response.data.message.includes('column "month" does not exist')) {
        console.log('\n🚨 TIMESTAMPDIFF ERROR STILL EXISTS!');
        console.log('The server restart did not fix the issue.');
      } else if (error.response.status === 401) {
        console.log('\n🔐 Authentication error - this is expected without proper JWT token');
        console.log('Let\'s try without authentication...');
        
        // Try without auth header
        try {
          const noAuthResponse = await axios.get('http://localhost:5000/api/v1/analytics/leadership', {
            timeout: 10000
          });
          console.log(`✅ SUCCESS without auth! Status: ${noAuthResponse.status}`);
        } catch (noAuthError) {
          if (noAuthError.response && noAuthError.response.data) {
            console.log('No auth error:', JSON.stringify(noAuthError.response.data, null, 2));
          } else {
            console.log('No auth error:', noAuthError.message);
          }
        }
      }
    } else if (error.request) {
      console.log('❌ Network error - server might not be running');
      console.log('Error:', error.message);
    } else {
      console.log('❌ Request setup error:', error.message);
    }
  }
  
  // Test 2: Check if server is responding at all
  console.log('\n2. Testing basic server health...');
  
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/v1/maintenance/status', {
      timeout: 5000
    });
    console.log(`✅ Server is responding! Health check status: ${healthResponse.status}`);
    console.log('Health data:', JSON.stringify(healthResponse.data, null, 2));
  } catch (healthError) {
    console.log('❌ Server health check failed:', healthError.message);
  }
  
  // Test 3: Check server logs for any TIMESTAMPDIFF errors
  console.log('\n3. Checking for recent TIMESTAMPDIFF errors in server logs...');
  console.log('(Check the server terminal for any "column month does not exist" errors)');
}

testLiveLeadershipAnalytics();
