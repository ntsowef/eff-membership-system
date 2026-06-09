/**
 * Integration test for the updated voting_stations upsert behaviour:
 *  - existing station_name is PRESERVED on conflict (not overwritten by Excel)
 *  - voting_district_code is IMMUTABLE on conflict
 *  - geographic/admin fields (latitude, longitude, is_active, updated_at) refresh
 *
 * It mutates one existing station to a sentinel name + null coords, runs the
 * real sync (APPLY=1), asserts the expected outcome, then restores the row.
 *
 * Run from backend/:  node ../test/geographic/test-vs-name-preservation.js
 */
const { execSync } = require('child_process');
const path = require('path');
const { makePool } = require('./lib-vslisting');

const SENTINEL = '__SENTINEL_TEST_NAME__';
const SYNC = path.join(__dirname, 'sync-voting-data.js');

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${label}`);
  if (!cond) failures++;
}

async function main() {
  const pool = makePool();
  let orig;
  try {
    // Pick an existing station that came from the file.
    const pick = await pool.query(
      `SELECT station_code, station_name, voting_district_code, ward_code, latitude
       FROM voting_stations ORDER BY voting_station_id LIMIT 1`
    );
    if (!pick.rows.length) throw new Error('No voting_stations to test against.');
    orig = pick.rows[0];
    console.log(`Testing station_code=${orig.station_code} (orig name="${orig.station_name}")`);

    // Mutate: sentinel name, wipe latitude, backdate updated_at.
    await pool.query(
      `UPDATE voting_stations
       SET station_name = $1, latitude = NULL, updated_at = '2000-01-01'
       WHERE station_code = $2`,
      [SENTINEL, orig.station_code]
    );

    // Run the real sync (writes). Inherit stdio so we see its summary.
    console.log('\n--- Running sync-voting-data.js (APPLY=1) ---');
    execSync(`node "${SYNC}"`, {
      cwd: path.join(__dirname, '..', '..', 'backend'),
      env: { ...process.env, APPLY: '1' },
      stdio: 'inherit',
    });

    const after = (await pool.query(
      `SELECT station_name, voting_district_code, latitude, updated_at
       FROM voting_stations WHERE station_code = $1`,
      [orig.station_code]
    )).rows[0];

    console.log('\n--- Assertions ---');
    check('station_name preserved (sentinel kept, Excel name NOT applied)',
      after.station_name === SENTINEL);
    check('voting_district_code immutable',
      after.voting_district_code === orig.voting_district_code);
    check('latitude refreshed from file (no longer null)',
      after.latitude !== null);
    check('updated_at refreshed (newer than backdated value)',
      new Date(after.updated_at).getTime() > new Date('2000-01-02').getTime());

    // Restore the original station_name so the row matches the master file.
    await pool.query(
      `UPDATE voting_stations SET station_name = $1, updated_at = now() WHERE station_code = $2`,
      [orig.station_name, orig.station_code]
    );
    console.log(`\nRestored original station_name for ${orig.station_code}.`);
  } finally {
    await pool.end();
  }

  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
