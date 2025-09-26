const mysql = require('mysql2/promise');

async function debugUserRole() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Debugging membership approver user role...\n');

    // Get detailed user information
    const [users] = await connection.execute(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role_id,
        r.name as role_name,
        u.admin_level,
        u.is_active,
        u.account_locked
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'membership.approver@test.com'
    `);

    if (users.length === 0) {
      console.log('❌ User not found');
      await connection.end();
      return;
    }

    const user = users[0];
    console.log('👤 User Details:');
    console.log(`  • ID: ${user.id}`);
    console.log(`  • Name: ${user.name}`);
    console.log(`  • Email: ${user.email}`);
    console.log(`  • Role ID: ${user.role_id}`);
    console.log(`  • Role Name: "${user.role_name}"`);
    console.log(`  • Admin Level: ${user.admin_level}`);
    console.log(`  • Is Active: ${user.is_active}`);
    console.log(`  • Account Locked: ${user.account_locked}`);

    // Check if role name matches exactly what the authorize middleware expects
    const expectedRoles = ['financial_reviewer', 'membership_approver', 'super_admin'];
    const roleMatches = expectedRoles.includes(user.role_name);
    console.log(`\n🔍 Role Authorization Check:`);
    console.log(`  • Expected roles: ${expectedRoles.join(', ')}`);
    console.log(`  • User role: "${user.role_name}"`);
    console.log(`  • Role matches: ${roleMatches ? '✅ YES' : '❌ NO'}`);

    // Check all permissions for this role
    console.log(`\n📋 All permissions for role "${user.role_name}":`);
    const [permissions] = await connection.execute(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [user.role_id]);

    if (permissions.length > 0) {
      permissions.forEach(perm => {
        console.log(`  • ${perm.name}`);
      });
    } else {
      console.log('  ❌ No permissions found');
    }

    // Check specific applications.read permission
    const [appReadPerm] = await connection.execute(`
      SELECT COUNT(*) as has_permission
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.name = 'applications.read'
    `, [user.role_id]);

    console.log(`\n🔍 Specific Permission Check:`);
    console.log(`  • applications.read: ${appReadPerm[0].has_permission > 0 ? '✅ HAS' : '❌ MISSING'}`);

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUserRole();
