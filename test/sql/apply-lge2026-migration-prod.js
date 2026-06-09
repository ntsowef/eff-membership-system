/**
 * Apply the lge2026_candidates migration to a remote/production PostgreSQL.
 *
 * Connection details are taken from environment variables (NEVER hard-coded):
 *   PROD_DB_HOST       e.g. prod-db.example.com
 *   PROD_DB_PORT       (default 5432)
 *   PROD_DB_USER
 *   PROD_DB_PASSWORD
 *   PROD_DB_NAME
 *   PROD_DB_SSL        '1' to enable TLS with rejectUnauthorized=false
 *
 * Safety:
 *   - Refuses to run unless --confirm is passed.
 *   - Wraps the migration in a transaction.
 *   - Migration SQL is idempotent (IF NOT EXISTS / OR REPLACE).
 *   - Prints a verification report of the resulting schema.
 *
 * Usage (PowerShell):
 *   $env:PROD_DB_HOST="..."; $env:PROD_DB_USER="..."; $env:PROD_DB_PASSWORD="..."; `
 *   $env:PROD_DB_NAME="..."; node test/sql/apply-lge2026-migration-prod.js --confirm
 *
 * Or with a local .env.prod-db file (KEY=VALUE per line, gitignored):
 *   node test/sql/apply-lge2026-migration-prod.js --env-file=.env.prod-db --confirm
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function parseArgs() {
  const args = { confirm: false, envFile: null };
  for (const a of process.argv.slice(2)) {
    if (a === '--confirm') args.confirm = true;
    else if (a.startsWith('--env-file=')) args.envFile = a.slice('--env-file='.length);
  }
  return args;
}

function loadEnvFile(file) {
  if (!file) return;
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`env file not found: ${abs}`);
  const text = fs.readFileSync(abs, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function buildClientConfig() {
  const required = ['PROD_DB_HOST', 'PROD_DB_USER', 'PROD_DB_PASSWORD', 'PROD_DB_NAME'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}.\n` +
      `Set them via --env-file=path/to/.env.prod-db or in the shell before running.`
    );
  }
  return {
    host: process.env.PROD_DB_HOST,
    port: Number(process.env.PROD_DB_PORT || 5432),
    user: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    ssl: process.env.PROD_DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
    statement_timeout: 60_000,
  };
}

(async () => {
  const args = parseArgs();
  loadEnvFile(args.envFile);

  if (!args.confirm) {
    console.error(
      '\nREFUSING TO RUN against production without --confirm.\n' +
      'Re-run with --confirm once env vars are set.\n'
    );
    process.exit(2);
  }

  const cfg = buildClientConfig();
  // Mask sensitive fields when echoing the target
  console.log(`Target: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} (ssl=${!!cfg.ssl})`);

  const client = new Client(cfg);
  await client.connect();
  try {
    // Pre-check
    const exists = await client.query(
      `SELECT to_regclass('public.lge2026_candidates') AS rel`
    );
    console.log(`Pre-check: lge2026_candidates exists? ${exists.rows[0].rel ? 'YES' : 'no'}`);

    const sql = fs.readFileSync(
      path.join(__dirname, '..', '..', 'backend', 'src', 'migrations', '20260520_create_lge2026_candidates.sql'),
      'utf8'
    );

    console.log('Applying migration: 20260520_create_lge2026_candidates.sql (transactional)');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('  ✔ committed.');

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

    const rowCount = await client.query(`SELECT COUNT(*)::int AS n FROM lge2026_candidates`);
    console.log(`\nRow count in lge2026_candidates: ${rowCount.rows[0].n}`);
    console.log('\n✅ Production migration verified successfully.');
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
