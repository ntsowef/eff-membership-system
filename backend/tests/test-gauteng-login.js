#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testGautengLogin() {
  console.log('🧪 Testing Gauteng Provincial Admin Login\n');

  try {
    // Test Gauteng provincial admin login
    console.log('1️⃣ Testing Gauteng Provincial Admin Login...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'gauteng.admin@membership.org',
      password: 'Gauteng123!'
    });

    if (loginResponse.data.success) {
      const user = loginResponse.data.data.user;
      const token = loginResponse.data.data.token;
      
      console.log(`   ✅ Login successful: ${user.name}`);
      console.log(`   ✅ Admin level: ${user.admin_level}`);
      console.log(`   ✅ Province code: ${user.province_code}`);
      console.log(`   ✅ District code: ${user.district_code}`);
      console.log(`   ✅ Token received: ${token ? 'Yes' : 'No'}`);
      
      // Test dashboard access with province filtering
      console.log('\n2️⃣ Testing Dashboard Access with Province Filtering...');
      
      const dashboardResponse = await axios.get(`${BASE_URL}/statistics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (dashboardResponse.data.success) {
        const data = dashboardResponse.data.data;
        console.log(`   ✅ Dashboard data retrieved successfully`);
        console.log(`   ✅ Province filtering: ${data.province_context?.filtered_by_province ? 'Yes' : 'No'}`);
        console.log(`   ✅ Province context: ${JSON.stringify(data.province_context || {})}`);
        
        if (data.province_context?.province_code === 'GP') {
          console.log('   ✅ Correctly filtered to Gauteng province!');
        } else {
          console.log('   ❌ Province filtering not working correctly');
        }
      } else {
        console.log('   ❌ Dashboard access failed');
      }
      
      // Test provincial distribution
      console.log('\n3️⃣ Testing Provincial Distribution Filtering...');
      
      const provincialResponse = await axios.get(`${BASE_URL}/statistics/provincial-distribution`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (provincialResponse.data.success) {
        const data = provincialResponse.data.data;
        console.log(`   ✅ Provincial distribution retrieved successfully`);
        console.log(`   ✅ Total provinces shown: ${data.summary?.total_provinces || 'N/A'}`);
        console.log(`   ✅ Province filtering: ${data.province_context?.filtered_by_province ? 'Yes' : 'No'}`);
        
        if (data.summary?.total_provinces === 1) {
          console.log('   ✅ Correctly showing only 1 province (Gauteng)!');
        } else {
          console.log('   ❌ Should only show 1 province for provincial admin');
        }
      } else {
        console.log('   ❌ Provincial distribution access failed');
      }
      
      // Test member directory
      console.log('\n4️⃣ Testing Member Directory Filtering...');
      
      const memberResponse = await axios.get(`${BASE_URL}/members/directory?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (memberResponse.data.success) {
        const data = memberResponse.data.data;
        console.log(`   ✅ Member directory retrieved successfully`);
        console.log(`   ✅ Total members found: ${data.total || 'N/A'}`);
        console.log(`   ✅ Members in response: ${data.members?.length || 0}`);
        
        // Check if all members are from Gauteng
        if (data.members && data.members.length > 0) {
          const provinces = [...new Set(data.members.map(m => m.province_code || m.province_name).filter(Boolean))];
          console.log(`   ✅ Provinces in results: ${provinces.join(', ') || 'N/A'}`);
          
          if (provinces.length === 1 && (provinces[0] === 'GP' || provinces[0].includes('Gauteng'))) {
            console.log('   ✅ All members are from Gauteng province!');
          } else if (provinces.length === 0) {
            console.log('   ℹ️  No province information in member data');
          } else {
            console.log('   ❌ Members from other provinces found - filtering not working');
          }
        }
      } else {
        console.log('   ❌ Member directory access failed');
      }
      
      console.log('\n✅ Gauteng Provincial Admin Testing Complete!');
      
    } else {
      console.log('   ❌ Login failed:', loginResponse.data.error?.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error?.message || error.message);
  }
}

testGautengLogin();
