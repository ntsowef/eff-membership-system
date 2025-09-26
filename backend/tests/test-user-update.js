#!/usr/bin/env node

const axios = require('axios');

async function testUserUpdate() {
  try {
    console.log('🔍 Testing User Update Endpoint...\n');
    
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
      console.log('❌ No users found to update');
      return;
    }
    
    // Select the first user for testing
    const testUser = users[0];
    console.log(`✅ Found ${users.length} users. Testing with user: ${testUser.name} (ID: ${testUser.id})`);
    
    // Test updating the user
    console.log('\n3. ✏️ Testing user update...');
    const updateData = {
      name: testUser.name + ' (Updated)',
      email: testUser.email,
      phone: testUser.phone || '123-456-7890',
      admin_level: testUser.admin_level,
      role_name: testUser.role_name,
      province_code: testUser.province_code,
      district_code: testUser.district_code,
      municipal_code: testUser.municipal_code,
      ward_code: testUser.ward_code,
      is_active: testUser.is_active
    };
    
    try {
      const updateResponse = await axios.put(`${baseURL}/admin-management/users/${testUser.id}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ User update successful!');
      console.log('📋 Updated user data:', {
        id: updateResponse.data.id,
        name: updateResponse.data.name,
        email: updateResponse.data.email,
        phone: updateResponse.data.phone,
        admin_level: updateResponse.data.admin_level,
        is_active: updateResponse.data.is_active,
        updated_at: updateResponse.data.updated_at
      });
      
      // Verify the update by fetching the user again
      console.log('\n4. 🔍 Verifying update...');
      const verifyResponse = await axios.get(`${baseURL}/admin-management/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedUsers = verifyResponse.data.data?.users || [];
      const updatedUser = updatedUsers.find(u => u.id === testUser.id);
      
      if (updatedUser && updatedUser.name.includes('(Updated)')) {
        console.log('✅ Update verified successfully!');
        console.log('📋 Verified user name:', updatedUser.name);
        
        // Restore original name
        console.log('\n5. 🔄 Restoring original name...');
        const restoreData = {
          ...updateData,
          name: testUser.name // Original name
        };
        
        await axios.put(`${baseURL}/admin-management/users/${testUser.id}`, restoreData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Original name restored successfully!');
      } else {
        console.log('❌ Update verification failed');
      }
      
    } catch (updateError) {
      console.log('❌ User update failed:', updateError.response?.status, updateError.response?.data?.error?.message || updateError.message);
      if (updateError.response?.data) {
        console.log('📋 Error details:', JSON.stringify(updateError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
    if (error.response?.data) {
      console.log('📋 Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testUserUpdate();
