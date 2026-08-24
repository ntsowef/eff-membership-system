// Applies migration 047_simplify_ward_meeting_records.sql to the local Postgres DB.
// Usage: node test/ward-audit/apply-047-migration.js
// DRY-RUN by default; set APPLY=1 to actually run inside a transaction.
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const APPLY = process.env.APPLY === '1';
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database',
});

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'migrations',
  '047_simplify_ward_meeting_records.sql'
);

async function columns() {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'ward_meeting_records' ORDER BY ordinal_position`
  );
  return r.rows.map((x) => x.column_name);
}

(async () => {
  try {
    console.log(`Host: ${process.env.DB_HOST || 'localhost'} | DB: ${process.env.DB_NAME || 'eff_membership_database'}`);
    console.log(`Mode: ${APPLY ? 'APPLY (will run migration)' : 'DRY-RUN (no changes)'}\n`);

    console.log('Columns BEFORE:', (await columns()).join(', '), '\n');

    if (!APPLY) {
      console.log('Dry-run only. Re-run with APPLY=1 to execute the migration.');
      await pool.end();
      return;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('Migration executed successfully.\n');

    console.log('Columns AFTER:', (await columns()).join(', '));
    await pool.end();
  } catch (err) {
    console.error('Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
