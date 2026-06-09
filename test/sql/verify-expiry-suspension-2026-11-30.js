// Verify migration 046: the "-> Expired" suspension cut-off is 2026-11-30.
// Usage: node test/sql/verify-expiry-suspension-2026-11-30.js (run from backend/)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const fn = await pool.query(
      "SELECT pg_get_functiondef('fn_auto_update_membership_status()'::regprocedure) AS def"
    );
    const def = fn.rows[0].def;
    console.log('Cut-off 2026-11-30 present in trigger fn:', def.includes("2026-11-30"));
    console.log('Old cut-off 2026-11-04 still present:', def.includes("2026-11-04"));

    const trg = await pool.query(
      "SELECT obj_description(oid) AS c FROM pg_trigger WHERE tgname = 'tr_auto_update_membership_status'"
    );
    console.log('Trigger comment:', trg.rows[0] ? trg.rows[0].c : '(none)');

    const dist = await pool.query(
      `SELECT membership_status_id AS id, COUNT(*)::int AS n
       FROM members_consolidated
       GROUP BY membership_status_id
       ORDER BY membership_status_id`
    );
    console.log('Status distribution:');
    console.table(dist.rows);

    const expiredStale = await pool.query(
      `SELECT COUNT(*)::int AS n
       FROM members_consolidated
       WHERE membership_status_id = 2
         AND expiry_date IS NOT NULL
         AND expiry_date < CURRENT_DATE - INTERVAL '90 days'`
    );
    console.log('Expired rows still >90d past expiry (should be 0 during suspension):', expiredStale.rows[0].n);

    await pool.end();
  } catch (e) {
    console.error('ERR:' + e.message);
    process.exit(1);
  }
})();
