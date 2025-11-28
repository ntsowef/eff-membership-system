const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
});

async function checkAuthTables() {
  console.log('🔍 Checking Authentication Table Structures');
  console.log('==========================================\n');
  
  try {
    // Check roles table structure
    console.log('1️⃣ Checking roles table structure...\n');
    
    const rolesColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `);
    
    console.log('   📊 Roles table columns:');
    rolesColumns.rows.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if roles table has id column
    const hasRolesId = rolesColumns.rows.some(col => col.column_name === 'id');
    if (!hasRolesId) {
      console.log('   ❌ Missing id column in roles table');
    } else {
      console.log('   ✅ Roles table has id column');
    }
    
    // Check user_sessions table structure
    console.log('\n2️⃣ Checking user_sessions table structure...\n');
    
    const sessionsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position
    `);
    
    console.log('   📊 User_sessions table columns:');
    sessionsColumns.rows.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if user_sessions table has required columns
    const requiredSessionColumns = ['id', 'session_id', 'user_id', 'is_active', 'created_at'];
    const missingSessionColumns = requiredSessionColumns.filter(col => 
      !sessionsColumns.rows.some(dbCol => dbCol.column_name === col)
    );
    
    if (missingSessionColumns.length > 0) {
      console.log(`   ❌ Missing columns in user_sessions: ${missingSessionColumns.join(', ')}`);
    } else {
      console.log('   ✅ User_sessions table has all required columns');
    }
    
    // Check users table structure
    console.log('\n3️⃣ Checking users table structure...\n');
    
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('   📊 Users table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if users table has required columns
    const requiredUserColumns = ['id', 'email', 'password', 'role_id', 'is_active'];
    const missingUserColumns = requiredUserColumns.filter(col => 
      !usersColumns.rows.some(dbCol => dbCol.column_name === col)
    );
    
    if (missingUserColumns.length > 0) {
      console.log(`   ❌ Missing columns in users: ${missingUserColumns.join(', ')}`);
    } else {
      console.log('   ✅ Users table has all required columns');
    }
    
    // Check sample data
    console.log('\n4️⃣ Checking sample data...\n');
    
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const roleCount = await pool.query('SELECT COUNT(*) FROM roles');
    const sessionCount = await pool.query('SELECT COUNT(*) FROM user_sessions');
    
    console.log(`   📊 Data counts:`);
    console.log(`      - Users: ${userCount.rows[0].count}`);
    console.log(`      - Roles: ${roleCount.rows[0].count}`);
    console.log(`      - Sessions: ${sessionCount.rows[0].count}`);
    
    // Check if we have any admin users
    const adminUsers = await pool.query(`
      SELECT u.id, u.name, u.email, u.admin_level, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.admin_level IN ('national', 'province', 'district')
      LIMIT 5
    `);
    
    console.log(`\n   📊 Admin users (${adminUsers.rows.length}):`);
    adminUsers.rows.forEach(user => {
      console.log(`      - ${user.name} (${user.email}): ${user.admin_level} - ${user.role_name || 'No role'}`);
    });
    
    console.log('\n🎯 AUTHENTICATION TABLE ANALYSIS COMPLETED!');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error checking authentication tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkAuthTables()
  .then(() => {
    console.log('\n✅ Authentication table check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Authentication table check failed:', error.message);
    process.exit(1);
  });
