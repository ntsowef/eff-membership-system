/**
 * Update voting_districts.voting_district_name to the CURRENT name from the 2026
 * IEC master file (VSListing_20260601.xlsb) for EVERY voting district in the file
 * — not just "VD <code>" placeholders. The file's descriptive name per VD is the
 * "Voting Station Name" (this codebase treats VD name = station name, 1:1).
 *
 * Only VDs that exist in voting_districts AND in the file are touched; VDs absent
 * from the file (e.g. legacy districts) are left untouched. Codes are sanitized
 * (trailing ".0" stripped) via lib-vslisting. Rows with an empty file name are
 * skipped (never overwrite a real name with blank).
 *
 * Safety: dry run unless APPLY=1.
 *   node ../test/geographic/update-vd-names-from-file.js                 (dry run)
 *   $env:APPLY="1"; node ../test/geographic/update-vd-names-from-file.js (apply)
 */
const { readRows, makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const BATCH = 1000;

// Build vd_code -> station_name from the file (sanitized code, non-empty name).
function buildVdNameMap(rows) {
  const map = new Map();
  let skippedNoName = 0;
  for (const r of rows) {
    if (!r.vd_code) continue;
    const name = r.station_name && r.station_name.trim() ? r.station_name.trim() : null;
    if (!name) { skippedNoName++; continue; }
    if (!map.has(r.vd_code)) map.set(r.vd_code, name); // file is 1:1; first wins
  }
  return { map, skippedNoName };
}

async function loadTemp(client, entries) {
  await client.query('CREATE TEMP TABLE _vd_new (code text PRIMARY KEY, name text) ON COMMIT DROP');
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    const ph = chunk.map((_, idx) => `($${idx * 2 + 1},$${idx * 2 + 2})`).join(',');
    const params = [];
    for (const [code, name] of chunk) params.push(code, name);
    await client.query(
      `INSERT INTO _vd_new (code, name) VALUES ${ph}
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`, params);
  }
}

async function diagnostics(client) {
  const res = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM _vd_new) AS file_vds,
      COUNT(*) FILTER (WHERE vd.voting_district_code IS NOT NULL)                       AS matched_in_db,
      COUNT(*) FILTER (WHERE vd.voting_district_code IS NULL)                           AS in_file_not_in_db,
      COUNT(*) FILTER (WHERE vd.voting_district_code IS NOT NULL
                         AND vd.voting_district_name IS DISTINCT FROM n.name)           AS names_to_change,
      COUNT(*) FILTER (WHERE vd.voting_district_code IS NOT NULL
                         AND vd.voting_district_name IS NOT DISTINCT FROM n.name)       AS already_current
    FROM _vd_new n
    LEFT JOIN voting_districts vd ON vd.voting_district_code = n.code
  `);
  return res.rows[0];
}

async function sampleChanges(client) {
  const res = await client.query(`
    SELECT n.code AS voting_district_code,
           vd.voting_district_name AS current_name,
           n.name AS new_name
    FROM _vd_new n
    JOIN voting_districts vd ON vd.voting_district_code = n.code
    WHERE vd.voting_district_name IS DISTINCT FROM n.name
    ORDER BY n.code LIMIT 20
  `);
  return res.rows;
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (set APPLY=1 to write)'} | host=${host}\n`);

  const rows = readRows();
  const { map, skippedNoName } = buildVdNameMap(rows);
  const entries = [...map.entries()];
  console.log(`File rows: ${rows.length} | distinct VDs with a name: ${entries.length} | rows skipped (no name): ${skippedNoName}`);

  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // temp table is ON COMMIT DROP; keep one tx open
    await loadTemp(client, entries);

    const diag = await diagnostics(client);
    console.log('\n## Plan');
    console.table([diag]);
    const sample = await sampleChanges(client);
    console.log('\n## Sample of name changes (max 20)');
    if (sample.length) console.table(sample);
    else console.log('  (none — every matched VD name already equals the file)');

    if (!APPLY) {
      await client.query('ROLLBACK'); // drops temp table, writes nothing
      console.log('\nDry run complete. No changes written.');
      return;
    }

    const upd = await client.query(`
      UPDATE voting_districts vd
      SET voting_district_name = n.name, updated_at = now()
      FROM _vd_new n
      WHERE vd.voting_district_code = n.code
        AND vd.voting_district_name IS DISTINCT FROM n.name
    `);
    await client.query('COMMIT');
    console.log('\n--- Result (committed) ---');
    console.log(`VD names updated to 2026 file: ${upd.rowCount}`);

    // Re-open a short tx to verify (temp table is gone after COMMIT).
    await client.query('BEGIN');
    await loadTemp(client, entries);
    const verify = await diagnostics(client);
    await client.query('ROLLBACK');
    console.log('\n--- Post-update verification ---');
    console.table([verify]);
    if (Number(verify.names_to_change) === 0) {
      console.log('Confirmed: every VD present in the file now matches the 2026 IEC name.');
    } else {
      console.log('NOTE: residual differences remain — inspect sample above.');
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
