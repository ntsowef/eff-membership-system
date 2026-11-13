import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';

export const LEGACY_MIGRATION_CUTOFF = 50;
export const MIGRATION_ADVISORY_LOCK_KEY = 88420151;

export interface MigrationFile {
  filename: string;
  prefix: number;
  fullPath: string;
  checksumSha256: string;
  noTransaction: boolean;
  era: 'legacy' | 'managed';
}

export interface AppliedMigrationRow {
  filename: string;
  prefix_number: number;
  checksum_sha256: string;
  is_baseline: boolean;
  applied_at: string | Date;
}

export interface MigrationStatusReport {
  migrationsDir: string;
  totalFiles: number;
  legacyCount: number;
  managedCount: number;
  appliedManaged: string[];
  baselined: string[];
  pendingManaged: string[];
  pendingCount: number;
  checksumMismatches: Array<{ filename: string; expected: string; actual: string }>;
}

const NUMBERED_SQL_PATTERN = /^(\d+)_(.+)\.sql$/i;
const ROLLBACK_SUFFIX_PATTERN = /_rollback\.sql$/i;

/** Compute SHA-256 over LF-normalized SQL so Windows CRLF vs Linux LF stays identical. */
export function computeNormalizedChecksum(sqlContent: string): string {
  const normalized = sqlContent.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** Discover numbered `.sql` migrations, excluding `*_rollback.sql`, enforcing unique prefixes >= 51. */
export function discoverMigrations(
  migrationsDir: string,
  legacyCutoff: number = LEGACY_MIGRATION_CUTOFF
): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory does not exist: ${migrationsDir}`);
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const discovered: MigrationFile[] = [];
  const seenManagedPrefixes = new Map<number, string>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (ROLLBACK_SUFFIX_PATTERN.test(entry.name)) continue;

    const match = NUMBERED_SQL_PATTERN.exec(entry.name);
    if (!match) continue;

    const prefix = parseInt(match[1], 10);
    const fullPath = path.join(migrationsDir, entry.name);
    const content = fs.readFileSync(fullPath, 'utf8');
    const era: 'legacy' | 'managed' = prefix <= legacyCutoff ? 'legacy' : 'managed';

    if (era === 'managed') {
      const duplicate = seenManagedPrefixes.get(prefix);
      if (duplicate) {
        throw new Error(
          `Duplicate managed migration prefix ${prefix}: "${duplicate}" and "${entry.name}"`
        );
      }
      seenManagedPrefixes.set(prefix, entry.name);
    }

    discovered.push({
      filename: entry.name,
      prefix,
      fullPath,
      checksumSha256: computeNormalizedChecksum(content),
      noTransaction: /--\s*@no-transaction\b/i.test(content),
      era,
    });
  }

  return discovered.sort((a, b) =>
    a.prefix !== b.prefix ? a.prefix - b.prefix : a.filename.localeCompare(b.filename)
  );
}

export async function ensureSchemaMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename        TEXT PRIMARY KEY,
      prefix_number   INTEGER NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      is_baseline     BOOLEAN NOT NULL DEFAULT FALSE,
      applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_by      TEXT NOT NULL DEFAULT CURRENT_USER
    );
  `);
}

async function getAppliedMigrations(client: PoolClient): Promise<Map<string, AppliedMigrationRow>> {
  const res = await client.query<AppliedMigrationRow>(
    `SELECT filename, prefix_number, checksum_sha256, is_baseline, applied_at
     FROM public.schema_migrations
     ORDER BY prefix_number ASC, filename ASC`
  );
  const map = new Map<string, AppliedMigrationRow>();
  for (const row of res.rows) {
    map.set(row.filename, row);
  }
  return map;
}

