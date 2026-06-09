// For ward 79700055, are any member rows joined to a voting_district that
// actually belongs to a *different* ward? Those would each become a separate
// "station" in the attendance register and inflate the VD count.
const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

(async () => {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await c.connect();
  const WARD = '79700055';

  console.log('\n===== Members with VD codes whose vd.ward_code != m.ward_code =====');
  const r = await c.query(
    `SELECT m.voting_district_code,
            vd.voting_district_name,
            vd.ward_code AS vd_ward_code,
            m.ward_code  AS member_ward_code,
            COUNT(*)::int AS member_count
     FROM members_consolidated m
     LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
     WHERE m.ward_code = $1
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1
       AND vd.ward_code IS DISTINCT FROM m.ward_code
     GROUP BY m.voting_district_code, vd.voting_district_name, vd.ward_code, m.ward_code
     ORDER BY member_count DESC`,
    [WARD]
  );
  console.log(`groups: ${r.rowCount}`);
  r.rows.forEach((row) => console.log(' ', row));

  console.log('\n===== Same shape, but counting distinct foreign vd_codes across all wards (table-wide) =====');
  const foreign = await c.query(
    `SELECT COUNT(*)::int AS member_rows_with_foreign_vd
     FROM members_consolidated m
     JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
     WHERE vd.ward_code IS DISTINCT FROM m.ward_code
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1`
  );
  console.log(' ', foreign.rows[0]);

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
