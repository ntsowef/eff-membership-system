/**
 * Apply vw_members_with_bureau_data to the production PostgreSQL database.
 *
 * Creates (or replaces) a view that joins members_consolidated with bureau_data
 * and exposes the bureau JSONB payload + last-updated timestamp alongside every
 * member column.
 *
 * Credentials are read from backend/.env (DB_USER, DB_PASSWORD, DB_NAME).
 * The host defaults to the production IP (69.164.245.173) and can be overridden
 * via PROD_DB_HOST. Port defaults to 5432 (override with PROD_DB_PORT).
 *
 * Safety:
 *   - Refuses to run unless --confirm is passed.
 *   - Wraps DDL in a transaction.
 *   - CREATE OR REPLACE VIEW is idempotent and non-destructive to underlying data.
 *   - Prints a verification report after applying.
 *
 * Usage (PowerShell, from repo root):
 *   node test/sql/apply-vw-members-with-bureau-data-prod.js --confirm
 *
 * Override host if needed:
 *   $env:PROD_DB_HOST="69.164.245.173"; node test/sql/apply-vw-members-with-bureau-data-prod.js --confirm
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load credentials from backend/.env
const envPath = path.resolve(__dirname, '..', '..', 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error('backend/.env not found at', envPath);
  process.exit(1);
}
require('dotenv').config({ path: envPath });

const args = { confirm: false };
for (const a of process.argv.slice(2)) {
  if (a === '--confirm') args.confirm = true;
}

if (!args.confirm) {
  console.error(
    '\nREFUSING TO RUN against production without --confirm.\n' +
    'Re-run as:  node test/sql/apply-vw-members-with-bureau-data-prod.js --confirm\n'
  );
  process.exit(2);
}

const cfg = {
  host: process.env.PROD_DB_HOST || '69.164.245.173',
  port: Number(process.env.PROD_DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.PROD_DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  statement_timeout: 60_000,
};

const missing = ['user', 'password', 'database'].filter((k) => !cfg[k]);
if (missing.length) {
  console.error(`Missing required values in backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

// NOTE: column-name corrections vs. the original spec:
//   - bureau_data table's JSONB column is `bureau_data` (not `data`)
//   - members_consolidated PK is `member_id` (not `id`)
const VIEW_SQL = `
CREATE OR REPLACE VIEW vw_members_with_bureau_data AS
SELECT
    m.*,
    b.bureau_data  AS bureau_json,
    b.date_updated AS bureau_last_updated
FROM members_consolidated m
LEFT JOIN bureau_data b ON m.member_id = b.member_id;
`;

(async () => {
  console.log(`Target: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} (ssl=${!!cfg.ssl})`);

  const client = new Client(cfg);
  await client.connect();
  try {
    // Pre-checks
    const tbl = await client.query(`SELECT to_regclass('public.bureau_data') AS rel`);
    if (!tbl.rows[0].rel) {
      throw new Error('bureau_data table does not exist in the target database. Apply migration 045 first.');
    }
    const mc = await client.query(`SELECT to_regclass('public.members_consolidated') AS rel`);
    if (!mc.rows[0].rel) {
      throw new Error('members_consolidated table does not exist in the target database.');
    }
    const pre = await client.query(`SELECT to_regclass('public.vw_members_with_bureau_data') AS rel`);
    console.log(`Pre-check: vw_members_with_bureau_data exists? ${pre.rows[0].rel ? 'YES (will be replaced)' : 'no (will be created)'}`);

    console.log('Applying view DDL (transactional)...');
    await client.query('BEGIN');
    await client.query(VIEW_SQL);
    await client.query('COMMIT');
    console.log('  ✔ committed.');

    // Verification
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_name = 'vw_members_with_bureau_data'
        ORDER BY ordinal_position`
    );
    console.log(`\n--- vw_members_with_bureau_data columns (${cols.rowCount}) ---`);
    // Show first/last few to keep output readable
    const preview = cols.rows.length > 20
      ? [...cols.rows.slice(0, 10), { column_name: '...', data_type: '...', is_nullable: '...' }, ...cols.rows.slice(-5)]
      : cols.rows;
    console.table(preview);

    const hasBureau = cols.rows.find((r) => r.column_name === 'bureau_json');
    const hasUpdated = cols.rows.find((r) => r.column_name === 'bureau_last_updated');
    if (!hasBureau || !hasUpdated) {
      throw new Error('Verification failed: bureau_json or bureau_last_updated column missing from the view.');
    }

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM members_consolidated)            AS members_total,
        (SELECT COUNT(*)::int FROM bureau_data)                     AS bureau_total,
        (SELECT COUNT(*)::int FROM vw_members_with_bureau_data)     AS view_total,
        (SELECT COUNT(*)::int FROM vw_members_with_bureau_data
            WHERE bureau_json IS NOT NULL)                          AS members_with_bureau
    `);
    console.log('\n--- Row counts ---');
    console.table(counts.rows);

    console.log('\n✅ vw_members_with_bureau_data created/replaced and verified successfully.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('\n❌ Failed:', e.message || e);
  process.exit(1);
});
