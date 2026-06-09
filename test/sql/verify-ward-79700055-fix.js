// Verify the join-constraint fix: simulate the patched LEFT JOIN and confirm the
// distinct (vd_name, vd_code) group count drops to a sensible number for ward 79700055.
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
  const SENTINELS = ['22222222','33333333','99999999','222222222','333333333','999999999'];

  console.log('\n===== BEFORE (old join, code-only) =====');
  const before = await c.query(
    `SELECT
       COALESCE(NULLIF(TRIM(vd.voting_district_name), ''), '<NULL>') AS vd_name,
       m.voting_district_code AS member_vd_code,
       COUNT(*)::int AS rows
     FROM members_consolidated m
     LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
     WHERE m.ward_code = $1
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1
     GROUP BY vd.voting_district_name, m.voting_district_code
     ORDER BY rows DESC`,
    [WARD]
  );
  console.log(`distinct station keys: ${before.rowCount}`);
  before.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== AFTER (patched join with ward_code + sentinel carve-out) =====');
  const after = await c.query(
    `SELECT
       COALESCE(NULLIF(TRIM(vd.voting_district_name), ''), '<NULL>') AS vd_name,
       m.voting_district_code AS member_vd_code,
       COUNT(*)::int AS rows
     FROM members_consolidated m
     LEFT JOIN voting_districts vd
       ON m.voting_district_code = vd.voting_district_code
      AND (
           vd.ward_code = m.ward_code
           OR vd.voting_district_code = ANY($2::text[])
       )
     WHERE m.ward_code = $1
       AND m.membership_status_id = 1
       AND m.voter_status_id = 1
     GROUP BY vd.voting_district_name, m.voting_district_code
     ORDER BY rows DESC`,
    [WARD, SENTINELS]
  );
  console.log(`distinct station keys: ${after.rowCount}`);
  after.rows.forEach((r) => console.log(' ', r));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
