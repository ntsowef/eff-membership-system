const { executeQuery } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function fixDemoUsers() {
  console.log('🔧 Fixing demo users for login system...\n');
  
  try {
    // First, check current user status
    console.log('1. Checking current user status...');
    const [users] = await executeQuery(`
      SELECT id, name, email, is_active, admin_level, password 
      FROM users 
      WHERE email IN ('admin@membership.org', 'gauteng.admin@membership.org')
    `);
    
    console.log('📋 Current users:');
    users.forEach(user => {
      console.log(`   ${user.email}: is_active=${user.is_active}, admin_level=${user.admin_level}, password=${user.password ? 'Present' : 'Missing'}`);
    });
    
    // Update users to be active and ensure they have proper passwords
    console.log('\n2. Updating users to be active...');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const provAdminPassword = await bcrypt.hash('ProvAdmin123!', 10);
    
    // Update admin@membership.org
    await executeQuery(`
      UPDATE users 
      SET 
        is_active = 1,
        admin_level = 'national',
        password = ?,
        name = 'Super Administrator'
      WHERE email = 'admin@membership.org'
    `, [adminPassword]);
    
    // Update gauteng.admin@membership.org
    await executeQuery(`
      UPDATE users 
      SET 
        is_active = 1,
        admin_level = 'province',
        province_code = 'GP',
        password = ?,
        name = 'Gauteng Administrator'
      WHERE email = 'gauteng.admin@membership.org'
    `, [provAdminPassword]);
    
    console.log('✅ Users updated successfully');
    
    // Verify the updates
    console.log('\n3. Verifying updates...');
    const [updatedUsers] = await executeQuery(`
      SELECT id, name, email, is_active, admin_level, province_code
      FROM users 
      WHERE email IN ('admin@membership.org', 'gauteng.admin@membership.org')
    `);
    
    console.log('📋 Updated users:');
    updatedUsers.forEach(user => {
      console.log(`   ${user.email}: is_active=${user.is_active}, admin_level=${user.admin_level}, province=${user.province_code || 'N/A'}`);
    });
    
    // Test the auth query
    console.log('\n4. Testing auth middleware query...');
    const [authTest] = await executeQuery(`
      SELECT
        u.id, u.name, u.email, u.admin_level, u.is_active,
        u.province_code, u.district_code, u.municipal_code, u.ward_code,
        u.mfa_enabled, u.failed_login_attempts,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = TRUE
    `, ['admin@membership.org']);
    
    if (authTest.length > 0) {
      console.log('✅ Auth query successful - user found:', authTest[0].name);
    } else {
      console.log('❌ Auth query failed - user not found');
    }
    
    console.log('\n🎉 Demo users are now ready for login!');
    console.log('📋 Demo Credentials:');
    console.log('   Super Admin: admin@membership.org / Admin123!');
    console.log('   Province Admin: gauteng.admin@membership.org / ProvAdmin123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixDemoUsers();
