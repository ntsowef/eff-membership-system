#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function createMaintenancePermission() {
  try {
    console.log('🔐 Creating system.maintenance permission...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Create the system.maintenance permission
    console.log('📋 Creating system.maintenance permission...');
    await connection.execute(`
      INSERT INTO permissions (name, description, created_at, updated_at)
      VALUES ('system.maintenance', 'Manage system maintenance mode', NOW(), NOW())
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);
    console.log('✅ system.maintenance permission created');
    
    // Get the permission ID
    const [permissionRows] = await connection.execute(`
      SELECT id FROM permissions WHERE name = 'system.maintenance'
    `);
    
    if (permissionRows.length === 0) {
      throw new Error('Failed to create system.maintenance permission');
    }
    
    const permissionId = permissionRows[0].id;
    console.log(`📋 Permission ID: ${permissionId}`);
    
    // Get the super_admin role ID
    const [roleRows] = await connection.execute(`
      SELECT id FROM roles WHERE name = 'super_admin'
    `);
    
    if (roleRows.length === 0) {
      throw new Error('super_admin role not found');
    }
    
    const roleId = roleRows[0].id;
    console.log(`📋 Super Admin Role ID: ${roleId}`);
    
    // Assign the permission to super_admin role
    console.log('📋 Assigning permission to super_admin role...');
    await connection.execute(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)
    `, [roleId, permissionId]);
    console.log('✅ Permission assigned to super_admin role');
    
    // Also assign to other admin roles if they exist
    const adminRoles = ['admin', 'system_admin', 'national_admin'];
    
    for (const roleName of adminRoles) {
      const [adminRoleRows] = await connection.execute(`
        SELECT id FROM roles WHERE name = ?
      `, [roleName]);
      
      if (adminRoleRows.length > 0) {
        const adminRoleId = adminRoleRows[0].id;
        console.log(`📋 Assigning permission to ${roleName} role (ID: ${adminRoleId})...`);
        
        await connection.execute(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)
        `, [adminRoleId, permissionId]);
        
        console.log(`✅ Permission assigned to ${roleName} role`);
      }
    }
    
    // Verify the assignment
    console.log('\n📋 Verifying permission assignment...');
    const [verifyRows] = await connection.execute(`
      SELECT 
        r.name as role_name,
        p.name as permission_name,
        p.description as permission_description
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'system.maintenance'
    `);
    
    console.log('✅ Permission assignments:');
    verifyRows.forEach(row => {
      console.log(`  - ${row.role_name}: ${row.permission_name} (${row.permission_description})`);
    });
    
    // Check if admin user now has the permission
    console.log('\n📋 Checking admin user permissions...');
    const [adminPermissions] = await connection.execute(`
      SELECT 
        u.name, u.email,
        r.name as role_name,
        p.name as permission_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.email = 'admin@membership.org' AND p.name = 'system.maintenance'
    `);
    
    if (adminPermissions.length > 0) {
      console.log('✅ Admin user now has system.maintenance permission');
      adminPermissions.forEach(perm => {
        console.log(`  - ${perm.name} (${perm.email}) via ${perm.role_name} role`);
      });
    } else {
      console.log('❌ Admin user still does not have system.maintenance permission');
    }
    
    await connection.end();
    
    console.log('\n🎉 Maintenance permission setup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createMaintenancePermission();
