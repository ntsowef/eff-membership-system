const mysql = require('mysql2/promise');

async function fixFinancialPermissions() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔧 Fixing financial permissions...');

    // Get the financial_reviewer role ID
    const [roles] = await connection.query(`
      SELECT id FROM roles WHERE name = 'financial_reviewer'
    `);

    if (roles.length === 0) {
      console.log('❌ financial_reviewer role not found');
      return;
    }

    const roleId = roles[0].id;
    console.log(`📋 Working with financial_reviewer role (ID: ${roleId})`);

    // Define the missing permissions that the API endpoints expect
    const missingPermissions = [
      {
        name: 'financial.view_dashboard',
        description: 'View financial dashboard metrics and overview'
      },
      {
        name: 'financial.view_realtime',
        description: 'View real-time financial statistics and updates'
      },
      {
        name: 'financial.view_performance',
        description: 'View financial performance metrics and analytics'
      },
      {
        name: 'financial.view_all_transactions',
        description: 'View all financial transactions across the system'
      },
      {
        name: 'financial.view_summary',
        description: 'View financial summary reports and statistics'
      },
      {
        name: 'financial.view_analytics',
        description: 'View financial analytics and insights'
      },
      {
        name: 'financial.export_transactions',
        description: 'Export financial transaction data to various formats'
      }
    ];

    console.log(`\n🔍 Adding ${missingPermissions.length} missing permissions...`);

    for (const permission of missingPermissions) {
      // Check if permission already exists
      const [existing] = await connection.query(`
        SELECT id FROM permissions WHERE name = ?
      `, [permission.name]);

      let permissionId;

      if (existing.length === 0) {
        // Create the permission
        const [result] = await connection.query(`
          INSERT INTO permissions (name, description) VALUES (?, ?)
        `, [permission.name, permission.description]);
        
        permissionId = result.insertId;
        console.log(`  ✅ Created permission: ${permission.name} (ID: ${permissionId})`);
      } else {
        permissionId = existing[0].id;
        console.log(`  ℹ️  Permission already exists: ${permission.name} (ID: ${permissionId})`);
      }

      // Assign permission to financial_reviewer role
      const [rolePermExists] = await connection.query(`
        SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
      `, [roleId, permissionId]);

      if (rolePermExists.length === 0) {
        await connection.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
        `, [roleId, permissionId]);
        console.log(`    🔗 Assigned to financial_reviewer role`);
      } else {
        console.log(`    ℹ️  Already assigned to financial_reviewer role`);
      }
    }

    // Also assign to membership_approver role if it exists
    const [membershipRole] = await connection.query(`
      SELECT id FROM roles WHERE name = 'membership_approver'
    `);

    if (membershipRole.length > 0) {
      const membershipRoleId = membershipRole[0].id;
      console.log(`\n🔗 Also assigning permissions to membership_approver role (ID: ${membershipRoleId})...`);

      for (const permission of missingPermissions) {
        const [permissionRecord] = await connection.query(`
          SELECT id FROM permissions WHERE name = ?
        `, [permission.name]);

        if (permissionRecord.length > 0) {
          const permissionId = permissionRecord[0].id;

          const [rolePermExists] = await connection.query(`
            SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?
          `, [membershipRoleId, permissionId]);

          if (rolePermExists.length === 0) {
            await connection.query(`
              INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
            `, [membershipRoleId, permissionId]);
            console.log(`  ✅ Assigned ${permission.name} to membership_approver`);
          }
        }
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying permissions for financial.reviewer@test.com...');
    
    const [finalCheck] = await connection.query(`
      SELECT DISTINCT p.name
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN roles r ON rp.role_id = r.id
      INNER JOIN users u ON u.role_id = r.id
      WHERE u.email = 'financial.reviewer@test.com'
        AND p.name IN (${missingPermissions.map(() => '?').join(',')})
    `, missingPermissions.map(p => p.name));

    console.log('\n✅ Final verification:');
    missingPermissions.forEach(perm => {
      const hasPermission = finalCheck.some(p => p.name === perm.name);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm.name}`);
    });

    const allPermissionsAssigned = finalCheck.length === missingPermissions.length;
    
    if (allPermissionsAssigned) {
      console.log('\n🎉 SUCCESS! All financial permissions have been fixed!');
      console.log('The user should now be able to access all financial dashboard endpoints.');
      console.log('\n📝 Next steps:');
      console.log('1. Refresh your browser');
      console.log('2. Try accessing the financial dashboard again');
      console.log('3. The 403 errors should be resolved');
    } else {
      console.log('\n⚠️  Some permissions may still be missing. Please check the database manually.');
    }

  } catch (error) {
    console.error('❌ Error fixing permissions:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixFinancialPermissions();
