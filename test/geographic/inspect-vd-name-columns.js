/**
 * Inspect production for any table that denormalizes a voting-district name,
 * so we update the correct place. Read-only.
 *
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/inspect-vd-name-columns.js
 */
const { makePool } = require('./lib-vslisting');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Inspecting host=${host}\n`);
  const pool = makePool();
  try {
    // All public columns whose name mentions a voting-district name.
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (column_name ILIKE '%voting_district_name%'
             OR column_name ILIKE '%vd_name%'
             OR column_name = 'voting_district')
      ORDER BY table_name, column_name
    `);
    console.log('## Columns referencing a VD name');
    if (cols.rows.length) console.table(cols.rows);
    else console.log('(none found)');

    // Member-related tables that carry a voting_district_code (potential targets).
    const codeCols = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'voting_district_code'
        AND table_name ILIKE '%member%'
      ORDER BY table_name
    `);
    console.log('\n## Member-related tables with voting_district_code');
    if (codeCols.rows.length) console.table(codeCols.rows);
    else console.log('(none found)');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