export function buildMigrationStatus(
  migrationsDir: string,
  files: MigrationFile[],
  appliedMap: Map<string, AppliedMigrationRow>
): MigrationStatusReport {
  const legacyFiles = files.filter((f) => f.era === 'legacy');
  const managedFiles = files.filter((f) => f.era === 'managed');

  const baselined: string[] = [];
  const appliedManaged: string[] = [];
  const pendingManaged: string[] = [];
  const checksumMismatches: Array<{ filename: string; expected: string; actual: string }> = [];

  for (const file of legacyFiles) {
    if (appliedMap.has(file.filename)) {
      baselined.push(file.filename);
    }
  }

  for (const file of managedFiles) {
    const existing = appliedMap.get(file.filename);
    if (!existing) {
      pendingManaged.push(file.filename);
      continue;
    }

    appliedManaged.push(file.filename);
    if (!existing.is_baseline && existing.checksum_sha256 !== file.checksumSha256) {
      checksumMismatches.push({
        filename: file.filename,
        expected: existing.checksum_sha256,
        actual: file.checksumSha256,
      });
    }
  }

  return {
    migrationsDir,
    totalFiles: files.length,
    legacyCount: legacyFiles.length,
    managedCount: managedFiles.length,
    appliedManaged,
    baselined,
    pendingManaged,
    pendingCount: pendingManaged.length,
    checksumMismatches,
  };
}

export async function getMigrationStatus(
  client: PoolClient,
  migrationsDir: string
): Promise<MigrationStatusReport> {
  await ensureSchemaMigrationsTable(client);
  const files = discoverMigrations(migrationsDir);
  const appliedMap = await getAppliedMigrations(client);
  return buildMigrationStatus(migrationsDir, files, appliedMap);
}

export async function baselineMigrations(
  client: PoolClient,
  migrationsDir: string,
  throughPrefix: number = LEGACY_MIGRATION_CUTOFF
): Promise<{ inserted: number; totalEligible: number }> {
  await ensureSchemaMigrationsTable(client);
  const coreTableCheck = await client.query<{ reg: string | null }>(
    `SELECT to_regclass('public.users')::text AS reg`
  );
  if (!coreTableCheck.rows[0]?.reg) {
    throw new Error(
      'Cannot baseline: public.users table does not exist in target database.'
    );
  }

  const files = discoverMigrations(migrationsDir).filter((f) => f.prefix <= throughPrefix);

  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
  try {
    await client.query('BEGIN');
    let inserted = 0;

    for (const file of files) {
      const res = await client.query(
        `INSERT INTO public.schema_migrations (filename, prefix_number, checksum_sha256, is_baseline)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (filename) DO NOTHING`,
        [file.filename, file.prefix, file.checksumSha256]
      );
      inserted += res.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { inserted, totalEligible: files.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK_KEY]).catch(
      () => undefined
    );
  }
}

export async function runPendingMigrations(
  client: PoolClient,
  migrationsDir: string
): Promise<{ applied: string[]; skippedCount: number }> {
  await ensureSchemaMigrationsTable(client);
  const files = discoverMigrations(migrationsDir);
  const appliedMap = await getAppliedMigrations(client);
  const status = buildMigrationStatus(migrationsDir, files, appliedMap);

  if (status.checksumMismatches.length > 0) {
    const details = status.checksumMismatches
      .map((m) => `${m.filename} (db=${m.expected.slice(0, 12)}, disk=${m.actual.slice(0, 12)})`)
      .join(', ');
    throw new Error(`Migration checksum mismatch detected — aborting: ${details}`);
  }

  const pendingFiles = files.filter(
    (f) => f.era === 'managed' && !appliedMap.has(f.filename)
  );
  const applied: string[] = [];

  if (pendingFiles.length === 0) {
    return { applied, skippedCount: status.appliedManaged.length };
  }

  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
  try {
    for (const file of pendingFiles) {
      const sql = fs.readFileSync(file.fullPath, 'utf8');

      if (file.noTransaction) {
        await client.query(sql);
        await client.query(
          `INSERT INTO public.schema_migrations (filename, prefix_number, checksum_sha256, is_baseline)
           VALUES ($1, $2, $3, FALSE)`,
          [file.filename, file.prefix, file.checksumSha256]
        );
      } else {
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            `INSERT INTO public.schema_migrations (filename, prefix_number, checksum_sha256, is_baseline)
             VALUES ($1, $2, $3, FALSE)`,
            [file.filename, file.prefix, file.checksumSha256]
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw err;
        }
      }

      applied.push(file.filename);
    }

    return { applied, skippedCount: status.appliedManaged.length };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK_KEY]).catch(
      () => undefined
    );
  }
}

