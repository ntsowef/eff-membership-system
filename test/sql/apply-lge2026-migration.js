/**
 * Apply the lge2026_candidates migration and report on the resulting schema.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost', port: 5432,
    user: 'eff_admin', password: 'Frames!123',
    database: 'eff_membership_database',
  });
  await client.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', '..', 'backend', 'src', 'migrations', '20260520_create_lge2026_candidates.sql'),
      'utf8'
    );
    console.log('Applying migration: 20260520_create_lge2026_candidates.sql');
    await client.query(sql);
    console.log('  ✔ done.');

    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_name = 'lge2026_candidates'
        ORDER BY ordinal_position`
    );
    console.log('\n--- lge2026_candidates columns ---');
    console.table(cols.rows);

    const cons = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname = 'lge2026_candidates'
       ORDER BY contype, conname
    `);
    console.log('\n--- lge2026_candidates constraints ---');
    console.table(cons.rows);

    const idx = await client.query(`
      SELECT indexname, indexdef
        FROM pg_indexes
       WHERE tablename = 'lge2026_candidates'
       ORDER BY indexname
    `);
    console.log('\n--- lge2026_candidates indexes ---');
    console.table(idx.rows);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
