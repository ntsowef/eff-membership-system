const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...\n');

    // Check if audit_logs table exists
    const auditTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    console.log('✅ audit_logs table exists:', auditTableCheck.rows[0].exists);

    if (auditTableCheck.rows[0].exists) {
      // Get audit_logs table structure
      const auditColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        ORDER BY ordinal_position;
      `);
      console.log('\n📋 audit_logs columns:');
      auditColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    // Check users table structure
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 users table columns:');
    userColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check roles table structure
    const roleColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 roles table columns:');
    roleColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Test the getUserStatistics query
    console.log('\n🧪 Testing getUserStatistics query...');
    const userStatsQuery = `
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN u.admin_level = 'national' THEN 1 END) as national_admins,
        COUNT(CASE WHEN u.admin_level = 'province' THEN 1 END) as province_admins,
        COUNT(CASE WHEN u.admin_level = 'district' THEN 1 END) as district_admins,
        COUNT(CASE WHEN u.admin_level = 'municipality' THEN 1 END) as municipality_admins,
        COUNT(CASE WHEN u.admin_level = 'ward' THEN 1 END) as ward_admins,
        COUNT(CASE WHEN r.role_code = 'SUPER_ADMIN' THEN 1 END) as super_admins,
        COUNT(CASE WHEN u.mfa_enabled = true THEN 1 END) as mfa_enabled_users,
        COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '24 hours' THEN 1 END) as active_last_24h,
        COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7d,
        COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30d
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
    `;

    const userStats = await pool.query(userStatsQuery);
    console.log('✅ User statistics query successful:');
    console.log(userStats.rows[0]);

    // Test the getRecentActivity query
    console.log('\n🧪 Testing getRecentActivity query...');
    const recentActivityQuery = `
      SELECT
        audit_id,
        user_id,
        action,
        entity_type,
        entity_id,
        ip_address,
        created_at,
        (SELECT name FROM users WHERE user_id = al.user_id) as user_name
      FROM audit_logs al
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentActivity = await pool.query(recentActivityQuery);
    console.log('✅ Recent activity query successful. Found', recentActivity.rows.length, 'records');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
  }
}

checkDatabaseStructure();

