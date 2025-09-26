const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function debugAuthentication() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check the user we created
    console.log('\n🔍 Checking super admin user...');
    const [users] = await connection.query(`
      SELECT 
        u.id, u.name, u.email, u.password, u.role_id, u.admin_level, 
        u.is_active, u.mfa_enabled, u.created_at,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'admin@membership.org'
    `);
    
    if (users.length === 0) {
      console.log('❌ Super admin user not found');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role ID: ${user.role_id}`);
    console.log(`   Role Name: ${user.role_name}`);
    console.log(`   Admin Level: ${user.admin_level}`);
    console.log(`   Is Active: ${user.is_active}`);
    console.log(`   MFA Enabled: ${user.mfa_enabled}`);
    console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
    
    // Test password verification
    console.log('\n🔐 Testing password verification...');
    const testPassword = 'Admin123!';
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    console.log(`   Password "${testPassword}" is valid: ${isValidPassword}`);
    
    // Check if the user has the expected structure for authentication
    console.log('\n🔍 Checking user structure for authentication...');
    
    // The UserModel.authenticateUser expects certain fields
    const expectedFields = [
      'id', 'name', 'email', 'password', 'role_id', 'admin_level', 
      'is_active', 'mfa_enabled', 'failed_login_attempts', 'locked_until'
    ];
    
    const [userWithAllFields] = await connection.query(`
      SELECT 
        id, name, email, password, role_id, admin_level, is_active, 
        mfa_enabled, failed_login_attempts, locked_until, last_login_at,
        province_code, district_code, municipal_code, ward_code
      FROM users 
      WHERE email = 'admin@membership.org'
    `);
    
    if (userWithAllFields.length > 0) {
      const fullUser = userWithAllFields[0];
      console.log('✅ User with all fields:');
      console.log(`   Failed Login Attempts: ${fullUser.failed_login_attempts}`);
      console.log(`   Locked Until: ${fullUser.locked_until}`);
      console.log(`   Last Login: ${fullUser.last_login_at}`);
      
      // Check if account is locked
      if (fullUser.locked_until && new Date(fullUser.locked_until) > new Date()) {
        console.log('⚠️  Account is currently locked');
      } else {
        console.log('✅ Account is not locked');
      }
    }
    
    // Test the authentication query that the UserModel uses
    console.log('\n🔍 Testing authentication query...');
    const [authTest] = await connection.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.password,
        u.role_id,
        u.admin_level,
        u.province_code,
        u.district_code,
        u.municipal_code,
        u.ward_code,
        u.member_id,
        u.is_active,
        u.mfa_enabled,
        u.failed_login_attempts,
        u.locked_until,
        u.last_login_at as last_login,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = TRUE
    `, ['admin@membership.org']);
    
    if (authTest.length > 0) {
      console.log('✅ Authentication query successful');
      const authUser = authTest[0];
      console.log('   User data for authentication:');
      console.log(`   - ID: ${authUser.id}`);
      console.log(`   - Name: ${authUser.name}`);
      console.log(`   - Email: ${authUser.email}`);
      console.log(`   - Role Name: ${authUser.role_name}`);
      console.log(`   - Admin Level: ${authUser.admin_level}`);
      console.log(`   - Is Active: ${authUser.is_active}`);
      console.log(`   - MFA Enabled: ${authUser.mfa_enabled}`);
      
      // Test password comparison
      const passwordMatch = await bcrypt.compare('Admin123!', authUser.password);
      console.log(`   - Password Match: ${passwordMatch}`);
      
      if (passwordMatch) {
        console.log('✅ Authentication should work!');
      } else {
        console.log('❌ Password does not match');
      }
    } else {
      console.log('❌ Authentication query failed - user not found or inactive');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugAuthentication();
