const axios = require('axios');

async function testIECApiConfiguration() {
  try {
    console.log('🔍 Testing IEC API Configuration...\n');

    // Test 1: Check if server is running
    console.log('📋 Step 1: Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:5000/api/v1/health', {
        timeout: 5000
      });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      console.log('🚨 CRITICAL: Backend server is not running!');
      console.log('   Please start the server with: npm start or npm run dev');
      return;
    }

    // Test 2: Test authentication
    console.log('\n📋 Step 2: Testing authentication...');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'membership.approver@test.com',
        password: 'password123'
      }, { timeout: 10000 });

      const token = loginResponse.data.data.token;
      console.log('✅ Authentication successful');

      // Test 3: Test IEC API status endpoint
      console.log('\n📋 Step 3: Testing IEC API status endpoint...');
      try {
        const iecStatusResponse = await axios.get('http://localhost:5000/api/v1/iec/status', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        console.log('✅ IEC API status endpoint working');
        console.log('   Status:', iecStatusResponse.data.data.status);
        console.log('   Timestamp:', iecStatusResponse.data.data.timestamp);

      } catch (error) {
        console.log('❌ IEC API status endpoint failed');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message || error.message);
        
        if (error.response?.status === 404) {
          console.log('🚨 CRITICAL: IEC API routes not registered!');
        }
      }

      // Test 4: Test IEC API configuration values
      console.log('\n📋 Step 4: Testing IEC API configuration...');
      
      // Load environment variables
      require('dotenv').config();
      
      const iecConfig = {
        apiUrl: process.env.IEC_API_URL,
        username: process.env.IEC_API_USERNAME,
        password: process.env.IEC_API_PASSWORD,
        timeout: process.env.IEC_API_TIMEOUT,
        rateLimit: process.env.IEC_API_RATE_LIMIT
      };

      console.log('📊 IEC API Configuration:');
      console.log('   API URL:', iecConfig.apiUrl || '❌ NOT SET');
      console.log('   Username:', iecConfig.username ? '✅ SET' : '❌ NOT SET');
      console.log('   Password:', iecConfig.password ? '✅ SET' : '❌ NOT SET');
      console.log('   Timeout:', iecConfig.timeout || 'Using default (30000ms)');
      console.log('   Rate Limit:', iecConfig.rateLimit || 'Using default (100)');

      // Check for missing configuration
      const missingConfig = [];
      if (!iecConfig.apiUrl) missingConfig.push('IEC_API_URL');
      if (!iecConfig.username) missingConfig.push('IEC_API_USERNAME');
      if (!iecConfig.password) missingConfig.push('IEC_API_PASSWORD');

      if (missingConfig.length > 0) {
        console.log('\n❌ Missing IEC API Configuration:');
        missingConfig.forEach(config => {
          console.log(`   - ${config}`);
        });
        console.log('\n🔧 Please update your .env file with the missing values:');
        missingConfig.forEach(config => {
          console.log(`   ${config}=your_value_here`);
        });
      } else {
        console.log('\n✅ All IEC API configuration values are set');
      }

      // Test 5: Test voter verification endpoint (will fail without real credentials)
      console.log('\n📋 Step 5: Testing voter verification endpoint...');
      try {
        const verifyResponse = await axios.post('http://localhost:5000/api/v1/iec/verify-voter', {
          idNumber: '1234567890123' // Test ID number
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });

        console.log('✅ Voter verification endpoint working');
        console.log('   Response:', verifyResponse.data.message);

      } catch (error) {
        console.log('⚠️  Voter verification endpoint response:');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.error?.message || error.message);
        
        if (error.response?.status === 500) {
          console.log('   This is expected if IEC API credentials are not real');
        } else if (error.response?.status === 403) {
          console.log('   User may not have required permissions');
        } else if (error.response?.status === 400) {
          console.log('   Request validation working correctly');
        }
      }

    } catch (error) {
      console.log('❌ Authentication failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('   1. Update .env file with real IEC API credentials');
    console.log('   2. Restart backend server to load new configuration');
    console.log('   3. Test with real IEC API endpoints');
    console.log('   4. Add required permissions to user roles');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIECApiConfiguration();
