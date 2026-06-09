/**
 * Replace placeholder voting_district_name values ("VD <code>") that were
 * generated for newly-created VDs with the corresponding voting station name
 * from the master file. Only EXACT placeholders are touched:
 *   voting_district_name = 'VD ' || voting_district_code
 * so legitimate names that merely start with "VD " are left untouched.
 *
 * Source of the real name: voting_stations.station_name (station_code = vd_code),
 * which was loaded verbatim from VSListing_20260601.xlsb.
 *
 * Safety: dry run unless APPLY=1.
 *   node ../test/geographic/update-placeholder-vd-names.js          (dry run)
 *   $env:APPLY=1; node ../test/geographic/update-placeholder-vd-names.js  (apply)
 */
const { makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

const MATCH = `vd.voting_district_name = 'VD ' || vd.voting_district_code`;

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (set APPLY=1 to write)'}`);
  const pool = makePool();
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      SELECT
        COUNT(*) AS placeholder_vds,
        SUM(CASE WHEN vs.station_name IS NOT NULL AND vs.station_name <> '' THEN 1 ELSE 0 END) AS updatable,
        SUM(CASE WHEN vs.station_code IS NULL THEN 1 ELSE 0 END) AS no_station_match
      FROM voting_districts vd
      LEFT JOIN voting_stations vs ON vs.station_code = vd.voting_district_code
      WHERE ${MATCH}
    `);
    console.log('\n## Placeholder analysis');
    console.table(stats.rows);

    const sample = await client.query(`
      SELECT vd.voting_district_code AS code, vd.voting_district_name AS current_name,
             vs.station_name AS new_name
      FROM voting_districts vd
      JOIN voting_stations vs ON vs.station_code = vd.voting_district_code
      WHERE ${MATCH} AND vs.station_name IS NOT NULL AND vs.station_name <> ''
      ORDER BY vd.voting_district_id LIMIT 10
    `);
    console.log('\n## Sample of changes to apply');
    console.table(sample.rows);

    if (!APPLY) { console.log('\nDry run complete. No changes written.'); return; }

    await client.query('BEGIN');
    const res = await client.query(`
      UPDATE voting_districts vd
      SET voting_district_name = vs.station_name, updated_at = now()
      FROM voting_stations vs
      WHERE vs.station_code = vd.voting_district_code
        AND ${MATCH}
        AND vs.station_name IS NOT NULL AND vs.station_name <> ''
    `);
    await client.query('COMMIT');

    const remaining = await client.query(
      `SELECT COUNT(*) AS n FROM voting_districts vd WHERE ${MATCH}`
    );
    console.log('\n--- Result (committed) ---');
    console.log(`VD names updated from station name: ${res.rowCount}`);
    console.log(`Placeholder VD names remaining:     ${remaining.rows[0].n}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
