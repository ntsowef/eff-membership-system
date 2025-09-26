const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function debugLoginResponse() {
  console.log('🔍 **DEBUGGING LOGIN RESPONSE STRUCTURE**\n');

  try {
    // Test Financial Reviewer Login
    console.log('1️⃣ **Testing Financial Reviewer Login**');
    const financialReviewerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    console.log('✅ Financial Reviewer login response:');
    console.log('   Status:', financialReviewerLogin.status);
    console.log('   Response Data:', JSON.stringify(financialReviewerLogin.data, null, 2));

    // Test Membership Approver Login
    console.log('\n2️⃣ **Testing Membership Approver Login**');
    const membershipApproverLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'membership.approver@test.com',
      password: 'password123'
    });

    console.log('✅ Membership Approver login response:');
    console.log('   Status:', membershipApproverLogin.status);
    console.log('   Response Data:', JSON.stringify(membershipApproverLogin.data, null, 2));

  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    console.log('💡 Make sure the backend server is running on port 5000');
  }
}

// Run the debug
debugLoginResponse();
