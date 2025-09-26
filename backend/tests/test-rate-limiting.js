const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting for Login Endpoint');
  console.log('='.repeat(50));

  // Test 1: Valid login should work
  console.log('\n1. Testing valid login (should succeed)...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    console.log('✅ Valid login successful');
  } catch (error) {
    console.log('❌ Valid login failed:', error.response?.data?.message || error.message);
  }

  // Test 2: Multiple invalid login attempts to trigger rate limiting
  console.log('\n2. Testing multiple invalid login attempts...');
  
  for (let i = 1; i <= 7; i++) {
    try {
      console.log(`   Attempt ${i}/7...`);
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@membership.org',
        password: 'WrongPassword123!'
      });
      console.log(`   ✅ Attempt ${i}: Unexpected success`);
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      const retryAfter = error.response?.data?.retryAfter;
      
      if (status === 429) {
        console.log(`   🚫 Attempt ${i}: Rate limited! ${message}`);
        if (retryAfter) {
          console.log(`      Retry after: ${retryAfter} seconds`);
        }
        break;
      } else if (status === 401) {
        console.log(`   ❌ Attempt ${i}: Invalid credentials (expected)`);
      } else {
        console.log(`   ❌ Attempt ${i}: ${message || error.message}`);
      }
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Test 3: Try valid login after rate limiting (should be blocked)
  console.log('\n3. Testing valid login after rate limiting (should be blocked)...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@membership.org',
      password: 'Admin123!'
    });
    console.log('❌ Valid login succeeded when it should be rate limited');
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    
    if (status === 429) {
      console.log('✅ Valid login correctly blocked by rate limiting');
      console.log(`   Message: ${message}`);
    } else {
      console.log('❌ Login failed for different reason:', message);
    }
  }

  // Test 4: Test that other endpoints are not affected
  console.log('\n4. Testing that other endpoints are not rate limited...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health endpoint works (not rate limited)');
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Rate Limiting Test Complete!');
  console.log('\nExpected Results:');
  console.log('- Valid login should work initially');
  console.log('- After 5 failed attempts, rate limiting should kick in');
  console.log('- Subsequent attempts (even valid ones) should be blocked');
  console.log('- Other endpoints should not be affected');
}

// Run the test
testRateLimiting().catch(console.error);
