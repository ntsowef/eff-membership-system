const mysql = require('mysql2/promise');

async function fixTrendsPermission() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Adding missing financial.view_trends permission...\n');

    // 1. Create the permission if it doesn't exist
    const [existingPermission] = await connection.execute(
      'SELECT id FROM permissions WHERE name = ?',
      ['financial.view_trends']
    );

    let permissionId;
    if (existingPermission.length === 0) {
      const [result] = await connection.execute(
        'INSERT INTO permissions (name, description) VALUES (?, ?)',
        ['financial.view_trends', 'View financial trends and analytics']
      );
      permissionId = result.insertId;
      console.log('✅ Created permission: financial.view_trends (ID:', permissionId, ')');
    } else {
      permissionId = existingPermission[0].id;
      console.log('✅ Permission already exists: financial.view_trends (ID:', permissionId, ')');
    }

    // 2. Get financial_reviewer role ID
    const [financialRole] = await connection.execute(
      'SELECT id FROM roles WHERE name = ?',
      ['financial_reviewer']
    );

    if (financialRole.length === 0) {
      console.log('❌ financial_reviewer role not found');
      return;
    }

    const roleId = financialRole[0].id;
    console.log('✅ Found financial_reviewer role (ID:', roleId, ')');

    // 3. Check if role already has this permission
    const [existingRolePermission] = await connection.execute(
      'SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?',
      [roleId, permissionId]
    );

    if (existingRolePermission.length === 0) {
      // 4. Assign permission to role
      await connection.execute(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      );
      console.log('✅ Assigned financial.view_trends permission to financial_reviewer role');
    } else {
      console.log('✅ financial_reviewer role already has financial.view_trends permission');
    }

    console.log('\n🎉 Successfully fixed trends permission!');

  } catch (error) {
    console.error('❌ Error fixing trends permission:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixTrendsPermission();
