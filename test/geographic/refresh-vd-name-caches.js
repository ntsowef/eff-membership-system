/**
 * Member-facing VD names are derived from voting_districts via views. Regular
 * views are already live; MATERIALIZED views cache data and must be refreshed
 * after the IEC VD-name update. This refreshes the materialized views that
 * reference voting_districts so the membership UI shows the new IEC names.
 *
 * SAFETY: dry run by default (reports staleness only). APPLY=1 performs the
 * refresh. Refresh recomputes from base tables (no data invented).
 *
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/refresh-vd-name-caches.js          (dry run)
 *   $env:DB_HOST="69.164.245.173"; $env:APPLY="1"; node ../test/geographic/refresh-vd-name-caches.js  (apply)
 */
const { makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

async function targets(client) {
  const res = await client.query(`
    SELECT matviewname FROM pg_matviews
    WHERE schemaname = 'public' AND definition ILIKE '%voting_districts%'
    ORDER BY matviewname
  `);
  return res.rows.map((r) => r.matviewname);
}

async function hasCols(client, mv) {
  const res = await client.query(
    // Materialized views are NOT in information_schema.columns; read from
    // pg_attribute via the relation's regclass instead.
    `SELECT
       bool_or(attname = 'voting_district_code') AS has_code,
       bool_or(attname = 'voting_district_name') AS has_name
     FROM pg_attribute
     WHERE attrelid = ('public.' || $1)::regclass
       AND attnum > 0 AND NOT attisdropped`, [mv]);
  return res.rows[0];
}

async function staleness(client, mv) {
  // Rows whose cached name differs from the current voting_districts name,
  // plus any "VD <code>" placeholders still cached.
  const res = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE mv.voting_district_name IS DISTINCT FROM vd.voting_district_name) AS stale_names,
      COUNT(*) FILTER (WHERE mv.voting_district_name ~ '^VD [0-9]+$') AS placeholders
    FROM ${mv} mv
    LEFT JOIN voting_districts vd ON mv.voting_district_code = vd.voting_district_code
  `);
  return res.rows[0];
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Mode: ${APPLY ? 'APPLY (refreshing)' : 'DRY RUN (set APPLY=1 to refresh)'} | host=${host}\n`);
  const pool = makePool();
  const client = await pool.connect();
  try {
    const mvs = await targets(client);
    console.log(`Materialized views referencing voting_districts: ${mvs.join(', ') || '(none)'}\n`);

    for (const mv of mvs) {
      const cols = await hasCols(client, mv);
      if (cols.has_code && cols.has_name) {
        const s = await staleness(client, mv);
        console.log(`## ${mv} (pre-refresh)`);
        console.table([s]);
      } else {
        console.log(`## ${mv}: no VD code/name columns — refresh-only (keeps counts current).`);
      }
    }

    if (!APPLY) { console.log('\nDry run complete. No refresh performed.'); return; }

    for (const mv of mvs) {
      let how = 'CONCURRENTLY';
      try {
        await client.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv}`);
      } catch (e) {
        how = 'plain (no unique index for CONCURRENTLY)';
        await client.query(`REFRESH MATERIALIZED VIEW ${mv}`);
      }
      console.log(`Refreshed ${mv} [${how}]`);
    }

    console.log('\n--- Post-refresh verification ---');
    for (const mv of mvs) {
      const cols = await hasCols(client, mv);
      if (!(cols.has_code && cols.has_name)) continue;
      const s = await staleness(client, mv);
      console.log(`## ${mv}`);
      console.table([s]);
      if (Number(s.placeholders) === 0 && Number(s.stale_names) === 0) {
        console.log('Confirmed: cache matches voting_districts; no "VD <code>" placeholders remain.');
      } else {
        console.log('NOTE: residual differences are codes with no matching voting_districts row.');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
