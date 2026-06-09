/**
 * Audit Voting District (VD) ward movements between the current database state
 * and the 2026 master file (VSListing_20260601.xlsb).
 *
 * For every voting_district_code present in BOTH the DB and the file, compare
 * the stored ward_code against the file ward_code. Both sides are sanitized
 * (trailing ".0" stripped, whitespace trimmed) before comparison to avoid
 * false mismatches.
 *
 * Reports:
 *   - total VDs analyzed (present in both DB and file)
 *   - moved   (DB ward_code != file ward_code)
 *   - unchanged
 *   - sample (<=20) of moved VDs: code, old_ward_code (DB), new_ward_code (file)
 *   - referential-integrity risk: moved VDs whose new_ward_code is NOT in `wards`
 *
 * Read-only. Target production:
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/audit-ward-movements.js
 */
const { readRows, makePool, sanitizeCode } = require('./lib-vslisting');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Auditing ward movements against host=${host}\n`);

  // File: voting_district_code -> sanitized ward_code (readRows already sanitizes).
  const rows = readRows();
  const fileWard = new Map();
  for (const r of rows) {
    if (!r.vd_code) continue;
    fileWard.set(r.vd_code, r.ward_code != null ? sanitizeCode(r.ward_code) : null);
  }

  const pool = makePool();
  try {
    // Existing wards (sanitized) for the referential-integrity check.
    const wardRes = await pool.query('SELECT ward_code FROM wards');
    const dbWards = new Set(wardRes.rows.map((w) => sanitizeCode(w.ward_code)));

    // Current DB VD -> ward_code.
    const vdRes = await pool.query(
      'SELECT voting_district_code, ward_code FROM voting_districts'
    );

    let analyzed = 0;
    let moved = 0;
    let unchanged = 0;
    let dbOnly = 0; // in DB but not in the file (not analyzed)
    const movedRows = [];
    const movedToMissingWard = [];
    const dbVdCodes = new Set();

    for (const r of vdRes.rows) {
      const code = sanitizeCode(r.voting_district_code);
      dbVdCodes.add(code);
      if (!fileWard.has(code)) { dbOnly++; continue; }
      analyzed++;
      const oldWard = r.ward_code != null ? sanitizeCode(r.ward_code) : null;
      const newWard = fileWard.get(code);
      if (oldWard === newWard) {
        unchanged++;
      } else {
        moved++;
        const rec = { voting_district_code: code, old_ward_code: oldWard, new_ward_code: newWard };
        if (movedRows.length < 20) movedRows.push(rec);
        if (newWard == null || !dbWards.has(newWard)) movedToMissingWard.push(rec);
      }
    }

    console.log('## Statistical summary');
    console.table([{
      total_vds_analyzed: analyzed,
      moved,
      unchanged,
      in_db_not_in_file: dbOnly,
      in_file_not_in_db: [...fileWard.keys()].filter((c) => !dbVdCodes.has(c)).length,
    }]);

    console.log('\n## Sample of moved VDs (max 20)');
    if (movedRows.length) console.table(movedRows);
    else console.log('No VDs have moved — every analyzed VD ward_code matches the 2026 file.');

    console.log('\n## Referential-integrity risk: moved VDs whose new ward does NOT exist in `wards`');
    console.log(`Moved VDs targeting a missing ward: ${movedToMissingWard.length}`);
    if (movedToMissingWard.length) console.table(movedToMissingWard.slice(0, 20));
    else console.log('None — every new ward referenced by a moved VD exists in `wards`.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
