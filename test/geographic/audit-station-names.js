/**
 * Audit voting_station names vs the master .xlsb file to answer:
 * "were any station names changed away from the source data?"
 *
 * Reports: sentinel leftovers, the test station's current name, and any DB
 * station whose name differs from the file's "Voting Station Name".
 *
 * Run from backend/:  node ../test/geographic/audit-station-names.js
 */
const { readRows, makePool } = require('./lib-vslisting');

async function main() {
  const rows = readRows();
  // file: station_code (= vd_code) -> station_name
  const fileName = new Map();
  for (const r of rows) if (r.vd_code) fileName.set(r.vd_code, r.station_name);

  const pool = makePool();
  try {
    const sentinel = await pool.query(
      `SELECT COUNT(*) AS n FROM voting_stations WHERE station_name LIKE '\\_\\_SENTINEL%'`
    );
    console.log(`Stations still named with test sentinel: ${sentinel.rows[0].n}`);

    const test = await pool.query(
      `SELECT station_code, station_name FROM voting_stations WHERE station_code = '10590151'`
    );
    console.log(`Test station 10590151 current name: "${test.rows[0]?.station_name}"`);

    const db = await pool.query('SELECT station_code, station_name FROM voting_stations');
    let differs = 0, notInFile = 0;
    const samples = [];
    for (const r of db.rows) {
      if (!fileName.has(r.station_code)) { notInFile++; continue; }
      if ((fileName.get(r.station_code) || '') !== (r.station_name || '')) {
        differs++;
        if (samples.length < 15) {
          samples.push({ station_code: r.station_code, db_name: r.station_name, file_name: fileName.get(r.station_code) });
        }
      }
    }

    console.log(`\nTotal stations in DB:                 ${db.rows.length}`);
    console.log(`Stations whose name DIFFERS from file: ${differs}`);
    console.log(`Stations in DB but NOT in file:        ${notInFile}`);
    if (samples.length) console.table(samples);
    else console.log('No name differences found — all DB names match the master file exactly.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
