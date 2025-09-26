#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkPermissions() {
  try {
    console.log('🔐 Checking user permissions...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Check admin user permissions
    const [userPermissions] = await connection.execute(`
      SELECT 
        u.id, u.name, u.email, u.admin_level,
        r.name as role_name,
        p.name as permission_name,
        p.description as permission_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.email = 'admin@membership.org'
      ORDER BY p.name
    `);
    
    console.log('📋 Admin user permissions:');
    if (userPermissions.length > 0) {
      const user = userPermissions[0];
      console.log(`User: ${user.name} (${user.email}) - Role: ${user.role_name} - Level: ${user.admin_level}`);
      console.log('\nPermissions:');
      userPermissions.forEach(perm => {
        if (perm.permission_name) {
          console.log(`  - ${perm.permission_name}: ${perm.permission_description}`);
        }
      });
    } else {
      console.log('❌ No permissions found for admin user');
    }
    
    // Check if system.maintenance permission exists
    console.log('\n📋 Checking system.maintenance permission...');
    const [maintenancePermission] = await connection.execute(`
      SELECT * FROM permissions WHERE name = 'system.maintenance'
    `);
    
    if (maintenancePermission.length > 0) {
      console.log('✅ system.maintenance permission exists:', maintenancePermission[0]);
    } else {
      console.log('❌ system.maintenance permission does not exist');
      
      // Check all available permissions
      const [allPermissions] = await connection.execute(`
        SELECT name, description FROM permissions ORDER BY name
      `);
      
      console.log('\n📋 Available permissions:');
      allPermissions.forEach(perm => {
        console.log(`  - ${perm.name}: ${perm.description}`);
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPermissions();
