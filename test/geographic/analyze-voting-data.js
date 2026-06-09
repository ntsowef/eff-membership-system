/**
 * DRY-RUN analysis for the VSListing voting-data sync.
 * Reports counts, 1:1 VD<->Station assumption, and the gap vs the live DB
 * (missing wards, new vs existing VDs). Makes NO changes.
 *
 * Run from backend/:  node ../test/geographic/analyze-voting-data.js
 */
const { readRows, makePool } = require('./lib-vslisting');

async function main() {
  const rows = readRows();
  console.log(`Total data rows in file: ${rows.length}`);

  const vdSet = new Set();
  const wardSet = new Set();
  const vdToWard = new Map();
  let dupVdDifferentWard = 0;
  let missingVd = 0, missingWard = 0, missingProvince = 0, missingStation = 0;
  const vdCounts = new Map(); // vd_code -> occurrences (to test 1:1 with stations)

  for (const r of rows) {
    if (!r.vd_code) missingVd++;
    if (!r.ward_code) missingWard++;
    if (!r.province_code) missingProvince++;
    if (!r.station_name) missingStation++;
    if (r.vd_code) {
      vdSet.add(r.vd_code);
      vdCounts.set(r.vd_code, (vdCounts.get(r.vd_code) || 0) + 1);
      if (r.ward_code) {
        if (vdToWard.has(r.vd_code) && vdToWard.get(r.vd_code) !== r.ward_code) {
          dupVdDifferentWard++;
        } else {
          vdToWard.set(r.vd_code, r.ward_code);
        }
      }
    }
    if (r.ward_code) wardSet.add(r.ward_code);
  }

  const vdWithMultipleRows = [...vdCounts.values()].filter((n) => n > 1).length;

  console.log('\n--- File summary ---');
  console.log(`Distinct VD codes:        ${vdSet.size}`);
  console.log(`Distinct ward codes:      ${wardSet.size}`);
  console.log(`VD codes with >1 row:     ${vdWithMultipleRows}  (>0 means NOT strictly 1:1 VD->station)`);
  console.log(`VD codes mapped to >1 ward:${dupVdDifferentWard}`);
  console.log(`Rows missing VD code:     ${missingVd}`);
  console.log(`Rows missing ward code:   ${missingWard}`);
  console.log(`Rows missing province:    ${missingProvince}`);
  console.log(`Rows missing station name:${missingStation}`);

  const pool = makePool();
  try {
    const wardRes = await pool.query('SELECT ward_code FROM wards');
    const dbWards = new Set(wardRes.rows.map((x) => x.ward_code));
    const vdRes = await pool.query('SELECT voting_district_code FROM voting_districts');
    const dbVds = new Set(vdRes.rows.map((x) => x.voting_district_code));

    const missingWardsInDb = [...wardSet].filter((w) => !dbWards.has(w));
    const newVds = [...vdSet].filter((v) => !dbVds.has(v));
    const existingVds = [...vdSet].filter((v) => dbVds.has(v));

    // VDs that would be skipped because their ward does not exist in DB
    const vdsBlockedByWard = [...vdToWard.entries()].filter(([, w]) => !dbWards.has(w));

    console.log('\n--- DB comparison ---');
    console.log(`Wards in DB:                      ${dbWards.size}`);
    console.log(`VDs in DB:                        ${dbVds.size}`);
    console.log(`File wards MISSING from DB:       ${missingWardsInDb.length}`);
    console.log(`  sample: ${JSON.stringify(missingWardsInDb.slice(0, 15))}`);
    console.log(`File VDs that are NEW:            ${newVds.length}`);
    console.log(`File VDs that already EXIST:      ${existingVds.length}`);
    console.log(`VDs blocked by missing ward (FK): ${vdsBlockedByWard.length}`);
    console.log(`  sample: ${JSON.stringify(vdsBlockedByWard.slice(0, 15))}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
