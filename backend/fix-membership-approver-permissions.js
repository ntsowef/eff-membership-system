const mysql = require('mysql2/promise');

async function fixMembershipApproverPermissions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking membership approver permissions...\n');

    // Check current user and role
    const [users] = await connection.execute(`
      SELECT u.id, u.email, u.first_name, u.last_name, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'membership.approver@test.com'
    `);

    if (users.length === 0) {
      console.log('❌ Membership approver user not found');
      await connection.end();
      return;
    }

    const user = users[0];
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role_name
    });

    // Check if membership_approver role exists
    const [roles] = await connection.execute(`
      SELECT id, name FROM roles WHERE name = 'membership_approver'
    `);

    let roleId;
    if (roles.length === 0) {
      console.log('📝 Creating membership_approver role...');
      const [result] = await connection.execute(`
        INSERT INTO roles (name, description, created_at, updated_at)
        VALUES ('membership_approver', 'Membership Approver - Can approve/reject membership applications', NOW(), NOW())
      `);
      roleId = result.insertId;
      console.log('✅ Created membership_approver role with ID:', roleId);
    } else {
      roleId = roles[0].id;
      console.log('✅ Found membership_approver role with ID:', roleId);
    }

    // Update user's role if needed
    if (user.role_name !== 'membership_approver') {
      console.log('📝 Updating user role...');
      await connection.execute(`
        UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ?
      `, [roleId, user.id]);
      console.log('✅ Updated user role to membership_approver');
    }

    // Check required permissions
    const requiredPermissions = [
      'applications.read',
      'applications.view',
      'applications.approve',
      'applications.reject',
      'applications.update',
      'applications.list'
    ];

    console.log('\n🔍 Checking permissions...');

    for (const permissionName of requiredPermissions) {
      // Check if permission exists
      const [permissions] = await connection.execute(`
        SELECT id FROM permissions WHERE name = ?
      `, [permissionName]);

      let permissionId;
      if (permissions.length === 0) {
        console.log(`📝 Creating permission: ${permissionName}`);
        const [result] = await connection.execute(`
          INSERT INTO permissions (name, description, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `, [permissionName, `Permission to ${permissionName.replace('.', ' ')}`]);
        permissionId = result.insertId;
      } else {
        permissionId = permissions[0].id;
      }

      // Check if role has this permission
      const [rolePermissions] = await connection.execute(`
        SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
      `, [roleId, permissionId]);

      if (rolePermissions.length === 0) {
        console.log(`📝 Assigning permission ${permissionName} to membership_approver role`);
        await connection.execute(`
          INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `, [roleId, permissionId]);
        console.log(`✅ Assigned ${permissionName}`);
      } else {
        console.log(`✅ Already has ${permissionName}`);
      }
    }

    // Verify final permissions
    console.log('\n📊 Final permissions for membership_approver role:');
    const [finalPermissions] = await connection.execute(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [roleId]);

    finalPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name} - ${perm.description}`);
    });

    await connection.end();
    console.log('\n🎉 Membership approver permissions fixed!');
    console.log('🔄 Please refresh your browser and try again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixMembershipApproverPermissions();
