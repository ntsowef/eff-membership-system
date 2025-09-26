#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });
    
    console.log('🔐 Resetting admin password for testing...\n');
    
    // Reset password for System Administrator
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const [result] = await connection.execute(`
      UPDATE users 
      SET password = ?, password_changed_at = NOW() 
      WHERE email = 'admin@membership.org'
    `, [hashedPassword]);
    
    if (result.affectedRows > 0) {
      console.log('✅ Password reset successful!');
      console.log('📋 User: admin@membership.org');
      console.log('📋 New password: admin123');
      
      // Test the login immediately
      console.log('\n🔍 Testing login with new password...');
      const axios = require('axios');
      
      try {
        const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
          email: 'admin@membership.org',
          password: 'admin123'
        });
        
        console.log('✅ Login test successful!');
        console.log('📋 Response:', {
          success: response.data.success,
          message: response.data.message,
          user: response.data.data?.user ? {
            id: response.data.data.user.id,
            name: response.data.data.user.name,
            email: response.data.data.user.email,
            admin_level: response.data.data.user.admin_level
          } : 'No user data',
          token: response.data.data?.token ? 'Token received' : 'No token'
        });

        // Test protected endpoint
        if (response.data.data?.token) {
          console.log('\n🔒 Testing protected statistics endpoint...');
          try {
            const statsResponse = await axios.get('http://localhost:5000/api/v1/admin-management/statistics', {
              headers: {
                'Authorization': `Bearer ${response.data.data.token}`
              }
            });
            console.log('✅ Statistics endpoint successful!');
            console.log('📊 Sample data:', {
              total_users: statsResponse.data.data?.total_users || statsResponse.data.total_users,
              active_users: statsResponse.data.data?.active_users || statsResponse.data.active_users,
              national_admins: statsResponse.data.data?.national_admins || statsResponse.data.national_admins
            });
          } catch (statsError) {
            console.log('❌ Statistics endpoint failed:', statsError.response?.status, statsError.response?.data?.message);
          }
        }
        
      } catch (loginError) {
        console.log('❌ Login test failed:', loginError.response?.status, loginError.response?.data?.message || loginError.message);
      }
      
    } else {
      console.log('❌ No user found with email admin@membership.org');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

resetAdminPassword();
