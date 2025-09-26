#!/usr/bin/env node

const axios = require('axios');

async function testPasswordReset() {
  try {
    console.log('🔍 Testing Password Reset Endpoint...\n');
    
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
    
    // Get list of users first
    console.log('\n2. 📊 Getting list of users...');
    const usersResponse = await axios.get(`${baseURL}/admin-management/admins`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const users = usersResponse.data.data?.users || [];
    if (users.length === 0) {
      console.log('❌ No users found to test password reset');
      return;
    }
    
    // Select a test user (not the admin we're logged in as)
    const testUser = users.find(u => u.email !== 'admin@membership.org') || users[0];
    console.log(`✅ Found ${users.length} users. Testing password reset for: ${testUser.name} (ID: ${testUser.id})`);
    
    // Test password reset
    console.log('\n3. 🔑 Testing password reset...');
    const newPassword = 'newpassword123';
    
    try {
      const resetResponse = await axios.put(`${baseURL}/admin-management/users/${testUser.id}/reset-password`, {
        new_password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Password reset successful!');
      console.log('📋 Response:', {
        success: resetResponse.data.success,
        message: resetResponse.data.message,
        user_id: resetResponse.data.id
      });
      
      // Test login with new password (if it's not the admin user)
      if (testUser.email !== 'admin@membership.org') {
        console.log('\n4. 🔍 Testing login with new password...');
        try {
          const testLoginResponse = await axios.post(`${baseURL}/auth/login`, {
            email: testUser.email,
            password: newPassword
          });
          
          if (testLoginResponse.data.success) {
            console.log('✅ Login with new password successful!');
            console.log('📋 User can now log in with the new password');
            
            // Reset back to a known password for future tests
            console.log('\n5. 🔄 Resetting password back for future tests...');
            await axios.put(`${baseURL}/admin-management/users/${testUser.id}/reset-password`, {
              new_password: 'testpassword123'
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('✅ Password reset back to test password');
            
          } else {
            console.log('❌ Login with new password failed');
          }
        } catch (loginError) {
          console.log('❌ Login test failed:', loginError.response?.data?.error?.message || loginError.message);
        }
      } else {
        console.log('\n4. ⚠️ Skipping login test (would affect admin user)');
      }
      
    } catch (resetError) {
      console.log('❌ Password reset failed:', resetError.response?.status, resetError.response?.data?.error?.message || resetError.message);
      if (resetError.response?.data) {
        console.log('📋 Error details:', JSON.stringify(resetError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
    if (error.response?.data) {
      console.log('📋 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Wait a moment for server to start
setTimeout(testPasswordReset, 3000);
