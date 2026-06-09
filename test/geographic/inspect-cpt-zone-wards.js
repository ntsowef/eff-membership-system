/**
 * Read-only diagnostic for the CPT Zone ward reassignment task.
 * Confirms: (1) whether wards has a municipality_id column or only
 * municipality_code, (2) the municipalities rows for the CPT zones, and
 * (3) the current state of wards 19100117 / 19100118.
 *
 * Uses backend/.env credentials but explicitly targets eff_membership_database.
 *   node ../test/geographic/inspect-cpt-zone-wards.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const { Pool } = require('pg');

function pool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'eff_membership_database',
    max: 5,
  });
}

async function main() {
  const p = pool();
  try {
    console.log(`host=${process.env.DB_HOST} db=eff_membership_database\n`);

    const cols = await p.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wards'
        AND column_name IN ('ward_id','ward_code','municipality_id','municipality_code')
      ORDER BY column_name`);
    console.log('## wards key columns');
    console.table(cols.rows);

    console.log('\n## municipalities matching CPT / Zone');
    const munis = await p.query(`
      SELECT municipality_id, municipality_code, municipality_name, parent_municipality_id
      FROM municipalities
      WHERE municipality_name ILIKE '%cpt%' OR municipality_name ILIKE '%cape town%'
         OR municipality_code = 'CPT'
      ORDER BY municipality_name`);
    console.table(munis.rows);

    console.log('\n## target wards (current state)');
    const wards = await p.query(`
      SELECT ward_id, ward_code, ward_name, municipality_code, created_at
      FROM wards
      WHERE ward_code IN ('19100117','19100118')
      ORDER BY ward_code`);
    console.table(wards.rows);

    console.log('\n## two most recently created wards overall (sanity)');
    const recent = await p.query(`
      SELECT ward_id, ward_code, ward_name, municipality_code, created_at
      FROM wards ORDER BY created_at DESC, ward_id DESC LIMIT 5`);
    console.table(recent.rows);
  } finally {
    await p.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
