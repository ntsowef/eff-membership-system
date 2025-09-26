const { executeQuery } = require('./backend/src/config/database');

async function checkUserDetails() {
  console.log('🔍 Checking user details for admin@membership.org...\n');
  
  try {
    // Check the specific user
    const [users] = await executeQuery(`
      SELECT 
        id, name, email, password, admin_level, is_active, role_id,
        province_code, district_code, municipal_code, ward_code,
        mfa_enabled, failed_login_attempts, created_at
      FROM users 
      WHERE email = ?
    `, ['admin@membership.org']);
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('📋 User Details:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Password Hash:', user.password ? 'Present' : 'Missing');
    console.log('   Admin Level:', user.admin_level);
    console.log('   Is Active:', user.is_active);
    console.log('   Role ID:', user.role_id);
    console.log('   MFA Enabled:', user.mfa_enabled);
    console.log('   Failed Login Attempts:', user.failed_login_attempts);
    console.log('   Created At:', user.created_at);
    
    // Check roles table
    console.log('\n🔍 Checking roles...');
    const [roles] = await executeQuery('SELECT * FROM roles');
    console.log('📋 Available Roles:');
    roles.forEach(role => {
      console.log(`   ${role.id}: ${role.name} (${role.admin_level})`);
    });
    
    // Test the exact query from auth middleware
    console.log('\n🔍 Testing auth middleware query...');
    const [authUsers] = await executeQuery(`
      SELECT
        u.id, u.name, u.email, u.password, u.admin_level, u.is_active,
        u.province_code, u.district_code, u.municipal_code, u.ward_code,
        u.mfa_enabled, u.failed_login_attempts,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.is_active = TRUE
    `, ['admin@membership.org']);
    
    console.log('📋 Auth Query Result:');
    if (authUsers.length === 0) {
      console.log('❌ No users found with is_active = TRUE');
      
      // Try without the is_active filter
      const [allUsers] = await executeQuery(`
        SELECT
          u.id, u.name, u.email, u.password, u.admin_level, u.is_active,
          u.province_code, u.district_code, u.municipal_code, u.ward_code,
          u.mfa_enabled, u.failed_login_attempts,
          r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
      `, ['admin@membership.org']);
      
      console.log('📋 Query without is_active filter:');
      if (allUsers.length > 0) {
        console.log('✅ User found:', allUsers[0].name);
        console.log('   is_active value:', allUsers[0].is_active);
      } else {
        console.log('❌ User not found even without is_active filter');
      }
    } else {
      console.log('✅ User found:', authUsers[0].name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserDetails();
