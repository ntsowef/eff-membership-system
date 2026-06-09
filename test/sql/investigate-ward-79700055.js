// Investigate VD-count discrepancy for ward 79700055
// Production reports 71 VDs, local reports 7. Probe the relevant tables/joins.
const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await c.connect();
  const WARD = '79700055';

  const probes = [
    {
      label: '1) voting_districts directly bound to ward_code = 79700055 (all)',
      sql: `SELECT voting_district_code, voting_district_name, ward_code, is_active
            FROM voting_districts WHERE ward_code = $1 ORDER BY voting_district_code`,
    },
    {
      label: '2) Count: voting_districts.ward_code = WARD, is_active = TRUE',
      sql: `SELECT COUNT(*)::int AS n FROM voting_districts WHERE ward_code = $1 AND is_active = TRUE`,
    },
    {
      label: '3) Count: voting_districts.ward_code = WARD, all',
      sql: `SELECT COUNT(*)::int AS n FROM voting_districts WHERE ward_code = $1`,
    },
    {
      label: '4) Distinct voting_district_codes seen in members_consolidated for that ward_code',
      sql: `SELECT DISTINCT voting_district_code
            FROM members_consolidated WHERE ward_code = $1 ORDER BY voting_district_code`,
    },
    {
      label: '5) Count members per voting_district_code for ward 79700055',
      sql: `SELECT voting_district_code, COUNT(*)::int AS member_count
            FROM members_consolidated WHERE ward_code = $1
            GROUP BY voting_district_code ORDER BY member_count DESC`,
    },
    {
      label: '6) Members whose VD code does NOT exist in voting_districts at all',
      sql: `SELECT m.voting_district_code, COUNT(*)::int AS member_count
            FROM members_consolidated m
            LEFT JOIN voting_districts vd ON vd.voting_district_code = m.voting_district_code
            WHERE m.ward_code = $1 AND vd.voting_district_code IS NULL
            GROUP BY m.voting_district_code ORDER BY member_count DESC`,
    },
    {
      label: '7) Same query the LGE2026 route uses (LEFT JOIN on voting_districts.ward_code)',
      sql: `SELECT vd.voting_district_code, vd.voting_district_name,
                   COUNT(m.member_id)::int AS member_count
            FROM voting_districts vd
            LEFT JOIN members_consolidated m
              ON m.voting_district_code = vd.voting_district_code
            WHERE vd.ward_code = $1 AND vd.is_active = TRUE
            GROUP BY vd.voting_district_code, vd.voting_district_name
            ORDER BY member_count DESC, vd.voting_district_code ASC`,
    },
    {
      label: '8) Same query but WITHOUT the is_active filter',
      sql: `SELECT vd.voting_district_code, vd.voting_district_name, vd.is_active,
                   COUNT(m.member_id)::int AS member_count
            FROM voting_districts vd
            LEFT JOIN members_consolidated m
              ON m.voting_district_code = vd.voting_district_code
            WHERE vd.ward_code = $1
            GROUP BY vd.voting_district_code, vd.voting_district_name, vd.is_active
            ORDER BY member_count DESC, vd.voting_district_code ASC`,
    },
    {
      label: '9) How many duplicate voting_district_code rows exist across the table?',
      sql: `SELECT voting_district_code, COUNT(*)::int AS dup_count
            FROM voting_districts
            GROUP BY voting_district_code
            HAVING COUNT(*) > 1
            ORDER BY dup_count DESC LIMIT 20`,
    },
    {
      label: '10) Are there duplicate VD codes specifically tied to this ward?',
      sql: `SELECT voting_district_code, ward_code, COUNT(*)::int AS dup_count
            FROM voting_districts
            WHERE ward_code = $1
            GROUP BY voting_district_code, ward_code
            HAVING COUNT(*) > 1`,
    },
    {
      label: '11) Ward row itself',
      sql: `SELECT ward_code, ward_number, ward_name, municipality_code, is_active
            FROM wards WHERE ward_code = $1`,
    },
  ];

  for (const p of probes) {
    console.log('\n=====', p.label, '=====');
    try {
      const r = await c.query(p.sql, [WARD]);
      console.log(`rows: ${r.rowCount}`);
      r.rows.slice(0, 80).forEach((row) => console.log(' ', row));
    } catch (e) {
      console.error(' ERROR:', e.message);
    }
  }
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
