const mysql = require('mysql2/promise');

async function fixApproverPermissions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Fixing membership approver permissions...\n');

    // Check current user and role
    const [users] = await connection.execute(`
      SELECT u.id, u.email, u.name, r.name as role_name, u.role_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'membership.approver@test.com'
    `);

    const user = users[0];
    console.log('👤 User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role_name,
      role_id: user.role_id
    });

    // Check current permissions for the role
    console.log('\n📋 Current permissions for membership_approver role:');
    const [currentPermissions] = await connection.execute(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [user.role_id]);

    if (currentPermissions.length > 0) {
      currentPermissions.forEach(perm => {
        console.log(`  ✅ ${perm.name} - ${perm.description || 'No description'}`);
      });
    } else {
      console.log('  ❌ No permissions found for this role');
    }

    // Required permissions for applications
    const requiredPermissions = [
      { name: 'applications.read', description: 'Read applications' },
      { name: 'applications.view', description: 'View applications' },
      { name: 'applications.list', description: 'List applications' },
      { name: 'applications.approve', description: 'Approve applications' },
      { name: 'applications.reject', description: 'Reject applications' },
      { name: 'applications.update', description: 'Update applications' }
    ];

    console.log('\n🔧 Adding missing permissions...');

    for (const requiredPerm of requiredPermissions) {
      // Check if permission exists
      const [permissions] = await connection.execute(`
        SELECT id FROM permissions WHERE name = ?
      `, [requiredPerm.name]);

      let permissionId;
      if (permissions.length === 0) {
        console.log(`📝 Creating permission: ${requiredPerm.name}`);
        const [result] = await connection.execute(`
          INSERT INTO permissions (name, description, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `, [requiredPerm.name, requiredPerm.description]);
        permissionId = result.insertId;
      } else {
        permissionId = permissions[0].id;
      }

      // Check if role has this permission
      const [rolePermissions] = await connection.execute(`
        SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
      `, [user.role_id, permissionId]);

      if (rolePermissions.length === 0) {
        console.log(`📝 Assigning permission ${requiredPerm.name} to membership_approver role`);
        await connection.execute(`
          INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `, [user.role_id, permissionId]);
        console.log(`✅ Assigned ${requiredPerm.name}`);
      } else {
        console.log(`✅ Already has ${requiredPerm.name}`);
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
    `, [user.role_id]);

    finalPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name} - ${perm.description || 'No description'}`);
    });

    // Test the specific permission that's failing
    console.log('\n🧪 Testing applications.read permission...');
    const [testPerm] = await connection.execute(`
      SELECT COUNT(*) as has_permission
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.name = 'applications.read'
    `, [user.role_id]);

    if (testPerm[0].has_permission > 0) {
      console.log('✅ User has applications.read permission');
    } else {
      console.log('❌ User does NOT have applications.read permission');
    }

    await connection.end();
    console.log('\n🎉 Permissions setup complete!');
    console.log('🔄 Please refresh your browser and try logging in again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixApproverPermissions();
