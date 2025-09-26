#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkRealUsers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'membership_db'
    });
    
    console.log('🔍 Checking real users in database...\n');
    
    // Check total user count
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total_users FROM users
    `);
    console.log('📊 Total users in database:', countResult[0].total_users);
    
    // Check users by admin level
    const [adminLevelStats] = await connection.execute(`
      SELECT 
        admin_level,
        COUNT(*) as count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
      FROM users 
      WHERE admin_level IS NOT NULL
      GROUP BY admin_level
      ORDER BY 
        CASE admin_level 
          WHEN 'national' THEN 1
          WHEN 'province' THEN 2
          WHEN 'district' THEN 3
          WHEN 'municipality' THEN 4
          WHEN 'ward' THEN 5
          ELSE 6
        END
    `);
    
    console.log('\n📋 Users by admin level:');
    console.table(adminLevelStats);
    
    // Check recent users
    const [recentUsers] = await connection.execute(`
      SELECT 
        id,
        name,
        email,
        admin_level,
        province_code,
        municipal_code,
        ward_code,
        is_active,
        created_at,
        last_login_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Recent users (last 10):');
    console.table(recentUsers);
    
    // Check if we have any roles
    const [roles] = await connection.execute(`
      SELECT id, name, description FROM roles ORDER BY name
    `);
    
    console.log('\n📋 Available roles:');
    console.table(roles);
    
    // Check users with role information
    const [usersWithRoles] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.admin_level,
        r.name as role_name,
        u.is_active,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📋 Users with role information:');
    console.table(usersWithRoles);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

checkRealUsers();
