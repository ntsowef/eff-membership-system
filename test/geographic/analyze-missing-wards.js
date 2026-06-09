/**
 * Analyze the wards present in VSListing_20260601.xlsb but missing from the DB.
 * For each missing ward, infer its municipality_code from SIBLING wards (other
 * wards in the same file `Municipality` that already exist in the DB and thus
 * already carry a municipality_code). Reports whether the mapping is
 * unambiguous so wards can be created without breaking referential integrity.
 *
 * Run from backend/:  node ../test/geographic/analyze-missing-wards.js
 */
const { readRows, makePool } = require('./lib-vslisting');

async function main() {
  const rows = readRows();
  const pool = makePool();
  try {
    const wardRes = await pool.query('SELECT ward_code, municipality_code FROM wards');
    const dbWardMuni = new Map(wardRes.rows.map((r) => [r.ward_code, r.municipality_code]));
    const muniRes = await pool.query('SELECT municipality_code, municipality_name FROM municipalities');
    const dbMuniCodes = new Set(muniRes.rows.map((r) => r.municipality_code));

    // Group file rows by Municipality name -> set of municipality_codes used by existing sibling wards
    const muniNameToCodes = new Map(); // municipality_name -> Map(municipality_code -> count)
    for (const r of rows) {
      if (!r.ward_code || !r.municipality_name) continue;
      const muCode = dbWardMuni.get(r.ward_code);
      if (!muCode) continue; // ward not in DB, skip for inference source
      if (!muniNameToCodes.has(r.municipality_name)) muniNameToCodes.set(r.municipality_name, new Map());
      const m = muniNameToCodes.get(r.municipality_name);
      m.set(muCode, (m.get(muCode) || 0) + 1);
    }

    // Collect missing wards with representative file attributes
    const missing = new Map(); // ward_code -> {province_name, district_name, munic_code, municipality_name}
    for (const r of rows) {
      if (!r.ward_code || dbWardMuni.has(r.ward_code)) continue;
      if (!missing.has(r.ward_code)) {
        missing.set(r.ward_code, {
          ward_code: r.ward_code,
          province_name: r.province_name,
          district_name: r.district_name,
          munic_code: r.munic_code,
          municipality_name: r.municipality_name,
        });
      }
    }

    const report = [];
    let resolvable = 0, ambiguous = 0, unresolved = 0;
    for (const w of missing.values()) {
      const codes = muniNameToCodes.get(w.municipality_name);
      let inferred = null, status;
      if (codes && codes.size === 1) {
        inferred = [...codes.keys()][0];
        status = 'OK (sibling)';
        resolvable++;
      } else if (codes && codes.size > 1) {
        // pick the most common, flag ambiguous
        inferred = [...codes.entries()].sort((a, b) => b[1] - a[1])[0][0];
        status = `AMBIGUOUS(${codes.size})`;
        ambiguous++;
      } else if (w.munic_code && dbMuniCodes.has(w.munic_code)) {
        inferred = w.munic_code;
        status = 'OK (munic code)';
        resolvable++;
      } else {
        status = 'UNRESOLVED';
        unresolved++;
      }
      report.push({ ward: w.ward_code, municipality_name: w.municipality_name, inferred_muni: inferred, status });
    }

    report.sort((a, b) => a.ward.localeCompare(b.ward));
    console.log(`Missing wards: ${missing.size}`);
    console.table(report);
    console.log(`\nResolvable: ${resolvable}, Ambiguous(most-common chosen): ${ambiguous}, Unresolved: ${unresolved}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
