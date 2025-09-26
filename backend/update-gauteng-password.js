#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updateGautengPassword() {
  let connection;
  try {
    console.log('🔐 Updating Gauteng admin password...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    // Create a new password hash
    const newPassword = 'Gauteng123!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`New password: ${newPassword}`);
    console.log(`Password hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update the user's password
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'gauteng.admin@membership.org']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Password updated successfully!');
      
      // Verify the password works
      const [users] = await connection.execute(
        'SELECT password FROM users WHERE email = ?',
        ['gauteng.admin@membership.org']
      );
      
      if (users.length > 0) {
        const isValid = await bcrypt.compare(newPassword, users[0].password);
        console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      }
    } else {
      console.log('❌ No user found to update');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateGautengPassword();