export interface CliOptions {
  command: 'status' | 'run' | 'baseline';
  envFile?: string;
  migrationsDir: string;
  through: number;
  json: boolean;
}

export function parseCliArgs(argv: string[], defaultMigrationsDir: string): CliOptions {
  const args = [...argv];
  const rawCommand = args.shift() || 'status';
  if (rawCommand !== 'status' && rawCommand !== 'run' && rawCommand !== 'baseline') {
    throw new Error(`Unknown command "${rawCommand}". Expected: status | run | baseline`);
  }

  const options: CliOptions = {
    command: rawCommand,
    migrationsDir: defaultMigrationsDir,
    through: LEGACY_MIGRATION_CUTOFF,
    json: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--env-file' && args[i + 1]) {
      options.envFile = args[i + 1];
      i += 1;
    } else if (token === '--dir' && args[i + 1]) {
      options.migrationsDir = path.resolve(args[i + 1]);
      i += 1;
    } else if (token === '--through' && args[i + 1]) {
      options.through = parseInt(args[i + 1], 10);
      i += 1;
    } else if (token === '--json') {
      options.json = true;
    }
  }

  return options;
}

function loadDatabasePoolConfig(envFile?: string): Pool {
  const resolvedEnvPath = envFile
    ? path.resolve(envFile)
    : path.resolve(process.cwd(), '.env');

  if (fs.existsSync(resolvedEnvPath)) {
    dotenv.config({ path: resolvedEnvPath, override: false });
  }

  const host = process.env.PROD_DB_HOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.PROD_DB_PORT || process.env.DB_PORT || '5432', 10);
  const database = process.env.PROD_DB_NAME || process.env.DB_NAME || 'eff_membership_database';
  const user = process.env.PROD_DB_USER || process.env.DB_USER || 'postgres';
  const password = process.env.PROD_DB_PASSWORD || process.env.DB_PASSWORD || '';
  const sslEnabled =
    (process.env.PROD_DB_SSL || process.env.DB_SSL || 'false').toLowerCase() === 'true';

  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    max: 2,
    connectionTimeoutMillis: 15000,
  });
}

async function main(): Promise<void> {
  const defaultDir = path.resolve(__dirname, '../../migrations');
  const opts = parseCliArgs(process.argv.slice(2), defaultDir);
  const pool = loadDatabasePoolConfig(opts.envFile);
  const client = await pool.connect();

  try {
    if (opts.command === 'status') {
      const status = await getMigrationStatus(client, opts.migrationsDir);
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(`Migrations dir: ${status.migrationsDir}`);
        console.log(`Legacy files (<= ${LEGACY_MIGRATION_CUTOFF}): ${status.legacyCount} (baselined: ${status.baselined.length})`);
        console.log(`Managed files (>= ${LEGACY_MIGRATION_CUTOFF + 1}): ${status.managedCount} (applied: ${status.appliedManaged.length}, pending: ${status.pendingCount})`);
        if (status.pendingManaged.length > 0) {
          console.log('Pending:', status.pendingManaged.join(', '));
        }
        if (status.checksumMismatches.length > 0) {
          console.error('Checksum mismatches:', status.checksumMismatches);
          process.exitCode = 1;
        }
      }
      return;
    }

    if (opts.command === 'baseline') {
      const result = await baselineMigrations(client, opts.migrationsDir, opts.through);
      console.log(
        `Baselined ${result.inserted} new records (${result.totalEligible} eligible files <= ${opts.through}).`
      );
      return;
    }

    const result = await runPendingMigrations(client, opts.migrationsDir);
    if (result.applied.length === 0) {
      console.log(`No pending managed migrations (${result.skippedCount} already applied).`);
    } else {
      console.log(`Applied ${result.applied.length} migration(s): ${result.applied.join(', ')}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ SQL migration runner failed:', err.message || err);
    process.exit(1);
  });
}
