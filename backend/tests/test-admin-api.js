#!/usr/bin/env node

const axios = require('axios');

async function testAdminAPI() {
  try {
    console.log('🔍 Testing Admin Management API...\n');
    
    const baseURL = 'http://localhost:5000/api/v1';
    
    // Test the admin users endpoint
    console.log('📊 Testing GET /admin-management/admins...');
    try {
      const response = await axios.get(`${baseURL}/admin-management/admins`);
      console.log('✅ Admin users endpoint working');
      console.log('📋 Response structure:', {
        users: response.data.users?.length || 0,
        pagination: response.data.pagination || 'No pagination',
        message: response.data.message
      });
      
      if (response.data.users && response.data.users.length > 0) {
        console.log('📋 Sample user data:');
        console.table(response.data.users.slice(0, 3).map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          admin_level: user.admin_level,
          province_code: user.province_code,
          is_active: user.is_active
        })));
      }
    } catch (error) {
      console.log('❌ Admin users endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test the statistics endpoint
    console.log('\n📊 Testing GET /admin-management/statistics...');
    try {
      const response = await axios.get(`${baseURL}/admin-management/statistics`);
      console.log('✅ Statistics endpoint working');
      console.log('📋 Statistics data:', {
        adminLevelStats: response.data.adminLevelStats?.length || 0,
        recentActivity: response.data.recentActivity || 'No data',
        creationTrends: response.data.creationTrends?.length || 0,
        geographicDistribution: response.data.geographicDistribution?.length || 0,
        mfaStats: response.data.mfaStats || 'No data'
      });
      
      if (response.data.adminLevelStats && response.data.adminLevelStats.length > 0) {
        console.log('📋 Admin level statistics:');
        console.table(response.data.adminLevelStats);
      }
    } catch (error) {
      console.log('❌ Statistics endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test the roles endpoint
    console.log('\n📊 Testing GET /admin-management/roles...');
    try {
      const response = await axios.get(`${baseURL}/admin-management/roles`);
      console.log('✅ Roles endpoint working');
      console.log('📋 Available roles:', response.data.length || 0);
      
      if (response.data && response.data.length > 0) {
        console.log('📋 Roles data:');
        console.table(response.data.slice(0, 5).map(role => ({
          id: role.id,
          name: role.name,
          description: role.description
        })));
      }
    } catch (error) {
      console.log('❌ Roles endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testAdminAPI();
