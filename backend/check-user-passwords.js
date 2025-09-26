#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkUserPasswords() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });
    
    console.log('🔍 Checking user passwords in database...\n');
    
    // Get users with their password hashes
    const [users] = await connection.execute(`
      SELECT id, name, email, password, admin_level, is_active 
      FROM users 
      WHERE admin_level IS NOT NULL 
      ORDER BY created_at DESC
    `);
    
    console.log('📋 Found users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.admin_level} - Active: ${user.is_active}`);
      console.log(`    Password hash: ${user.password.substring(0, 20)}...`);
    });
    
    console.log('\n🔐 Testing password verification...');
    
    // Test common passwords against the hashes
    const commonPasswords = ['admin123', 'password', '123456', 'admin', 'test123'];
    
    for (const user of users.slice(0, 3)) { // Test first 3 users
      console.log(`\n👤 Testing passwords for: ${user.name}`);
      
      for (const testPassword of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`  ✅ Password "${testPassword}" matches!`);
            
            // Test login with this password
            console.log(`  🔍 Testing API login...`);
            const axios = require('axios');
            try {
              const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
                email: user.email,
                password: testPassword
              });
              console.log(`  ✅ API login successful!`);
              console.log(`  📋 Token received: ${response.data.token ? 'Yes' : 'No'}`);
            } catch (apiError) {
              console.log(`  ❌ API login failed: ${apiError.response?.status} - ${apiError.response?.data?.message || apiError.message}`);
            }
            break;
          }
        } catch (error) {
          console.log(`  ❌ Error testing password "${testPassword}": ${error.message}`);
        }
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

checkUserPasswords();
