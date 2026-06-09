/**
 * Quick check: active sessions in DB + recent session records
 */
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
    // Count active sessions
    const countRes = await pool.query(
      "SELECT COUNT(*) as active_count FROM user_sessions WHERE expires_at > NOW() AND is_active = TRUE"
    );
    console.log('Active sessions in DB:', countRes.rows[0].active_count);

    // Show recent sessions
    const sessionsRes = await pool.query(
      "SELECT session_id, user_id, is_active, last_activity, expires_at FROM user_sessions ORDER BY last_activity DESC LIMIT 5"
    );
    console.log('\nRecent sessions:');
    if (sessionsRes.rows.length === 0) {
      console.log('  (no sessions found)');
    } else {
      for (const s of sessionsRes.rows) {
        const expired = new Date(s.expires_at) < new Date();
        console.log(`  user_id=${s.user_id} active=${s.is_active} last_activity=${s.last_activity} expires=${s.expires_at} ${expired ? '(EXPIRED)' : '(VALID)'}`);
      }
    }

    // Test the statistics query (the one we just fixed)
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total_active_sessions,
        COUNT(DISTINCT user_id) as unique_active_users,
        AVG(EXTRACT(EPOCH FROM (last_activity - created_at)) / 60) as avg_session_duration_minutes,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as sessions_created_last_hour,
        COUNT(CASE WHEN last_activity >= NOW() - INTERVAL '1 hour' THEN 1 END) as sessions_active_last_hour
      FROM user_sessions
      WHERE expires_at > NOW() AND is_active = TRUE
    `);
    console.log('\nStatistics query result (PostgreSQL):');
    console.log(JSON.stringify(statsRes.rows[0], null, 2));
    console.log('\n✅ Statistics query works correctly with PostgreSQL syntax');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();

