#!/usr/bin/env node

const axios = require('axios');

async function debugAuthMiddleware() {
  try {
    console.log('🔍 Debugging Authentication Middleware...\n');
    
    // Step 1: Login and get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    console.log('✅ Login successful');
    console.log('User:', JSON.stringify(user, null, 2));
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Step 2: Test token validation endpoint
    console.log('\n2️⃣ Testing token validation...');
    const validateResponse = await axios.get('http://localhost:5000/api/v1/auth/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Token validation successful');
    console.log('Validated user:', JSON.stringify(validateResponse.data.data.user, null, 2));
    
    // Step 3: Test a simple authenticated endpoint to see middleware behavior
    console.log('\n3️⃣ Testing dashboard endpoint with debug...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/v1/statistics/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Dashboard response received');
    console.log('Province context:', JSON.stringify(dashboardResponse.data.data.province_context, null, 2));
    console.log('System stats sample:', {
      total_members: dashboardResponse.data.data.system?.total_members,
      province_filter: dashboardResponse.data.data.system?.province_filter
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugAuthMiddleware();
