const mysql = require('mysql2/promise');

async function checkUserRoleName() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking membership approver user role name...\n');

    // Check the exact role name for the membership approver user
    const [users] = await connection.execute(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role_id,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = 'membership.approver@test.com'
    `);

    if (users.length === 0) {
      console.log('❌ Membership approver user not found');
      await connection.end();
      return;
    }

    const user = users[0];
    console.log('👤 User details:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role_id: user.role_id,
      role_name: user.role_name
    });

    // Check all roles to see what's available
    console.log('\n📋 All available roles:');
    const [allRoles] = await connection.execute(`SELECT id, name FROM roles ORDER BY name`);
    allRoles.forEach(role => {
      const marker = role.id === user.role_id ? ' ← USER\'S ROLE' : '';
      console.log(`  • ${role.name} (ID: ${role.id})${marker}`);
    });

    // Test the authorize middleware logic
    console.log('\n🧪 Testing authorize middleware logic:');
    const allowedRoles = ['financial_reviewer', 'membership_approver', 'super_admin'];
    const userRoleName = user.role_name;
    
    console.log(`User's role name: "${userRoleName}"`);
    console.log(`Allowed roles: [${allowedRoles.map(r => `"${r}"`).join(', ')}]`);
    console.log(`Role match: ${allowedRoles.includes(userRoleName) ? '✅ ALLOWED' : '❌ DENIED'}`);

    // Check if there's a role name mismatch
    if (!allowedRoles.includes(userRoleName)) {
      console.log('\n⚠️  ROLE NAME MISMATCH DETECTED!');
      console.log('The authorize middleware expects one of these role names:');
      allowedRoles.forEach(role => console.log(`  • "${role}"`));
      console.log(`But the user has role name: "${userRoleName}"`);
      
      // Check if we need to update the role name
      if (userRoleName && userRoleName.includes('membership') && userRoleName.includes('approver')) {
        console.log('\n🔧 Suggested fix: Update role name to "membership_approver"');
        
        // Ask if we should fix it
        console.log('\n📝 Updating role name to "membership_approver"...');
        await connection.execute(`
          UPDATE roles SET name = 'membership_approver' WHERE id = ?
        `, [user.role_id]);
        console.log('✅ Role name updated successfully');
      }
    }

    await connection.end();
    console.log('\n🎉 Role check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserRoleName();
