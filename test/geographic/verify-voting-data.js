/**
 * Post-sync verification for voting_districts / voting_stations.
 * Confirms counts, referential integrity, .0 sanitization and 1:1 mapping.
 *
 * Run from backend/:  node ../test/geographic/verify-voting-data.js
 */
const { makePool } = require('./lib-vslisting');

async function q(pool, label, sql) {
  const res = await pool.query(sql);
  console.log(`\n## ${label}`);
  console.table(res.rows);
}

async function main() {
  const pool = makePool();
  try {
    await q(pool, 'Final counts', `
      SELECT
        (SELECT COUNT(*) FROM voting_districts) AS voting_districts,
        (SELECT COUNT(*) FROM voting_stations)  AS voting_stations
    `);

    await q(pool, 'Orphan voting_stations (broken VD FK) - expect 0', `
      SELECT COUNT(*) AS orphan_stations_vd
      FROM voting_stations vs
      LEFT JOIN voting_districts vd ON vs.voting_district_code = vd.voting_district_code
      WHERE vd.voting_district_code IS NULL
    `);

    await q(pool, 'Orphan voting_stations (broken ward FK) - expect 0', `
      SELECT COUNT(*) AS orphan_stations_ward
      FROM voting_stations vs
      LEFT JOIN wards w ON vs.ward_code = w.ward_code
      WHERE w.ward_code IS NULL
    `);

    await q(pool, 'Orphan voting_districts (broken ward FK) - expect 0', `
      SELECT COUNT(*) AS orphan_vds_ward
      FROM voting_districts vd
      LEFT JOIN wards w ON vd.ward_code = w.ward_code
      WHERE w.ward_code IS NULL
    `);

    await q(pool, 'VD codes with .0 suffix - expect 0', `
      SELECT COUNT(*) AS vd_dot_zero FROM voting_districts WHERE voting_district_code LIKE '%.0'
    `);

    await q(pool, 'Station codes not equal to VD code (1:1 check) - expect 0', `
      SELECT COUNT(*) AS mismatch
      FROM voting_stations
      WHERE station_code IS DISTINCT FROM voting_district_code
    `);

    await q(pool, 'Sample joined VD -> ward -> municipality -> province', `
      SELECT vs.station_code, vs.station_name, vd.voting_district_code,
             w.ward_code, mu.municipality_name, p.province_name
      FROM voting_stations vs
      JOIN voting_districts vd ON vs.voting_district_code = vd.voting_district_code
      JOIN wards w ON vd.ward_code = w.ward_code
      JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      ORDER BY vs.voting_station_id LIMIT 8
    `);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
