const mysql = require('mysql2/promise');

async function checkUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking users table structure...\n');

    // Get table structure
    const [columns] = await connection.execute(`DESCRIBE users`);
    console.log('📋 Users table columns:');
    columns.forEach(col => {
      console.log(`  • ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check membership approver user
    console.log('\n🔍 Looking for membership approver user...');
    const [users] = await connection.execute(`
      SELECT * FROM users WHERE email = 'membership.approver@test.com'
    `);

    if (users.length > 0) {
      console.log('✅ Found membership approver user:', users[0]);
    } else {
      console.log('❌ Membership approver user not found');
    }

    // Check roles table
    console.log('\n📋 Checking roles table...');
    const [roles] = await connection.execute(`SELECT * FROM roles`);
    console.log('Roles found:', roles.length);
    roles.forEach(role => {
      console.log(`  • ${role.name} (ID: ${role.id})`);
    });

    // Check permissions table
    console.log('\n📋 Checking permissions table...');
    const [permissions] = await connection.execute(`SELECT * FROM permissions LIMIT 10`);
    console.log('Permissions found:', permissions.length);
    permissions.forEach(perm => {
      console.log(`  • ${perm.name}`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsersTable();
