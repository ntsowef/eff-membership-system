#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    console.log('🔍 Checking users in database...\n');
    
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        email, 
        name, 
        admin_level, 
        province_code, 
        district_code, 
        municipal_code,
        ward_code,
        is_active 
      FROM users 
      ORDER BY admin_level, email
    `);
    
    console.log('📋 Users in database:');
    console.table(rows);
    
    // Check for provincial admins specifically
    const [provincialAdmins] = await connection.execute(`
      SELECT * FROM users WHERE admin_level = 'province'
    `);
    
    console.log('\n🏛️ Provincial Admin Users:');
    if (provincialAdmins.length === 0) {
      console.log('❌ No provincial admin users found!');
      console.log('💡 You need to create a provincial admin user or update an existing user.');
    } else {
      console.table(provincialAdmins);
    }
    
    // Check provinces table
    const [provinces] = await connection.execute(`
      SELECT id, province_name FROM provinces ORDER BY province_name
    `);
    
    console.log('\n🗺️ Available Provinces:');
    console.table(provinces);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers();
