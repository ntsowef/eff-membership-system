/**
 * Sync Voting Districts (VD) and Voting Stations (VS) from the 2026 IEC master
 * file (VSListing_20260601.xlsb) into eff_membership_database (PostgreSQL).
 *
 * Behaviour:
 *  - Upserts voting_districts (insert new, refresh ward_code + is_active on
 *    existing; existing voting_district_name is preserved).
 *  - Upserts voting_stations (1:1 with VD; station_code = vd_code).
 *  - Only writes records whose ward_code already exists in `wards`, preserving
 *    referential integrity. Records tied to missing wards are skipped + reported.
 *  - VD/ward codes are sanitized (trailing ".0" stripped) for consistency with
 *    vw_member_details_optimized.
 *
 * Safety: performs a dry run unless APPLY=1 is set.
 *   Dry run:  node ../test/geographic/sync-voting-data.js
 *   Apply:    APPLY=1 node ../test/geographic/sync-voting-data.js   (PowerShell: $env:APPLY=1; node ...)
 */
const { readRows, makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const BATCH = 1000;

async function batchUpsert(client, rows, sql, buildParams, paramsPerRow) {
  let inserted = 0, updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const placeholders = chunk
      .map((_, idx) => `(${Array.from({ length: paramsPerRow }, (_, k) => `$${idx * paramsPerRow + k + 1}`).join(',')})`)
      .join(',');
    const params = [];
    for (const r of chunk) buildParams(r, params);
    const res = await client.query(sql.replace('__VALUES__', placeholders), params);
    for (const row of res.rows) {
      if (row.inserted) inserted++; else updated++;
    }
  }
  return { inserted, updated };
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no changes; set APPLY=1 to write)'}`);
  const rows = readRows();
  const pool = makePool();
  const client = await pool.connect();
  try {
    const wardRes = await client.query('SELECT ward_code FROM wards');
    const dbWards = new Set(wardRes.rows.map((x) => x.ward_code));

    // Deduplicate VDs by code (file is 1:1, but guard anyway), filter to existing wards.
    const vdMap = new Map();        // vd_code -> ward_code
    const stations = [];            // valid station rows
    const skipped = [];             // { vd_code, ward_code }
    const missingWards = new Set();
    for (const r of rows) {
      if (!r.vd_code || !r.ward_code) { skipped.push(r); continue; }
      if (!dbWards.has(r.ward_code)) {
        missingWards.add(r.ward_code);
        skipped.push({ vd_code: r.vd_code, ward_code: r.ward_code });
        continue;
      }
      if (!vdMap.has(r.vd_code)) vdMap.set(r.vd_code, r.ward_code);
      stations.push(r);
    }
    const vdRows = [...vdMap.entries()].map(([vd_code, ward_code]) => ({ vd_code, ward_code }));

    console.log('\n--- Plan ---');
    console.log(`Eligible VDs (ward exists):     ${vdRows.length}`);
    console.log(`Eligible stations (ward exists):${stations.length}`);
    console.log(`Skipped (missing/invalid ward): ${skipped.length} across ${missingWards.size} wards`);

    if (!APPLY) {
      console.log('\nDry run complete. No changes written.');
      return;
    }

    await client.query('BEGIN');

    // 1) Upsert voting_districts (preserve existing name; refresh ward + active)
    const vdSql = `
      INSERT INTO voting_districts
        (voting_district_code, voting_district_name, ward_code, is_active, created_at, updated_at)
      VALUES __VALUES__
      ON CONFLICT (voting_district_code) DO UPDATE SET
        ward_code = EXCLUDED.ward_code,
        is_active = true,
        updated_at = now()
      RETURNING (xmax = 0) AS inserted`;
    const vdResult = await batchUpsert(client, vdRows, vdSql, (r, p) => {
      p.push(r.vd_code, `VD ${r.vd_code}`, r.ward_code, true, new Date(), new Date());
    }, 6);

    // 2) Upsert voting_stations. Strict source mapping: only stations listed in
    //    the .xlsb file are inserted (no synthetic/auxiliary stations). New
    //    stations follow the 1:1 VD model (station_code = vd_code).
    //    On conflict, station_name and voting_district_code are IMMUTABLE
    //    (existing names are preserved); only geographic/administrative fields
    //    are refreshed.
    const vsSql = `
      INSERT INTO voting_stations
        (station_code, station_name, voting_district_code, ward_code, address,
         latitude, longitude, is_active, created_at, updated_at)
      VALUES __VALUES__
      ON CONFLICT (station_code) DO UPDATE SET
        ward_code = EXCLUDED.ward_code,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_active = true,
        updated_at = now()
      RETURNING (xmax = 0) AS inserted`;
    const vsResult = await batchUpsert(client, stations, vsSql, (r, p) => {
      p.push(r.vd_code, r.station_name, r.vd_code, r.ward_code, r.address,
        r.latitude, r.longitude, true, new Date(), new Date());
    }, 10);

    await client.query('COMMIT');

    console.log('\n--- Result (committed) ---');
    console.log(`Voting Districts -> inserted: ${vdResult.inserted}, updated: ${vdResult.updated}`);
    console.log(`Voting Stations  -> inserted: ${vsResult.inserted}, updated: ${vsResult.updated}`);
    console.log(`Skipped (missing parent ward): ${skipped.length} (${missingWards.size} distinct wards)`);
    console.log(`Missing wards sample: ${JSON.stringify([...missingWards].slice(0, 20))}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
