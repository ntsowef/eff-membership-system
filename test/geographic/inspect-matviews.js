/**
 * Read-only: list materialized views and flag those whose definition references
 * voting_districts / voting_district_name (so a stale cache would show old VD
 * names on the membership UI). Also reports last-refresh-ish size info.
 *
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/inspect-matviews.js
 */
const { makePool } = require('./lib-vslisting');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Inspecting materialized views on host=${host}\n`);
  const pool = makePool();
  try {
    const mvs = await pool.query(`
      SELECT m.matviewname,
             (d.definition ILIKE '%voting_districts%')      AS refs_voting_districts,
             (d.definition ILIKE '%voting_district_name%')   AS refs_vd_name,
             pg_size_pretty(pg_total_relation_size(('public.' || m.matviewname)::regclass)) AS size
      FROM pg_matviews m
      JOIN pg_matviews d ON d.matviewname = m.matviewname
      WHERE m.schemaname = 'public'
      ORDER BY m.matviewname
    `);
    console.log('## Materialized views');
    if (mvs.rows.length) console.table(mvs.rows);
    else console.log('(no materialized views found)');

    // For any matview that references voting_districts, show row count.
    for (const r of mvs.rows.filter((x) => x.refs_voting_districts)) {
      const c = await pool.query(`SELECT COUNT(*) AS rows FROM ${r.matviewname}`);
      console.log(`  ${r.matviewname}: ${c.rows[0].rows} rows`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
