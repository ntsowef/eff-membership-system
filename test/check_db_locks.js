const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkDatabaseLocks() {
  try {
    console.log('=== Checking Database Activity ===\n');
    
    // Check active queries
    console.log('Active Queries:');
    const activeQueries = await pool.query(`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        query_start,
        state_change,
        LEFT(query, 100) as query_preview
      FROM pg_stat_activity
      WHERE datname = 'eff_membership_database'
        AND state != 'idle'
      ORDER BY query_start
    `);
    console.table(activeQueries.rows);
    
    // Check locks
    console.log('\nDatabase Locks:');
    const locks = await pool.query(`
      SELECT 
        l.locktype,
        l.mode,
        l.granted,
        a.usename,
        a.application_name,
        a.state,
        LEFT(a.query, 80) as query_preview
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE a.datname = 'eff_membership_database'
      ORDER BY l.granted, a.query_start
    `);
    console.table(locks.rows);
    
    // Check connection count
    console.log('\nConnection Count:');
    const connCount = await pool.query(`
      SELECT 
        state,
        COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = 'eff_membership_database'
      GROUP BY state
      ORDER BY count DESC
    `);
    console.table(connCount.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseLocks();

