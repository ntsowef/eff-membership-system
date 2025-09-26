#!/usr/bin/env node

const axios = require('axios');

async function testDashboard() {
  try {
    console.log('🧪 Testing Dashboard Response...\n');
    
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Test dashboard
    console.log('\n2️⃣ Testing dashboard...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/v1/statistics/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Dashboard response received');
    console.log('Response structure:');
    console.log('- success:', dashboardResponse.data.success);
    console.log('- message:', dashboardResponse.data.message);
    console.log('- data keys:', Object.keys(dashboardResponse.data.data || {}));
    
    if (dashboardResponse.data.data) {
      const data = dashboardResponse.data.data;
      
      console.log('\nSystem stats:');
      if (data.system) {
        console.log('- total_members:', data.system.total_members);
        console.log('- active_members:', data.system.active_members);
        console.log('- province_filter:', data.system.province_filter);
      } else {
        console.log('- system: undefined');
      }
      
      console.log('\nProvince context:');
      if (data.province_context) {
        console.log('- filtered_by_province:', data.province_context.filtered_by_province);
        console.log('- province_code:', data.province_context.province_code);
      } else {
        console.log('- province_context: undefined');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDashboard();
