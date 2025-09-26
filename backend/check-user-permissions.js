const mysql = require('mysql2/promise');

async function checkUserPermissions() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking permissions for financial.reviewer@test.com...');

    // Get user details
    const [users] = await connection.query(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'financial.reviewer@test.com'
    `);

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log(`\n📋 User: ${user.name} (${user.email})`);
    console.log(`Role: ${user.role_name} (ID: ${user.role_id})`);

    // Get all permissions for this user
    const [userPermissions] = await connection.query(`
      SELECT DISTINCT p.name, p.description
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [user.role_id]);

    console.log(`\n🔐 User has ${userPermissions.length} permissions:`);
    userPermissions.forEach(perm => {
      console.log(`  ✅ ${perm.name}: ${perm.description}`);
    });

    // Check specific permissions required by the failing endpoints
    const requiredPermissions = [
      'financial.view_dashboard',
      'financial.view_realtime', 
      'financial.view_performance',
      'financial.view_all_transactions'
    ];

    console.log('\n🎯 Checking specific permissions required by failing endpoints:');
    
    for (const permission of requiredPermissions) {
      const hasPermission = userPermissions.some(p => p.name === permission);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
      
      if (!hasPermission) {
        // Check if permission exists in database
        const [permExists] = await connection.query(`
          SELECT id, name, description FROM permissions WHERE name = ?
        `, [permission]);
        
        if (permExists.length === 0) {
          console.log(`    ⚠️  Permission '${permission}' does not exist in database`);
        } else {
          console.log(`    ⚠️  Permission exists but not assigned to role`);
        }
      }
    }

    // Check if we need to add missing permissions
    const missingPermissions = [];
    for (const permission of requiredPermissions) {
      const hasPermission = userPermissions.some(p => p.name === permission);
      if (!hasPermission) {
        // Check if permission exists
        const [permExists] = await connection.query(`
          SELECT id FROM permissions WHERE name = ?
        `, [permission]);
        
        if (permExists.length > 0) {
          missingPermissions.push({
            name: permission,
            id: permExists[0].id
          });
        }
      }
    }

    if (missingPermissions.length > 0) {
      console.log(`\n🔧 Found ${missingPermissions.length} missing permissions. Adding them...`);
      
      for (const perm of missingPermissions) {
        await connection.query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)
        `, [user.role_id, perm.id]);
        console.log(`  ✅ Added permission: ${perm.name}`);
      }
      
      console.log('\n🎉 Missing permissions have been added!');
    } else {
      console.log('\n✅ All required permissions are already assigned');
    }

    // Final verification
    const [finalPermissions] = await connection.query(`
      SELECT DISTINCT p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.name IN (${requiredPermissions.map(() => '?').join(',')})
    `, [user.role_id, ...requiredPermissions]);

    console.log('\n🔍 Final verification:');
    requiredPermissions.forEach(perm => {
      const hasPermission = finalPermissions.some(p => p.name === perm);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
    });

    console.log('\n✅ Permission check completed!');
    console.log('Please refresh your browser and try accessing the financial dashboard again.');

  } catch (error) {
    console.error('❌ Error checking permissions:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkUserPermissions();
