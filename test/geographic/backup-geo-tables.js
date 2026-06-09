/**
 * Pre-change snapshot backup of the geographic tables, written as timestamped
 * JSON files (one per table) so the full pre-state can be restored if needed.
 *
 * Connects via makePool() (host overridable with DB_HOST env var; credentials
 * are loaded by dotenv from backend/.env and never printed). Read-only.
 *
 * Usage (PowerShell), targeting production:
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/backup-geo-tables.js
 *
 * Output: test/geographic/backups/<table>_<host>_<timestamp>.json
 */
const fs = require('fs');
const path = require('path');
const { makePool } = require('./lib-vslisting');

const TABLES = ['municipalities', 'wards', 'voting_districts', 'voting_stations'];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const ts = stamp();
  const outDir = path.join(__dirname, 'backups');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Backing up ${TABLES.length} tables from host=${host}`);
  const pool = makePool();
  const manifest = { host, timestamp: ts, tables: {} };
  try {
    for (const table of TABLES) {
      const res = await pool.query(`SELECT * FROM ${table}`);
      const file = path.join(outDir, `${table}_${host}_${ts}.json`);
      fs.writeFileSync(file, JSON.stringify(res.rows, null, 0));
      manifest.tables[table] = { rows: res.rowCount, file: path.basename(file) };
      console.log(`  ${table.padEnd(18)} ${String(res.rowCount).padStart(7)} rows -> ${path.basename(file)}`);
    }
    const manifestFile = path.join(outDir, `_manifest_${host}_${ts}.json`);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(`\nBackup complete. Manifest: ${path.basename(manifestFile)}`);
    console.log(`Location: ${outDir}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
