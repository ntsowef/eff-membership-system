const mysql = require('mysql2/promise');

async function addApplicationsReadPermission() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Adding applications.read permission...\n');

    // Get membership_approver role ID
    const roleId = 45; // We know this from the previous output

    // Check if applications.read permission exists
    const [permissions] = await connection.execute(`
      SELECT id FROM permissions WHERE name = 'applications.read'
    `);

    let permissionId;
    if (permissions.length === 0) {
      console.log('📝 Creating applications.read permission...');
      const [result] = await connection.execute(`
        INSERT INTO permissions (name, description) VALUES (?, ?)
      `, ['applications.read', 'Read applications']);
      permissionId = result.insertId;
      console.log('✅ Created applications.read permission with ID:', permissionId);
    } else {
      permissionId = permissions[0].id;
      console.log('✅ Found applications.read permission with ID:', permissionId);
    }

    // Check if role already has this permission
    const [rolePermissions] = await connection.execute(`
      SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
    `, [roleId, permissionId]);

    if (rolePermissions.length === 0) {
      console.log('📝 Assigning applications.read permission to membership_approver role...');
      await connection.execute(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
      `, [roleId, permissionId]);
      console.log('✅ Successfully assigned applications.read permission');
    } else {
      console.log('✅ Role already has applications.read permission');
    }

    // Also add applications.list permission just in case
    const [listPermissions] = await connection.execute(`
      SELECT id FROM permissions WHERE name = 'applications.list'
    `);

    let listPermissionId;
    if (listPermissions.length === 0) {
      console.log('📝 Creating applications.list permission...');
      const [result] = await connection.execute(`
        INSERT INTO permissions (name, description) VALUES (?, ?)
      `, ['applications.list', 'List applications']);
      listPermissionId = result.insertId;
      console.log('✅ Created applications.list permission with ID:', listPermissionId);
    } else {
      listPermissionId = listPermissions[0].id;
      console.log('✅ Found applications.list permission with ID:', listPermissionId);
    }

    // Check if role already has this permission
    const [roleListPermissions] = await connection.execute(`
      SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
    `, [roleId, listPermissionId]);

    if (roleListPermissions.length === 0) {
      console.log('📝 Assigning applications.list permission to membership_approver role...');
      await connection.execute(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
      `, [roleId, listPermissionId]);
      console.log('✅ Successfully assigned applications.list permission');
    } else {
      console.log('✅ Role already has applications.list permission');
    }

    // Verify the permissions are now assigned
    console.log('\n📊 Verifying permissions for membership_approver role:');
    const [finalPermissions] = await connection.execute(`
      SELECT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.name LIKE 'applications.%'
      ORDER BY p.name
    `, [roleId]);

    finalPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name}`);
    });

    await connection.end();
    console.log('\n🎉 Permissions setup complete!');
    console.log('🔄 Please refresh your browser and try accessing applications again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addApplicationsReadPermission();
