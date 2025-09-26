#!/usr/bin/env node

const axios = require('axios');

async function testAdminUsersEndpoint() {
  try {
    console.log('🔍 Testing Admin Users Endpoint...\n');
    
    const baseURL = 'http://localhost:5000/api/v1';
    
    // First, login to get a token
    console.log('1. 🔐 Logging in to get authentication token...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@membership.org',
      password: 'admin123'
    });
    
    if (!loginResponse.data.data?.token) {
      console.log('❌ Login failed - no token received');
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // Test the admin users endpoint
    console.log('\n2. 📊 Testing GET /admin-management/admins...');
    try {
      const adminsResponse = await axios.get(`${baseURL}/admin-management/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Admin users endpoint successful!');
      console.log('📋 Response structure:', {
        success: adminsResponse.data.success,
        message: adminsResponse.data.message,
        users_count: adminsResponse.data.users?.length || 0,
        pagination: adminsResponse.data.pagination || 'No pagination'
      });
      
      if (adminsResponse.data.users && adminsResponse.data.users.length > 0) {
        console.log('\n📋 Admin users found:');
        adminsResponse.data.users.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.name} (${user.email})`);
          console.log(`     - Admin Level: ${user.admin_level}`);
          console.log(`     - Role: ${user.role_name || 'No role'}`);
          console.log(`     - Province: ${user.province_code || 'None'}`);
          console.log(`     - Active: ${user.is_active}`);
          console.log(`     - Created: ${user.created_at}`);
          console.log('');
        });
      } else {
        console.log('❌ No admin users found in response');
        console.log('📋 Full response data:', JSON.stringify(adminsResponse.data, null, 2));
      }
      
    } catch (adminsError) {
      console.log('❌ Admin users endpoint failed:', adminsError.response?.status, adminsError.response?.data?.message || adminsError.message);
      if (adminsError.response?.data) {
        console.log('📋 Error details:', JSON.stringify(adminsError.response.data, null, 2));
      }
    }
    
    // Test with different parameters
    console.log('\n3. 📊 Testing with limit parameter...');
    try {
      const limitedResponse = await axios.get(`${baseURL}/admin-management/admins?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Limited query successful!');
      console.log('📋 Users returned:', limitedResponse.data.users?.length || 0);
      
    } catch (limitError) {
      console.log('❌ Limited query failed:', limitError.response?.status, limitError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
    if (error.response?.data) {
      console.log('📋 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdminUsersEndpoint();
