/**
 * Compare voting_district_name vs station_name for matching codes
 * (voting_districts.voting_district_code = voting_stations.station_code).
 * Run from backend/:  node ../test/geographic/audit-vd-vs-names.js
 */
const { makePool } = require('./lib-vslisting');

async function main() {
  const pool = makePool();
  try {
    const counts = await pool.query(`
      SELECT
        COUNT(*) AS matched_pairs,
        SUM(CASE WHEN vd.voting_district_name = vs.station_name THEN 1 ELSE 0 END) AS same_name,
        SUM(CASE WHEN vd.voting_district_name <> vs.station_name THEN 1 ELSE 0 END) AS different_name,
        SUM(CASE WHEN vd.voting_district_name LIKE 'VD %' THEN 1 ELSE 0 END) AS vd_placeholder_names
      FROM voting_districts vd
      JOIN voting_stations vs ON vs.station_code = vd.voting_district_code
    `);
    console.log('## Summary (codes present in both tables)');
    console.table(counts.rows);

    const sample = await pool.query(`
      SELECT vd.voting_district_code AS code,
             vd.voting_district_name AS voting_district_name,
             vs.station_name         AS voting_station_name
      FROM voting_districts vd
      JOIN voting_stations vs ON vs.station_code = vd.voting_district_code
      ORDER BY vd.voting_district_id LIMIT 10
    `);
    console.log('\n## Sample rows');
    console.table(sample.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
