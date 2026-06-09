// Check for duplicate voting_district_code rows in voting_districts, which
// would multiply member rows when joined without ward_code in the attendance
// register query.
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

  console.log('\n===== 1) Duplicate voting_district_code rows across voting_districts =====');
  const dup = await c.query(
    `SELECT voting_district_code, COUNT(*)::int AS rows
     FROM voting_districts
     GROUP BY voting_district_code
     HAVING COUNT(*) > 1
     ORDER BY rows DESC
     LIMIT 30`
  );
  console.log(`voting_district_codes with >1 row: ${dup.rowCount}`);
  dup.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== 2) Sentinel VD codes - all matching rows in voting_districts =====');
  const sentinel = await c.query(
    `SELECT voting_district_code, voting_district_name, ward_code, is_active
     FROM voting_districts
     WHERE voting_district_code IN ('22222222','33333333','99999999','222222222','999999999')
     ORDER BY voting_district_code, ward_code`
  );
  console.log(`rows: ${sentinel.rowCount}`);
  sentinel.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== 3) Simulate the actual members query LEFT JOIN row count for ward 79700055 =====');
  const sim = await c.query(
    `SELECT COUNT(*)::int AS joined_rows
     FROM members_consolidated m
     LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
     WHERE m.ward_code = $1
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1`,
    [WARD]
  );
  console.log(' ', sim.rows[0]);

  console.log('\n===== 4) Distinct (vd.voting_district_code, vd.voting_district_name) produced by the join =====');
  const distinctGroups = await c.query(
    `SELECT
       COALESCE(NULLIF(TRIM(vd.voting_district_name), ''), '') AS vd_name,
       m.voting_district_code AS member_vd_code,
       COUNT(*)::int AS joined_member_rows
     FROM members_consolidated m
     LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
     WHERE m.ward_code = $1
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1
     GROUP BY vd.voting_district_name, m.voting_district_code
     ORDER BY joined_member_rows DESC`,
    [WARD]
  );
  console.log(`distinct (vd_name, member_vd_code) pairs after join: ${distinctGroups.rowCount}`);
  distinctGroups.rows.forEach((r) => console.log(' ', r));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
