#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkUserTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_new'
    });

    console.log('🔍 Checking users table structure...\n');

    // Check table structure
    const [structure] = await connection.execute('DESCRIBE users');
    console.log('📋 Users table structure:');
    console.table(structure);

    // Check existing data
    const [users] = await connection.execute('SELECT * FROM users LIMIT 10');
    console.log('\n📋 Existing users:');
    console.table(users);
    
    // Check if we need to add admin-related columns
    const hasAdminLevel = structure.some(col => col.Field === 'admin_level');
    const hasProvinceCode = structure.some(col => col.Field === 'province_code');
    const hasIsActive = structure.some(col => col.Field === 'is_active');
    
    console.log('\n📊 Column analysis:');
    console.log('  - Has admin_level:', hasAdminLevel);
    console.log('  - Has province_code:', hasProvinceCode);
    console.log('  - Has is_active:', hasIsActive);
    
    // If we need to add columns, let's add them
    if (!hasAdminLevel) {
      console.log('\n🔧 Adding admin_level column...');
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN admin_level ENUM('national', 'province', 'district', 'municipality', 'ward') NULL
      `);
      console.log('✅ Added admin_level column');
    }

    if (!hasProvinceCode) {
      console.log('\n🔧 Adding geographic columns...');
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN province_code VARCHAR(10) NULL,
        ADD COLUMN district_code VARCHAR(10) NULL,
        ADD COLUMN municipal_code VARCHAR(10) NULL,
        ADD COLUMN ward_code VARCHAR(10) NULL
      `);
      console.log('✅ Added geographic columns');
    }

    if (!hasIsActive) {
      console.log('\n🔧 Adding is_active column...');
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ Added is_active column');
    }
    
    // Create some test admin users if none exist
    const [adminCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM users WHERE admin_level IS NOT NULL
    `);

    if (adminCount[0].count === 0) {
      console.log('\n🔧 Creating test admin users...');

      // Create national admin
      await connection.execute(`
        INSERT INTO users (name, email, password, admin_level, is_active, created_at)
        VALUES (?, ?, ?, 'national', TRUE, NOW())
      `, ['System Administrator', 'admin@eff.org.za', '$2b$12$LQv3c1yqBwEHxE03urcAWOVHjmVBB59n2rw0gvpQ/GlDHDuxg.LQy']); // password: admin123

      // Create provincial admin
      await connection.execute(`
        INSERT INTO users (name, email, password, admin_level, province_code, is_active, created_at)
        VALUES (?, ?, ?, 'province', 'GP', TRUE, NOW())
      `, ['Gauteng Provincial Admin', 'gauteng@eff.org.za', '$2b$12$LQv3c1yqBwEHxE03urcAWOVHjmVBB59n2rw0gvpQ/GlDHDuxg.LQy']);

      // Create municipal admin
      await connection.execute(`
        INSERT INTO users (name, email, password, admin_level, province_code, municipal_code, is_active, created_at)
        VALUES (?, ?, ?, 'municipality', 'LP', 'LIM362', TRUE, NOW())
      `, ['Limpopo Municipal Admin', 'limpopo@eff.org.za', '$2b$12$LQv3c1yqBwEHxE03urcAWOVHjmVBB59n2rw0gvpQ/GlDHDuxg.LQy']);

      console.log('✅ Created test admin users');
    }

    // Show final user data
    const [finalUsers] = await connection.execute(`
      SELECT id, name, email, admin_level, province_code, municipal_code, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    console.log('\n📋 Final user data:');
    console.table(finalUsers);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

checkUserTable();
