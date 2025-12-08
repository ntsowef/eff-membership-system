const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function testDebugEndpoint() {
  try {
    console.log('🔐 Authenticating...');
    
    // Authenticate
    const authResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });
    
    const token = authResponse.data.data.token;
    console.log('✅ Authenticated');
    console.log('   Token:', token.substring(0, 50) + '...');
    
    // Call debug endpoint
    console.log('\n📞 Calling debug endpoint...');
    const debugResponse = await axios.get(
      `${API_URL}/api/v1/member-application-bulk-upload/debug-user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Debug response:');
    console.log(JSON.stringify(debugResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDebugEndpoint();

