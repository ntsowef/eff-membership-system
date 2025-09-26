#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testMaintenanceSystem() {
  try {
    console.log('🔧 Testing Maintenance Mode System...\n');
    
    // Test 1: Check maintenance status (should be inactive initially)
    console.log('📋 Test 1: Check initial maintenance status');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/maintenance/status`);
      console.log('✅ Status check successful:', statusResponse.data);
      
      if (!statusResponse.data.data.is_enabled) {
        console.log('✅ Maintenance mode is initially disabled');
      } else {
        console.log('⚠️  Maintenance mode is already enabled');
      }
    } catch (error) {
      console.log('❌ Status check failed:', error.response?.data || error.message);
    }
    
    // Test 2: Try to access a protected endpoint (should work when maintenance is off)
    console.log('\n📋 Test 2: Access protected endpoint (maintenance off)');
    try {
      const membersResponse = await axios.get(`${BASE_URL}/members`);
      console.log('✅ Protected endpoint accessible when maintenance is off');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Protected endpoint requires authentication (expected)');
      } else if (error.response?.status === 503) {
        console.log('❌ Maintenance mode is blocking requests when it should be off');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.error?.message);
      }
    }
    
    // Test 3: Login as admin to test maintenance toggle
    console.log('\n📋 Test 3: Login as admin');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@membership.org',
        password: 'admin123'
      });
      
      if (loginResponse.data.success) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Admin login successful');
      } else {
        console.log('❌ Admin login failed:', loginResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Admin login error:', error.response?.data?.message || error.message);
    }
    
    if (!authToken) {
      console.log('❌ Cannot continue tests without admin authentication');
      return;
    }
    
    // Test 4: Enable maintenance mode
    console.log('\n📋 Test 4: Enable maintenance mode');
    try {
      const enableResponse = await axios.post(`${BASE_URL}/maintenance/toggle`, {
        enabled: true,
        message: 'System is under maintenance for testing. Please check back shortly.',
        level: 'full_system'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Maintenance mode enabled:', enableResponse.data);
    } catch (error) {
      console.log('❌ Failed to enable maintenance mode:', error.response?.data || error.message);
    }
    
    // Test 5: Check status after enabling
    console.log('\n📋 Test 5: Check status after enabling');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/maintenance/status`);
      console.log('✅ Status after enabling:', statusResponse.data);
      
      if (statusResponse.data.data.is_enabled) {
        console.log('✅ Maintenance mode is now enabled');
      } else {
        console.log('❌ Maintenance mode should be enabled but shows as disabled');
      }
    } catch (error) {
      console.log('❌ Status check failed:', error.response?.data || error.message);
    }
    
    // Test 6: Try to access protected endpoint (should be blocked)
    console.log('\n📋 Test 6: Access protected endpoint (maintenance on)');
    try {
      const membersResponse = await axios.get(`${BASE_URL}/members`);
      console.log('❌ Protected endpoint should be blocked during maintenance');
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('✅ Protected endpoint correctly blocked during maintenance');
        console.log('   Response:', error.response.data);
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 7: Admin should still be able to access maintenance endpoints
    console.log('\n📋 Test 7: Admin access during maintenance');
    try {
      const configResponse = await axios.get(`${BASE_URL}/maintenance/config`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Admin can access maintenance config during maintenance');
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('❌ Admin should be able to bypass maintenance mode');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 8: Check bypass permissions
    console.log('\n📋 Test 8: Check admin bypass permissions');
    try {
      const bypassResponse = await axios.get(`${BASE_URL}/maintenance/bypass-check`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Bypass check result:', bypassResponse.data);
    } catch (error) {
      console.log('❌ Bypass check failed:', error.response?.data || error.message);
    }
    
    // Test 9: Disable maintenance mode
    console.log('\n📋 Test 9: Disable maintenance mode');
    try {
      const disableResponse = await axios.post(`${BASE_URL}/maintenance/toggle`, {
        enabled: false
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Maintenance mode disabled:', disableResponse.data);
    } catch (error) {
      console.log('❌ Failed to disable maintenance mode:', error.response?.data || error.message);
    }
    
    // Test 10: Verify maintenance is off
    console.log('\n📋 Test 10: Verify maintenance is disabled');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/maintenance/status`);
      console.log('✅ Final status:', statusResponse.data);
      
      if (!statusResponse.data.data.is_enabled) {
        console.log('✅ Maintenance mode is now disabled');
      } else {
        console.log('❌ Maintenance mode should be disabled');
      }
    } catch (error) {
      console.log('❌ Final status check failed:', error.response?.data || error.message);
    }
    
    // Test 11: Check maintenance logs
    console.log('\n📋 Test 11: Check maintenance logs');
    try {
      const logsResponse = await axios.get(`${BASE_URL}/maintenance/logs`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Maintenance logs retrieved:', logsResponse.data.data.length, 'entries');
      
      if (logsResponse.data.data.length > 0) {
        console.log('   Latest log entry:', logsResponse.data.data[0]);
      }
    } catch (error) {
      console.log('❌ Failed to get maintenance logs:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Maintenance Mode System Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test database tables
async function testDatabaseTables() {
  try {
    console.log('\n📋 Testing database tables...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Check maintenance_mode table
    const [maintenanceRows] = await connection.execute('SELECT * FROM maintenance_mode LIMIT 1');
    console.log('✅ maintenance_mode table:', maintenanceRows.length > 0 ? 'Has data' : 'Empty');
    
    // Check maintenance_mode_logs table
    const [logsRows] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_mode_logs');
    console.log('✅ maintenance_mode_logs table:', logsRows[0].count, 'entries');
    
    // Check view
    const [viewRows] = await connection.execute('SELECT * FROM vw_current_maintenance_status');
    console.log('✅ vw_current_maintenance_status view:', viewRows.length > 0 ? 'Working' : 'No data');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testDatabaseTables();
  await testMaintenanceSystem();
}

runAllTests();
