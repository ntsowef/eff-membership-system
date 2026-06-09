// Inspect the exact (voting_district_name, voting_district_code) groupings the
// WordDocumentService.generateWardAttendanceRegister builds. Stations in the
// attendance register are 1 group per distinct (name, code) pair from members.
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

  console.log('\n===== A) Distinct (voting_district_code, voting_district_name) pairs for ward members =====');
  const a = await c.query(
    `SELECT
       voting_district_code,
       voting_district_name,
       COUNT(*)::int AS members
     FROM members_consolidated
     WHERE ward_code = $1
     GROUP BY voting_district_code, voting_district_name
     ORDER BY members DESC`,
    [WARD]
  );
  console.log(`distinct (code,name) pairs for ward members: ${a.rowCount}`);
  a.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== B) Count of distinct station keys exactly like WordDocumentService =====');
  // The service uses: vd_name || "Not Registered to vote" and vd_code || "999999999"
  // and reclassifies code "999999999" / "222222222" specifically.
  const b = await c.query(
    `WITH normalized AS (
       SELECT
         COALESCE(NULLIF(TRIM(voting_district_name), ''), 'Not Registered to vote') AS station_name,
         COALESCE(NULLIF(TRIM(voting_district_code), ''), '999999999') AS vd_code
       FROM members_consolidated
       WHERE ward_code = $1
     )
     SELECT station_name, vd_code, COUNT(*)::int AS members
     FROM normalized
     GROUP BY station_name, vd_code
     ORDER BY members DESC`,
    [WARD]
  );
  console.log(`distinct station keys: ${b.rowCount}`);
  b.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== C) Look for whitespace / case / NBSP variants in voting_district_name =====');
  const ccount = await c.query(
    `SELECT
       voting_district_code,
       COUNT(DISTINCT voting_district_name)::int AS distinct_names,
       COUNT(DISTINCT LOWER(TRIM(voting_district_name)))::int AS distinct_names_trimmed_lower
     FROM members_consolidated
     WHERE ward_code = $1
     GROUP BY voting_district_code
     HAVING COUNT(DISTINCT voting_district_name) > 1
     ORDER BY distinct_names DESC`,
    [WARD]
  );
  console.log(`vd_codes with >1 name variants: ${ccount.rowCount}`);
  ccount.rows.forEach((r) => console.log(' ', r));

  console.log('\n===== D) Quick sanity: are voting_district_name / voting_station_name columns of members_consolidated denormalized? =====');
  // Check if there's a snapshot/duplicate of vd info on members_consolidated itself.
  const cols = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='members_consolidated'
       AND column_name IN ('voting_district_code','voting_district_name','voting_station_name')
     ORDER BY column_name`
  );
  console.log('relevant columns present:');
  cols.rows.forEach((r) => console.log(' ', r));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
