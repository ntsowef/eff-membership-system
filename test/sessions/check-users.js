const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function main() {
  try {
    // Get columns of users table
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
    console.log('Users columns:', cols.rows.map(r => r.column_name).join(', '));

    // Get a super admin user
    const admins = await pool.query(`SELECT u.id, u.email, u.admin_level, r.role_code FROM users u JOIN roles r ON u.role_id=r.id WHERE r.role_code IN ('SUPER_ADMIN','NATIONAL_ADMIN') LIMIT 5`);
    console.log('\nAdmin users:');
    admins.rows.forEach(r => console.log(`  ${r.id}: ${r.email} (${r.role_code}, ${r.admin_level})`));

    // Check active sessions
    const sessions = await pool.query(`SELECT COUNT(*) as cnt FROM user_sessions WHERE is_active=true AND expires_at > NOW()`);
    console.log('\nActive sessions:', sessions.rows[0].cnt);

    // Check all sessions
    const allSessions = await pool.query(`SELECT session_id, user_id, is_active, expires_at, last_activity FROM user_sessions ORDER BY created_at DESC LIMIT 5`);
    console.log('\nRecent sessions:');
    allSessions.rows.forEach(r => console.log(`  user=${r.user_id} active=${r.is_active} expires=${r.expires_at} last_activity=${r.last_activity}`));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
main();

