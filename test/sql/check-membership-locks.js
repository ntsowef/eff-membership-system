// Diagnostic: show active sessions / blocking locks on the current database.
// Usage: node test/sql/check-membership-locks.js  (run from backend/ so .env loads)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
  SELECT pid, state, wait_event_type, wait_event,
         left(query, 90) AS q,
         now() - query_start AS dur
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid()
  ORDER BY dur DESC NULLS LAST
  LIMIT 20;
`;

pool.query(sql)
  .then((r) => { console.table(r.rows); return pool.end(); })
  .catch((e) => { console.error('ERR:' + e.message); process.exit(1); });
