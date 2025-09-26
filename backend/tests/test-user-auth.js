const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testUserAuth() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Testing user authentication for financial.reviewer@test.com...');

    // Test the exact query used by the backend
    const [users] = await connection.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.password_changed_at,
        u.role_id,
        u.email_verified_at,
        u.remember_token,
        u.password_reset_token,
        u.password_reset_expires,
        u.failed_login_attempts,
        u.locked_until,
        u.locked_at,
        u.mfa_enabled,
        u.mfa_secret,
        u.member_id,
        u.admin_level,
        u.province_code,
        u.district_code,
        u.municipal_code,
        u.ward_code,
        u.is_active,
        u.account_locked,
        u.last_login_at,
        u.last_login_ip,
        u.created_at,
        u.updated_at,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, ['financial.reviewer@test.com']);

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log('\n📋 Raw Database User Data:');
    console.log('ID:', user.id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role ID:', user.role_id);
    console.log('Role Name:', user.role_name);
    console.log('Admin Level:', user.admin_level);
    console.log('Is Active:', user.is_active);
    console.log('Account Locked:', user.account_locked);

    // Test JWT token generation (simulate what happens during login)
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role_name: user.role_name,
      admin_level: user.admin_level
    };

    console.log('\n🔑 JWT Token Payload:');
    console.log(JSON.stringify(tokenPayload, null, 2));

    // Generate a test token (using a dummy secret)
    const testToken = jwt.sign(tokenPayload, 'test-secret', { expiresIn: '24h' });
    console.log('\n🎫 Generated Test Token:', testToken.substring(0, 50) + '...');

    // Decode the token to verify
    const decoded = jwt.decode(testToken);
    console.log('\n🔓 Decoded Token Data:');
    console.log(JSON.stringify(decoded, null, 2));

    // Check if there are any NULL values that might cause issues
    console.log('\n🔍 Null Value Check:');
    console.log('role_name is null:', user.role_name === null);
    console.log('role_name is undefined:', user.role_name === undefined);
    console.log('role_name is empty string:', user.role_name === '');
    console.log('role_name type:', typeof user.role_name);
    console.log('role_name value:', JSON.stringify(user.role_name));

    // Test the getUserById method simulation
    const [userById] = await connection.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.password_changed_at,
        u.role_id,
        u.email_verified_at,
        u.remember_token,
        u.password_reset_token,
        u.password_reset_expires,
        u.failed_login_attempts,
        u.locked_until,
        u.locked_at,
        u.mfa_enabled,
        u.mfa_secret,
        u.member_id,
        u.admin_level,
        u.province_code,
        u.district_code,
        u.municipal_code,
        u.ward_code,
        u.is_active,
        u.account_locked,
        u.last_login_at,
        u.last_login_ip,
        u.created_at,
        u.updated_at,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [user.id]);

    console.log('\n🆔 getUserById simulation result:');
    if (userById.length > 0) {
      console.log('Role Name from getUserById:', JSON.stringify(userById[0].role_name));
      console.log('Role ID from getUserById:', userById[0].role_id);
    }

    console.log('\n✅ User authentication test completed!');

  } catch (error) {
    console.error('❌ Error testing user auth:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testUserAuth();
