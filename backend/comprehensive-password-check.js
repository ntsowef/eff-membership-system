#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function comprehensivePasswordCheck() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });
    
    console.log('🔍 Comprehensive Password Check for All Users...\n');
    
    // Get all users with their password hashes
    const [users] = await connection.execute(`
      SELECT id, name, email, password, admin_level, is_active, created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 Found ${users.length} users in database:`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'} (${user.email})`);
      console.log(`   Admin Level: ${user.admin_level || 'None'}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Password Hash: ${user.password ? user.password.substring(0, 30) + '...' : 'No password'}`);
      console.log('   ' + '-'.repeat(60));
    });
    
    console.log('\n🔐 Testing extensive list of common passwords...');
    
    // Comprehensive list of common passwords to test
    const commonPasswords = [
      // Basic passwords
      'admin123', 'password', '123456', 'admin', 'test123',
      'password123', 'admin123!', 'Password123', 'Password123!',
      
      // System/app specific
      'membership123', 'system123', 'default123', 'user123',
      'geomaps123', 'membership', 'system', 'default',
      
      // Common variations
      'Admin123', 'Admin123!', 'PASSWORD', 'ADMIN123',
      'qwerty', 'qwerty123', '12345678', 'password1',
      
      // Date-based
      '2024', '2023', '2024123', '123456789',
      
      // Simple patterns
      'abc123', '111111', '000000', 'test',
      'demo', 'guest', 'root', 'toor',
      
      // Organization specific
      'anc123', 'ANC123', 'party123', 'member123',
      'ward123', 'province123', 'national123',
      
      // Email-based (using parts of email addresses)
      'patrick123', 'tshehla123', 'frans123', 'gauteng123',
      'patt123', 'mokoena123', 'ntsowe123',
      
      // Common South African
      'sa123', 'southafrica', 'mzansi123', 'ubuntu123'
    ];
    
    console.log(`Testing ${commonPasswords.length} different passwords against each user...\n`);
    
    const foundPasswords = [];
    
    for (const user of users) {
      if (!user.password) {
        console.log(`⚠️  ${user.email} has no password set`);
        continue;
      }
      
      console.log(`👤 Testing passwords for: ${user.name} (${user.email})`);
      let passwordFound = false;
      
      for (const testPassword of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`   ✅ FOUND: Password is "${testPassword}"`);
            foundPasswords.push({
              user: user.name,
              email: user.email,
              password: testPassword,
              admin_level: user.admin_level
            });
            passwordFound = true;
            
            // Test API login
            console.log(`   🔍 Testing API login...`);
            try {
              const axios = require('axios');
              const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
                email: user.email,
                password: testPassword
              });
              console.log(`   ✅ API login successful! Token received.`);
            } catch (apiError) {
              console.log(`   ❌ API login failed: ${apiError.response?.data?.message || apiError.message}`);
            }
            break;
          }
        } catch (error) {
          // Skip bcrypt errors for invalid hashes
        }
      }
      
      if (!passwordFound) {
        console.log(`   ❌ No common password found for ${user.email}`);
      }
      console.log('');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY OF FOUND PASSWORDS:');
    console.log('='.repeat(80));
    
    if (foundPasswords.length > 0) {
      foundPasswords.forEach((found, index) => {
        console.log(`${index + 1}. ${found.user} (${found.email})`);
        console.log(`   Password: "${found.password}"`);
        console.log(`   Admin Level: ${found.admin_level}`);
        console.log('');
      });
      
      console.log('🎯 QUICK LOGIN REFERENCE:');
      foundPasswords.forEach(found => {
        console.log(`Email: ${found.email} | Password: ${found.password}`);
      });
    } else {
      console.log('❌ No passwords found from common password list.');
      console.log('\n💡 Suggestions:');
      console.log('1. Check if there are any seed scripts or documentation with default passwords');
      console.log('2. Look for password reset functionality');
      console.log('3. Check application logs for any password hints');
      console.log('4. Contact the system administrator for password reset');
    }
    
    // Check for any patterns in the hashes
    console.log('\n🔍 Password Hash Analysis:');
    const hashPatterns = {};
    users.forEach(user => {
      if (user.password) {
        const hashPrefix = user.password.substring(0, 7); // $2b$10$ or $2b$12$
        hashPatterns[hashPrefix] = (hashPatterns[hashPrefix] || 0) + 1;
      }
    });
    
    console.log('Hash patterns found:');
    Object.entries(hashPatterns).forEach(([pattern, count]) => {
      console.log(`- ${pattern}: ${count} users`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

comprehensivePasswordCheck();
