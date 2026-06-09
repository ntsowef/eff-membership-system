/**
 * Inspect current geographic DB state in eff_membership_database (PostgreSQL).
 * Uses credentials from backend/.env.
 *
 * Run from backend/:  node ../test/geographic/inspect-db-state.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function q(label, sql) {
  const res = await pool.query(sql);
  console.log(`\n## ${label}`);
  console.table(res.rows);
  return res.rows;
}

async function main() {
  console.log(`DB: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);

  await q('Counts', `
    SELECT
      (SELECT COUNT(*) FROM provinces) AS provinces,
      (SELECT COUNT(*) FROM districts) AS districts,
      (SELECT COUNT(*) FROM municipalities) AS municipalities,
      (SELECT COUNT(*) FROM wards) AS wards,
      (SELECT COUNT(*) FROM voting_districts) AS voting_districts,
      (SELECT COUNT(*) FROM voting_stations) AS voting_stations
  `);

  await q('Sample voting_districts', `
    SELECT voting_district_id, voting_district_code, voting_district_name, ward_code, is_active
    FROM voting_districts ORDER BY voting_district_id LIMIT 5
  `);

  await q('Sample voting_stations', `
    SELECT voting_station_id, station_code, station_name, voting_district_code, ward_code, is_active
    FROM voting_stations ORDER BY voting_station_id LIMIT 5
  `);

  await q('Sample wards', `
    SELECT ward_id, ward_code, ward_name, ward_number, municipality_code FROM wards ORDER BY ward_id LIMIT 5
  `);

  await q('Sample provinces', `SELECT province_code, province_name FROM provinces ORDER BY province_code`);

  await q('VD codes with .0 suffix', `
    SELECT COUNT(*) AS vd_with_dot_zero FROM voting_districts WHERE voting_district_code LIKE '%.0'
  `);

  // How many wards from a sample of the file already exist? We will validate in sync script.
  await q('Ward code length distribution', `
    SELECT LENGTH(ward_code) AS len, COUNT(*) AS n FROM wards GROUP BY LENGTH(ward_code) ORDER BY len
  `);

  await q('VD code length distribution', `
    SELECT LENGTH(voting_district_code) AS len, COUNT(*) AS n
    FROM voting_districts GROUP BY LENGTH(voting_district_code) ORDER BY len
  `);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
