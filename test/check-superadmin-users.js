const { Client } = require('pg');

async function checkSuperAdminUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for super admin role
    const roleQuery = `
      SELECT role_id, role_name, role_code 
      FROM roles 
      WHERE role_code = 'SUPER_ADMIN' OR role_name ILIKE '%super%admin%'
    `;
    const roleResult = await client.query(roleQuery);
    console.log('Super Admin Roles:');
    console.log(roleResult.rows);
    console.log('');

    if (roleResult.rows.length === 0) {
      console.log('❌ No Super Admin role found in database');
      await client.end();
      return;
    }

    const superAdminRoleId = roleResult.rows[0].role_id;

    // Check for users with super admin role
    const userQuery = `
      SELECT user_id, name, email, role_id, is_active
      FROM users
      WHERE role_id = $1
      LIMIT 10
    `;
    const userResult = await client.query(userQuery, [superAdminRoleId]);
    
    console.log(`Super Admin Users (role_id: ${superAdminRoleId}):`);
    if (userResult.rows.length === 0) {
      console.log('❌ No Super Admin users found');
    } else {
      userResult.rows.forEach(user => {
        console.log(`  - ID: ${user.user_id}, Name: ${user.name}, Email: ${user.email}, Active: ${user.is_active}`);
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

checkSuperAdminUsers();

