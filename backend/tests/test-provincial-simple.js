#!/usr/bin/env node

const axios = require('axios');

async function testProvincialDistribution() {
  try {
    console.log('🧪 Testing Provincial Distribution...\n');
    
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Test provincial distribution
    console.log('\n2️⃣ Testing provincial distribution...');
    const response = await axios.get('http://localhost:5000/api/v1/statistics/provincial-distribution', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Provincial distribution response received');
    console.log('Response structure:');
    console.log('- success:', response.data.success);
    console.log('- message:', response.data.message);
    
    if (response.data.data) {
      const data = response.data.data;
      console.log('- provinces count:', data.provinces?.length || 0);
      console.log('- total_provinces:', data.summary?.total_provinces);
      console.log('- province_context:', JSON.stringify(data.province_context || {}));
      
      if (data.provinces && data.provinces.length > 0) {
        console.log('\nProvince details:');
        data.provinces.forEach(p => {
          console.log(`- ${p.province_name || p.name} (${p.province_code}): ${p.member_count} members`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error?.details) {
      console.error('Error details:', error.response.data.error.details);
    }
  }
}

testProvincialDistribution();
