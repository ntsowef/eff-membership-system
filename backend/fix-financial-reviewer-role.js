const mysql = require('mysql2/promise');

async function fixFinancialReviewerRole() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking financial reviewer user...');

    // Check current user status
    const [users] = await connection.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role_id, 
        u.admin_level,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'financial.reviewer@test.com'
    `);

    if (users.length === 0) {
      console.log('❌ User financial.reviewer@test.com not found');
      return;
    }

    const user = users[0];
    console.log('\n📋 Current User Status:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role ID: ${user.role_id}`);
    console.log(`Role Name: ${user.role_name || 'NO ROLE ASSIGNED'}`);
    console.log(`Admin Level: ${user.admin_level}`);

    // Check if financial_reviewer role exists
    const [roles] = await connection.query(`
      SELECT id, name, description FROM roles WHERE name = 'financial_reviewer'
    `);

    if (roles.length === 0) {
      console.log('\n❌ financial_reviewer role not found in database');
      console.log('Creating financial_reviewer role...');
      
      await connection.query(`
        INSERT INTO roles (name, description) VALUES 
        ('financial_reviewer', 'Financial Reviewer - Can verify payments and approve applications financially')
      `);
      
      console.log('✅ financial_reviewer role created');
    } else {
      console.log(`\n✅ financial_reviewer role exists (ID: ${roles[0].id})`);
    }

    // Get the financial_reviewer role ID
    const [financialRole] = await connection.query(`
      SELECT id FROM roles WHERE name = 'financial_reviewer'
    `);

    if (financialRole.length === 0) {
      console.log('❌ Could not find or create financial_reviewer role');
      return;
    }

    const roleId = financialRole[0].id;

    // Update user's role if not assigned
    if (!user.role_id || user.role_name !== 'financial_reviewer') {
      console.log(`\n🔧 Assigning financial_reviewer role (ID: ${roleId}) to user...`);
      
      await connection.query(`
        UPDATE users SET role_id = ? WHERE email = 'financial.reviewer@test.com'
      `, [roleId]);
      
      console.log('✅ User role updated successfully');
    } else {
      console.log('\n✅ User already has correct role assigned');
    }

    // Verify the fix
    const [updatedUsers] = await connection.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role_id, 
        u.admin_level,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'financial.reviewer@test.com'
    `);

    const updatedUser = updatedUsers[0];
    console.log('\n🎉 Updated User Status:');
    console.log(`Name: ${updatedUser.name}`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Role ID: ${updatedUser.role_id}`);
    console.log(`Role Name: ${updatedUser.role_name}`);
    console.log(`Admin Level: ${updatedUser.admin_level}`);

    // Check permissions for the role
    const [permissions] = await connection.query(`
      SELECT p.name, p.description
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.name
    `, [roleId]);

    console.log('\n🔐 Role Permissions:');
    if (permissions.length === 0) {
      console.log('⚠️  No permissions assigned to financial_reviewer role');
      console.log('This might be why the user can access via admin_level but not role-based checks');
    } else {
      permissions.forEach(perm => {
        console.log(`  - ${perm.name}: ${perm.description}`);
      });
    }

    console.log('\n✅ Financial reviewer role fix completed!');
    console.log('Please refresh your browser and check if the sidebar items are now visible.');

  } catch (error) {
    console.error('❌ Error fixing financial reviewer role:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixFinancialReviewerRole();
