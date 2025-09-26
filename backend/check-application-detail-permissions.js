const mysql = require('mysql2/promise');

async function checkApplicationDetailPermissions() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking application detail permissions...\n');

    const roleId = 45; // membership_approver role ID

    // Check all current permissions for the role
    console.log('📋 Current permissions for membership_approver role:');
    const [currentPermissions] = await connection.execute(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [roleId]);

    currentPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name} - ${perm.description || 'No description'}`);
    });

    // Add missing permissions that might be needed for application details
    const additionalPermissions = [
      { name: 'applications.view', description: 'View individual application details' },
      { name: 'applications.show', description: 'Show application details' },
      { name: 'applications.detail', description: 'Access application detail page' },
      { name: 'applications.manage', description: 'Manage applications' }
    ];

    console.log('\n🔧 Adding potentially missing permissions...');

    for (const requiredPerm of additionalPermissions) {
      // Check if permission exists
      const [permissions] = await connection.execute(`
        SELECT id FROM permissions WHERE name = ?
      `, [requiredPerm.name]);

      let permissionId;
      if (permissions.length === 0) {
        console.log(`📝 Creating permission: ${requiredPerm.name}`);
        const [result] = await connection.execute(`
          INSERT INTO permissions (name, description) VALUES (?, ?)
        `, [requiredPerm.name, requiredPerm.description]);
        permissionId = result.insertId;
      } else {
        permissionId = permissions[0].id;
      }

      // Check if role has this permission
      const [rolePermissions] = await connection.execute(`
        SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
      `, [roleId, permissionId]);

      if (rolePermissions.length === 0) {
        console.log(`📝 Assigning permission ${requiredPerm.name} to membership_approver role`);
        await connection.execute(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
        `, [roleId, permissionId]);
        console.log(`✅ Assigned ${requiredPerm.name}`);
      } else {
        console.log(`✅ Already has ${requiredPerm.name}`);
      }
    }

    // Verify final permissions
    console.log('\n📊 Final application-related permissions:');
    const [finalPermissions] = await connection.execute(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.name LIKE 'applications.%'
      ORDER BY p.name
    `, [roleId]);

    finalPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name} - ${perm.description || 'No description'}`);
    });

    await connection.end();
    console.log('\n🎉 Application detail permissions setup complete!');
    console.log('🔄 Please refresh your browser and try accessing the application detail again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkApplicationDetailPermissions();
