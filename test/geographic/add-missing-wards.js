/**
 * Create the wards that exist in VSListing_20260601.xlsb but are missing from
 * the DB, so the previously-skipped VDs/stations can be linked.
 *
 * municipality_code resolution (referential integrity preserved):
 *   1) unique sibling ward in the same file Municipality (already in DB), else
 *   2) file `Munic Code` if it matches an existing municipality_code (metros
 *      CPT/ETH and, after creation, FS164).
 * The new 2026 municipality FS164 (district DC16, province FS) is created first.
 * ward_number/name are derived from the last 3 digits of the 8-digit ward code.
 *
 * Safety: dry run unless APPLY=1.
 *   node ../test/geographic/add-missing-wards.js          (dry run)
 *   $env:APPLY=1; node ../test/geographic/add-missing-wards.js   (apply)
 */
const { readRows, makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

// New municipality that must exist before its wards can be inserted.
const NEW_MUNICIPALITIES = [
  { code: 'FS164', name: 'New Local Municipality', district_code: 'DC16', province_code: 'FS' },
];

function wardNumber(code) {
  const n = parseInt(String(code).slice(-3), 10);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (set APPLY=1 to write)'}`);
  const rows = readRows();
  const pool = makePool();
  const client = await pool.connect();
  try {
    const wardRes = await client.query('SELECT ward_code, municipality_code FROM wards');
    const dbWardMuni = new Map(wardRes.rows.map((r) => [r.ward_code, r.municipality_code]));
    const muniRes = await client.query('SELECT municipality_code FROM municipalities');
    const dbMuni = new Set(muniRes.rows.map((r) => r.municipality_code));

    // Sibling map: municipality_name -> unique existing municipality_code
    const nameToCodes = new Map();
    for (const r of rows) {
      if (!r.ward_code || !r.municipality_name) continue;
      const mc = dbWardMuni.get(r.ward_code);
      if (!mc) continue;
      if (!nameToCodes.has(r.municipality_name)) nameToCodes.set(r.municipality_name, new Set());
      nameToCodes.get(r.municipality_name).add(mc);
    }

    // Assume the to-be-created municipalities exist for resolution purposes
    const willExist = new Set([...dbMuni, ...NEW_MUNICIPALITIES.map((m) => m.code)]);

    // Collect & resolve missing wards
    const missing = new Map();
    for (const r of rows) {
      if (!r.ward_code || dbWardMuni.has(r.ward_code) || missing.has(r.ward_code)) continue;
      const siblings = nameToCodes.get(r.municipality_name);
      let muni = null, how;
      if (siblings && siblings.size === 1) { muni = [...siblings][0]; how = 'sibling'; }
      else if (r.munic_code && willExist.has(r.munic_code)) { muni = r.munic_code; how = 'munic_code'; }
      missing.set(r.ward_code, {
        ward_code: r.ward_code, municipality_code: muni, how,
        municipality_name: r.municipality_name,
        ward_number: wardNumber(r.ward_code),
      });
    }

    const resolved = [...missing.values()].filter((w) => w.municipality_code);
    const unresolved = [...missing.values()].filter((w) => !w.municipality_code);
    console.log(`\nMissing wards: ${missing.size} | resolved: ${resolved.length} | unresolved: ${unresolved.length}`);
    console.table(resolved.map((w) => ({ ward: w.ward_code, num: w.ward_number, muni: w.municipality_code, via: w.how })));
    if (unresolved.length) console.table(unresolved.map((w) => ({ ward: w.ward_code, name: w.municipality_name })));

    if (!APPLY) { console.log('\nDry run complete. No changes written.'); return; }

    await client.query('BEGIN');
    let muniCreated = 0;
    for (const m of NEW_MUNICIPALITIES) {
      const res = await client.query(
        `INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, province_code, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,'Local',$4,true,now(),now())
         ON CONFLICT (municipality_code) DO NOTHING RETURNING municipality_code`,
        [m.code, m.name, m.district_code, m.province_code]
      );
      muniCreated += res.rowCount;
    }

    let wardCreated = 0;
    for (const w of resolved) {
      const res = await client.query(
        `INSERT INTO wards (ward_code, ward_name, ward_number, municipality_code, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,true,now(),now())
         ON CONFLICT (ward_code) DO NOTHING RETURNING ward_code`,
        [w.ward_code, `Ward ${w.ward_number}`, w.ward_number, w.municipality_code]
      );
      wardCreated += res.rowCount;
    }
    await client.query('COMMIT');

    console.log(`\n--- Result (committed) ---`);
    console.log(`Municipalities created: ${muniCreated} (${NEW_MUNICIPALITIES.map((m) => m.code).join(', ')})`);
    console.log(`Wards created:          ${wardCreated}`);
    console.log(`Wards still unresolved: ${unresolved.length}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
