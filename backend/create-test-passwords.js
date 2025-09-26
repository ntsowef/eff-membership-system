#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestPasswords() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });
    
    console.log('🔧 Creating test passwords for all users...\n');
    
    // Get all users
    const [users] = await connection.execute(`
      SELECT id, name, email, admin_level, is_active
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 Found ${users.length} users. Setting test passwords...\n`);
    
    const testPassword = 'test123';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const updatedUsers = [];
    
    for (const user of users) {
      // Skip the user that already has a working password
      if (user.email === 'admin@membership.org') {
        console.log(`⏭️  Skipping ${user.email} (already has working password: admin123)`);
        updatedUsers.push({
          ...user,
          password: 'admin123',
          status: 'Already working'
        });
        continue;
      }
      
      try {
        await connection.execute(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        
        console.log(`✅ Updated password for ${user.name} (${user.email})`);
        updatedUsers.push({
          ...user,
          password: testPassword,
          status: 'Updated'
        });
      } catch (error) {
        console.log(`❌ Failed to update ${user.email}: ${error.message}`);
        updatedUsers.push({
          ...user,
          password: 'Failed to update',
          status: 'Error'
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETE USER CREDENTIALS LIST:');
    console.log('='.repeat(80));
    
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Admin Level: ${user.admin_level || 'None'}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log('   ' + '-'.repeat(60));
    });
    
    console.log('\n🎯 QUICK REFERENCE FOR LOGIN TESTING:');
    console.log('='.repeat(50));
    updatedUsers.forEach(user => {
      if (user.status !== 'Error') {
        console.log(`${user.email} | ${user.password}`);
      }
    });
    
    console.log('\n🧪 Testing all updated passwords...');
    
    for (const user of updatedUsers) {
      if (user.status === 'Error') continue;
      
      console.log(`\n👤 Testing login for: ${user.email}`);
      try {
        const axios = require('axios');
        const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
          email: user.email,
          password: user.password
        });
        console.log(`   ✅ Login successful! Token received.`);
        console.log(`   📋 User role: ${response.data.user?.admin_level || 'Unknown'}`);
      } catch (apiError) {
        console.log(`   ❌ Login failed: ${apiError.response?.data?.message || apiError.message}`);
      }
    }
    
    console.log('\n🎉 Password setup complete!');
    console.log('\n📝 Summary:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Successfully updated: ${updatedUsers.filter(u => u.status === 'Updated').length}`);
    console.log(`- Already working: ${updatedUsers.filter(u => u.status === 'Already working').length}`);
    console.log(`- Errors: ${updatedUsers.filter(u => u.status === 'Error').length}`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

createTestPasswords();
