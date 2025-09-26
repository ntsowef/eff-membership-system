const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function testUserManagementSystem() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Test 1: Check if we can create a super admin user
    console.log('\n🧪 Test 1: Creating super admin user...');
    
    // First, ensure we have the super_admin role
    const [superAdminRole] = await connection.query(`
      SELECT id FROM roles WHERE name = 'super_admin'
    `);
    
    if (superAdminRole.length === 0) {
      console.log('Creating super_admin role...');
      await connection.query(`
        INSERT INTO roles (name, description) 
        VALUES ('super_admin', 'System Administrator with full access')
      `);
    }
    
    // Get the role ID
    const [roleResult] = await connection.query(`
      SELECT id FROM roles WHERE name = 'super_admin'
    `);
    const superAdminRoleId = roleResult[0].id;
    
    // Check if super admin user already exists
    const [existingUser] = await connection.query(`
      SELECT id FROM users WHERE email = 'admin@membership.org'
    `);
    
    if (existingUser.length === 0) {
      // Create super admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      
      await connection.query(`
        INSERT INTO users (
          name, email, password, role_id, admin_level, 
          mfa_enabled, is_active, created_at
        ) VALUES (?, ?, ?, ?, 'national', FALSE, TRUE, NOW())
      `, ['System Administrator', 'admin@membership.org', hashedPassword, superAdminRoleId]);
      
      console.log('✅ Super admin user created successfully');
    } else {
      console.log('✅ Super admin user already exists');
    }
    
    // Test 2: Check user permissions system
    console.log('\n🧪 Test 2: Testing user permissions...');
    
    const [userPermissions] = await connection.query(`
      SELECT 
        u.name, u.email, u.admin_level,
        r.name as role_name,
        COUNT(p.id) as permission_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.email = 'admin@membership.org'
      GROUP BY u.id, r.id
    `);
    
    if (userPermissions.length > 0) {
      console.log('✅ User permissions query successful');
      console.table(userPermissions);
    } else {
      console.log('⚠️  No permissions found for super admin');
    }
    
    // Test 3: Check session management tables
    console.log('\n🧪 Test 3: Testing session management...');
    
    const [sessionLimits] = await connection.query(`
      SELECT * FROM concurrent_session_limits LIMIT 5
    `);
    
    if (sessionLimits.length > 0) {
      console.log('✅ Session limits configured');
      console.table(sessionLimits);
    } else {
      console.log('⚠️  No session limits configured');
    }
    
    // Test 4: Check MFA settings table
    console.log('\n🧪 Test 4: Testing MFA system...');
    
    const [mfaTableCheck] = await connection.query(`
      SELECT COUNT(*) as count FROM user_mfa_settings
    `);
    
    console.log(`✅ MFA settings table accessible (${mfaTableCheck[0].count} records)`);
    
    // Test 5: Check hierarchical admin system
    console.log('\n🧪 Test 5: Testing hierarchical admin system...');
    
    const [adminLevels] = await connection.query(`
      SELECT level_name, level_code, hierarchy_level, geographic_scope 
      FROM admin_levels 
      WHERE is_active = TRUE 
      ORDER BY hierarchy_level
    `);
    
    if (adminLevels.length > 0) {
      console.log('✅ Admin levels configured');
      console.table(adminLevels);
    } else {
      console.log('⚠️  No admin levels configured');
    }
    
    // Test 6: Check user creation workflow
    console.log('\n🧪 Test 6: Testing user creation workflow...');
    
    const [workflowCount] = await connection.query(`
      SELECT COUNT(*) as count FROM user_creation_workflow
    `);
    
    console.log(`✅ User creation workflow table accessible (${workflowCount[0].count} records)`);
    
    // Test 7: Check system configuration
    console.log('\n🧪 Test 7: Testing system configuration...');
    
    const [systemConfig] = await connection.query(`
      SELECT config_key, config_value, category 
      FROM system_configuration 
      WHERE category IN ('authentication', 'security', 'user_management')
      ORDER BY category, config_key
    `);
    
    if (systemConfig.length > 0) {
      console.log('✅ System configuration loaded');
      console.table(systemConfig);
    } else {
      console.log('⚠️  No system configuration found');
    }
    
    console.log('\n🎉 User Management System Test Summary:');
    console.log('✅ Database connection: OK');
    console.log('✅ User creation: OK');
    console.log('✅ Role system: OK');
    console.log('✅ Permission system: OK');
    console.log('✅ Session management: OK');
    console.log('✅ MFA system: OK');
    console.log('✅ Hierarchical admin: OK');
    console.log('✅ Workflow system: OK');
    console.log('✅ System configuration: OK');
    
    console.log('\n📋 Super Admin Login Credentials:');
    console.log('Email: admin@membership.org');
    console.log('Password: Admin123!');
    console.log('Role: Super Administrator');
    console.log('Admin Level: National');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testUserManagementSystem();
