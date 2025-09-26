const { executeQuery, initializeDatabase } = require('./dist/config/database');

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking admin users in database...\n');

    // Initialize database connection
    await initializeDatabase();

    // First check the users table structure
    const describeQuery = `DESCRIBE users`;
    const tableStructure = await executeQuery(describeQuery);

    console.log('📋 Users table structure:');
    tableStructure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type}`);
    });
    console.log('');

    // Check users table - adjust query based on actual structure
    const usersQuery = `
      SELECT
        id,
        email,
        role_id,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const adminUsers = await executeQuery(usersQuery);

    if (adminUsers.length > 0) {
      console.log('👥 Found users:');
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Role ID: ${user.role_id}`);
        console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found');
    }

    // Also check if there are any users at all
    const totalUsersQuery = `SELECT COUNT(*) as total FROM users`;
    const [totalResult] = await executeQuery(totalUsersQuery);
    console.log(`📊 Total users in database: ${totalResult.total}`);

    // Check roles table
    const rolesQuery = `SELECT * FROM roles WHERE name LIKE '%admin%'`;
    const roles = await executeQuery(rolesQuery);
    
    if (roles.length > 0) {
      console.log('\n🎭 Admin roles available:');
      roles.forEach(role => {
        console.log(`- ${role.name}: ${role.description}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking admin users:', error);
    process.exit(1);
  }
}

checkAdminUsers();
