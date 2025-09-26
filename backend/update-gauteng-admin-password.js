#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updateGautengAdminPassword() {
  let connection;
  try {
    console.log('🔐 Updating Gauteng Admin Password...\n');
    
    // New secure password
    const newPassword = 'GautengAdmin2024!';
    console.log('New password:', newPassword);
    
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('Password hashed successfully');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Database connected');
    
    // Update the user password
    const [result] = await connection.execute(`
      UPDATE users 
      SET password = ?, 
          updated_at = NOW(),
          failed_login_attempts = 0
      WHERE email = 'gauteng.admin@membership.org'
    `, [hashedPassword]);
    
    if (result.affectedRows > 0) {
      console.log('✅ Password updated successfully');
      
      // Verify the user exists and get details
      const [user] = await connection.execute(`
        SELECT 
          id, name, email, admin_level, province_code, 
          is_active, role_id, created_at
        FROM users 
        WHERE email = 'gauteng.admin@membership.org'
      `, []);
      
      if (user.length > 0) {
        console.log('\n👤 User Details:');
        console.log('- ID:', user[0].id);
        console.log('- Name:', user[0].name);
        console.log('- Email:', user[0].email);
        console.log('- Admin Level:', user[0].admin_level);
        console.log('- Province Code:', user[0].province_code);
        console.log('- Is Active:', user[0].is_active);
        console.log('- Role ID:', user[0].role_id);
        console.log('- Created:', user[0].created_at);
        
        // Test password verification
        const isValid = await bcrypt.compare(newPassword, hashedPassword);
        console.log('\n🔍 Password Verification Test:', isValid ? '✅ PASS' : '❌ FAIL');
        
        console.log('\n🎯 Login Credentials:');
        console.log('Email: gauteng.admin@membership.org');
        console.log('Password: GautengAdmin2024!');
        
      } else {
        console.log('❌ User not found after update');
      }
    } else {
      console.log('❌ No user found with email: gauteng.admin@membership.org');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateGautengAdminPassword();
