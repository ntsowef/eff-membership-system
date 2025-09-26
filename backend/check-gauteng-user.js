#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkGautengUser() {
  let connection;
  try {
    console.log('🔍 Checking Gauteng admin user...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    // Get the Gauteng admin user
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.password,
        u.admin_level,
        u.province_code,
        u.district_code,
        u.municipal_code,
        u.ward_code,
        u.is_active,
        u.mfa_enabled,
        u.failed_login_attempts,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = 1
    `, ['gauteng.admin@membership.org']);
    
    if (users.length === 0) {
      console.log('❌ No Gauteng admin user found!');
      return;
    }
    
    const user = users[0];
    console.log('✅ Found Gauteng admin user:');
    console.log('- ID:', user.id);
    console.log('- Name:', user.name);
    console.log('- Email:', user.email);
    console.log('- Admin Level:', user.admin_level);
    console.log('- Province Code:', user.province_code);
    console.log('- District Code:', user.district_code);
    console.log('- Is Active:', user.is_active);
    console.log('- Role Name:', user.role_name);
    console.log('- Password Hash:', user.password ? 'Present' : 'Missing');
    
    // Test password verification
    if (user.password) {
      console.log('\n🔐 Testing password verification...');
      
      // Test with the expected password
      const testPassword = 'Gauteng123!';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`Password "${testPassword}" is valid:`, isValid);
      
      // If not valid, let's try some other common passwords
      if (!isValid) {
        const commonPasswords = [
          'gauteng123',
          'Gauteng123',
          'password',
          'admin123',
          'Admin123!',
          'gauteng',
          'Gauteng',
          'GP123!',
          'gp123',
          'provincial123',
          'Provincial123!',
          'membership123',
          'Membership123!'
        ];

        console.log('Trying common passwords...');
        let found = false;
        for (const pwd of commonPasswords) {
          const isValidCommon = await bcrypt.compare(pwd, user.password);
          if (isValidCommon) {
            console.log(`✅ Correct password found: "${pwd}"`);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log('❌ None of the common passwords worked');
          console.log('Password hash:', user.password.substring(0, 20) + '...');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkGautengUser();
