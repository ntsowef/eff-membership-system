const mysql = require('mysql2/promise');

async function fixAlertsPermission() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔧 Fixing financial alerts permission...\n');

    // Step 1: Create the missing permission
    console.log('📋 **Step 1: Creating financial.view_alerts permission**');
    
    const [existingPermission] = await connection.execute(`
      SELECT id FROM permissions WHERE name = 'financial.view_alerts'
    `);

    let alertsPermissionId;
    
    if (existingPermission.length === 0) {
      const [insertResult] = await connection.execute(`
        INSERT INTO permissions (name, description, resource, action) 
        VALUES ('financial.view_alerts', 'View financial system alerts and notifications', 'financial', 'view_alerts')
      `);
      alertsPermissionId = insertResult.insertId;
      console.log('✅ Created financial.view_alerts permission with ID:', alertsPermissionId);
    } else {
      alertsPermissionId = existingPermission[0].id;
      console.log('✅ financial.view_alerts permission already exists with ID:', alertsPermissionId);
    }

    // Step 2: Get role IDs
    console.log('\n📋 **Step 2: Getting role IDs**');
    
    const [roles] = await connection.execute(`
      SELECT id, name FROM roles WHERE name IN ('financial_reviewer', 'membership_approver')
    `);

    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });

    console.log('✅ Found roles:', roleMap);

    // Step 3: Assign permission to roles
    console.log('\n📋 **Step 3: Assigning permission to roles**');
    
    for (const [roleName, roleId] of Object.entries(roleMap)) {
      // Check if permission is already assigned
      const [existing] = await connection.execute(`
        SELECT id FROM role_permissions 
        WHERE role_id = ? AND permission_id = ?
      `, [roleId, alertsPermissionId]);

      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO role_permissions (role_id, permission_id) 
          VALUES (?, ?)
        `, [roleId, alertsPermissionId]);
        console.log(`✅ Assigned financial.view_alerts to ${roleName}`);
      } else {
        console.log(`✅ financial.view_alerts already assigned to ${roleName}`);
      }
    }

    // Step 4: Verify assignments
    console.log('\n📋 **Step 4: Verifying permission assignments**');
    
    const [verification] = await connection.execute(`
      SELECT r.name as role_name, p.name as permission_name
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'financial.view_alerts'
      ORDER BY r.name
    `);

    console.log('✅ Current assignments for financial.view_alerts:');
    verification.forEach(row => {
      console.log(`   • ${row.role_name} → ${row.permission_name}`);
    });

    console.log('\n🎉 **ALERTS PERMISSION FIX COMPLETE!**');
    console.log('✅ financial.view_alerts permission created and assigned');
    console.log('✅ Both financial_reviewer and membership_approver can now view alerts');

  } catch (error) {
    console.error('❌ Error fixing alerts permission:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAlertsPermission();
