/**
 * Read-only: show the actual columns of the materialized views that reference
 * voting_districts, and detect a unique index (needed for CONCURRENTLY refresh).
 * This lets us build a correct staleness check before refreshing.
 *
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/inspect-matview-columns.js
 */
const { makePool } = require('./lib-vslisting');

const TARGETS = ['mv_voting_district_compliance', 'mv_ward_compliance_summary'];

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Inspecting matview columns on host=${host}\n`);
  const pool = makePool();
  try {
    for (const mv of TARGETS) {
      const cols = await pool.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`, [mv]);
      console.log(`## ${mv} columns`);
      console.table(cols.rows);

      const idx = await pool.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = $1`, [mv]);
      console.log(`Indexes on ${mv}:`);
      if (idx.rows.length) console.table(idx.rows);
      else console.log('  (none — CONCURRENTLY refresh NOT possible; plain refresh will lock briefly)');
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
