#!/usr/bin/env node

const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing login with existing admin users...\n');
    
    const baseURL = 'http://localhost:5000/api/v1';
    
    // Test users from our database
    const testUsers = [
      {
        email: 'admin@membership.org',
        password: 'admin123', // This should be the password used when creating the user
        name: 'System Administrator'
      },
      {
        email: 'gauteng.admin@membership.org', 
        password: 'admin123',
        name: 'Gauteng Province Admin'
      },
      {
        email: 'ntsowef@gmail.com',
        password: 'admin123', // Assuming same password was used
        name: 'Frans Ntsowe'
      }
    ];
    
    for (const user of testUsers) {
      console.log(`🔍 Testing login for: ${user.name} (${user.email})`);
      
      try {
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        console.log('✅ Login successful!');
        console.log('📋 Response:', {
          success: response.data.success,
          message: response.data.message,
          user: response.data.user ? {
            id: response.data.user.id,
            name: response.data.user.name,
            email: response.data.user.email,
            admin_level: response.data.user.admin_level
          } : 'No user data',
          token: response.data.token ? 'Token received' : 'No token'
        });
        
        // Test accessing protected endpoint with token
        if (response.data.token) {
          console.log('\n🔒 Testing protected endpoint with token...');
          try {
            const protectedResponse = await axios.get(`${baseURL}/admin-management/statistics`, {
              headers: {
                'Authorization': `Bearer ${response.data.token}`
              }
            });
            console.log('✅ Protected endpoint access successful!');
            console.log('📊 Statistics data received:', {
              total_users: protectedResponse.data.total_users,
              active_users: protectedResponse.data.active_users,
              admin_users: protectedResponse.data.admin_users
            });
          } catch (protectedError) {
            console.log('❌ Protected endpoint failed:', protectedError.response?.status, protectedError.response?.data?.message || protectedError.message);
          }
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        break; // Stop after first successful login
        
      } catch (error) {
        console.log('❌ Login failed:', error.response?.status, error.response?.data?.message || error.message);
        console.log('\n');
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testLogin();
