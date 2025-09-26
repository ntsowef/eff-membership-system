const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function debugUserAuth() {
  let connection;
  
  try {
    console.log('🔍 Debugging User Authentication\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Check if user exists
    const [users] = await connection.query(`
      SELECT 
        u.id, u.name, u.email, u.password, u.admin_level, u.is_active,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, ['admin@membership.org']);
    
    if (users.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin Level: ${user.admin_level}`);
    console.log(`   Role: ${user.role_name}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
    
    // Test password verification
    const testPassword = 'Admin123!';
    console.log(`\n🔐 Testing password: ${testPassword}`);
    
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    console.log(`   Password valid: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('\n❌ Password verification failed!');
      console.log('   This might be the issue with authentication.');
      
      // Let's try to create a new hash and compare
      console.log('\n🔧 Creating new password hash for comparison...');
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log(`   New hash: ${newHash.substring(0, 20)}...`);
      
      const newHashValid = await bcrypt.compare(testPassword, newHash);
      console.log(`   New hash valid: ${newHashValid}`);
      
      // Update the user's password with the correct hash
      console.log('\n🔧 Updating user password with correct hash...');
      await connection.query(`
        UPDATE users SET password = ? WHERE email = ?
      `, [newHash, 'admin@membership.org']);
      console.log('✅ Password updated successfully');
      
      // Verify the update
      const [updatedUsers] = await connection.query(`
        SELECT password FROM users WHERE email = ?
      `, ['admin@membership.org']);
      
      const updatedUser = updatedUsers[0];
      const updatedPasswordValid = await bcrypt.compare(testPassword, updatedUser.password);
      console.log(`   Updated password valid: ${updatedPasswordValid}`);
    } else {
      console.log('✅ Password verification successful!');
    }
    
    // Check roles table
    console.log('\n📋 Checking roles table...');
    const [roles] = await connection.query('SELECT * FROM roles');
    console.log(`   Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
    });
    
    // Check if user has proper role assignment
    if (!user.role_name) {
      console.log('\n⚠️  User has no role assigned, fixing...');
      
      // Find super_admin role
      const [superAdminRole] = await connection.query(`
        SELECT id FROM roles WHERE name = 'super_admin'
      `);
      
      if (superAdminRole.length > 0) {
        await connection.query(`
          UPDATE users SET role_id = ? WHERE email = ?
        `, [superAdminRole[0].id, 'admin@membership.org']);
        console.log('✅ Super admin role assigned');
      } else {
        console.log('❌ Super admin role not found');
      }
    }
    
    console.log('\n🎉 User authentication debugging complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugUserAuth();
