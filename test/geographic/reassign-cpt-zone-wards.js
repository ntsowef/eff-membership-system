/**
 * Reassign two City of Cape Town wards from the main Metro (code 'CPT') to their
 * correct Metro Sub-Region "Zone" municipalities.
 *
 *   Ward 118 (19100118) -> "CPT - Zone 1"
 *   Ward 117 (19100117) -> "CPT - Zone 3"
 *
 * NOTE ON COLUMN: the wards table links to municipalities via `municipality_code`
 * (there is no `municipality_id` column on wards). This script therefore updates
 * `municipality_code`, and resolves/logs the corresponding `municipality_id` of
 * the source/target municipalities for transparency (as requested). Targets are
 * resolved by EXACT municipality_name, because zone codes are not aligned with
 * zone numbers (e.g. "CPT - Zone 3" = code CPT004, not CPT003).
 *
 * Connects with backend/.env credentials but explicitly targets
 * eff_membership_database. Runs in a single transaction.
 *
 * Safety: DRY RUN by default. Pass --live to COMMIT.
 *   node ../test/geographic/reassign-cpt-zone-wards.js            (dry run)
 *   node ../test/geographic/reassign-cpt-zone-wards.js --live     (commit)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

const LIVE = process.argv.includes('--live');

// Resolve targets by exact name (robust against code/number misalignment).
const ASSIGNMENTS = [
  { ward_code: '19100118', ward_label: 'Ward 118', target_name: 'CPT - Zone 1' },
  { ward_code: '19100117', ward_label: 'Ward 117', target_name: 'CPT - Zone 3' },
];

function makePool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'eff_membership_database',
    max: 5,
  });
}

async function resolveMunicipality(client, name) {
  const res = await client.query(
    `SELECT municipality_id, municipality_code, municipality_name
     FROM municipalities WHERE municipality_name = $1`, [name]);
  if (res.rows.length === 0) throw new Error(`Target municipality not found: "${name}"`);
  if (res.rows.length > 1) throw new Error(`Target municipality name is ambiguous: "${name}"`);
  return res.rows[0];
}

async function wardState(client, wardCodes) {
  const res = await client.query(
    `SELECT w.ward_code, w.ward_name, w.municipality_code,
            m.municipality_id, m.municipality_name
     FROM wards w
     LEFT JOIN municipalities m ON m.municipality_code = w.municipality_code
     WHERE w.ward_code = ANY($1::text[])
     ORDER BY w.ward_code`, [wardCodes]);
  return res.rows;
}

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE (will COMMIT)' : 'DRY RUN (pass --live to commit)'}`);
  console.log(`host=${process.env.DB_HOST} db=eff_membership_database\n`);

  const pool = makePool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve targets and validate every ward exists.
    const plan = [];
    for (const a of ASSIGNMENTS) {
      const target = await resolveMunicipality(client, a.target_name);
      plan.push({ ...a, target });
    }
    const wardCodes = ASSIGNMENTS.map((a) => a.ward_code);
    const before = await wardState(client, wardCodes);
    const beforeByCode = new Map(before.map((r) => [r.ward_code, r]));
    for (const a of ASSIGNMENTS) {
      if (!beforeByCode.has(a.ward_code)) throw new Error(`Ward not found: ${a.ward_code}`);
    }

    console.log('## BEFORE');
    console.table(plan.map((p) => {
      const cur = beforeByCode.get(p.ward_code);
      return {
        ward_code: p.ward_code,
        ward_name: cur.ward_name,
        current_municipality_code: cur.municipality_code,
        current_municipality_id: cur.municipality_id,
        target_municipality_name: p.target.municipality_name,
        target_municipality_code: p.target.municipality_code,
        target_municipality_id: p.target.municipality_id,
      };
    }));

    // Apply both updates in the single open transaction.
    let changed = 0;
    for (const p of plan) {
      const res = await client.query(
        `UPDATE wards SET municipality_code = $1, updated_at = now()
         WHERE ward_code = $2 AND municipality_code IS DISTINCT FROM $1`,
        [p.target.municipality_code, p.ward_code]);
      changed += res.rowCount;
    }

    const after = await wardState(client, wardCodes);
    console.log('\n## AFTER (in-transaction)');
    console.table(after.map((r) => ({
      ward_code: r.ward_code,
      ward_name: r.ward_name,
      municipality_code: r.municipality_code,
      municipality_id: r.municipality_id,
      municipality_name: r.municipality_name,
    })));

    if (LIVE) {
      await client.query('COMMIT');
      console.log(`\nCOMMITTED. Rows changed: ${changed}.`);
    } else {
      await client.query('ROLLBACK');
      console.log(`\nDRY RUN — rolled back. Rows that WOULD change: ${changed}. Re-run with --live to commit.`);
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
