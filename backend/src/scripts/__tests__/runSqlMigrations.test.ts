import fs from 'fs';
import os from 'os';
import path from 'path';
import type { PoolClient } from 'pg';
import {
  baselineMigrations,
  computeNormalizedChecksum,
  discoverMigrations,
  getMigrationStatus,
  parseCliArgs,
  runPendingMigrations,
} from '../run-sql-migrations';

function createTempMigrationsDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eff-mig-test-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

describe('run-sql-migrations', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop()!;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('normalizes CRLF and LF to produce identical checksums across Windows and Linux', () => {
    const winSql = 'CREATE TABLE test (\r\n  id INT PRIMARY KEY\r\n);\r\n';
    const unixSql = 'CREATE TABLE test (\n  id INT PRIMARY KEY\n);\n';
    expect(computeNormalizedChecksum(winSql)).toBe(computeNormalizedChecksum(unixSql));
  });

  it('excludes rollback and unnumbered SQL scripts and separates legacy vs managed eras', () => {
    const dir = createTempMigrationsDir({
      '050_legacy_end.sql': 'SELECT 50;',
      '034_restructure_rollback.sql': 'DROP TABLE foo;',
      'ward_audit_system.sql': 'SELECT 0;',
      '051_rbac_matrix.sql': 'SELECT 51;',
      '052_meeting_checkin.sql': '-- @no-transaction\nSELECT 52;',
    });
    tempDirs.push(dir);

    const discovered = discoverMigrations(dir);
    expect(discovered.map((d) => [d.filename, d.era, d.noTransaction])).toEqual([
      ['050_legacy_end.sql', 'legacy', false],
      ['051_rbac_matrix.sql', 'managed', false],
      ['052_meeting_checkin.sql', 'managed', true],
    ]);
  });

  it('throws immediately on duplicate managed migration prefixes (>= 51)', () => {
    const dir = createTempMigrationsDir({
      '051_first.sql': 'SELECT 1;',
      '051_conflict.sql': 'SELECT 2;',
    });
    tempDirs.push(dir);

    expect(() => discoverMigrations(dir)).toThrow(/Duplicate managed migration prefix 51/);
  });

  it('executes only managed pending migrations in single transactions and ignores legacy files', async () => {
    const dir = createTempMigrationsDir({
      '050_legacy.sql': 'SHOULD_NEVER_EXECUTE;',
      '051_rbac_matrix.sql': 'CREATE TABLE rbac_test (id INT);',
    });
    tempDirs.push(dir);

    const executedQueries: Array<{ text: string; values?: unknown[] }> = [];
    const mockClient = {
      query: jest.fn(async (text: string, values?: unknown[]) => {
        executedQueries.push({ text: text.trim(), values });
        if (text.includes('FROM public.schema_migrations')) {
          return { rows: [] };
        }
        return { rows: [], rowCount: 1 };
      }),
    } as unknown as PoolClient;

    const result = await runPendingMigrations(mockClient, dir);

    expect(result).toEqual({
      applied: ['051_rbac_matrix.sql'],
      skippedCount: 0,
    });
    const sqlTexts = executedQueries.map((q) => q.text);
    expect(sqlTexts).toContain('BEGIN');
    expect(sqlTexts).toContain('CREATE TABLE rbac_test (id INT);');
    expect(sqlTexts).toContain('COMMIT');
    expect(sqlTexts.some((s) => s.includes('SHOULD_NEVER_EXECUTE'))).toBe(false);
  });

  it('rolls back the transaction if a managed migration fails partway through', async () => {
    const dir = createTempMigrationsDir({
      '051_broken.sql': 'INVALID SQL SYNTAX;',
    });
    tempDirs.push(dir);

    const queries: string[] = [];
    const mockClient = {
      query: jest.fn(async (text: string) => {
        queries.push(text.trim());
        if (text.includes('FROM public.schema_migrations')) {
          return { rows: [] };
        }
        if (text.includes('INVALID SQL SYNTAX')) {
          throw new Error('syntax error at or near "INVALID"');
        }
        return { rows: [], rowCount: 0 };
      }),
    } as unknown as PoolClient;

    await expect(runPendingMigrations(mockClient, dir)).rejects.toThrow(/syntax error/);
    expect(queries).toContain('BEGIN');
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
  });

  it('aborts cleanly if an already-applied managed migration file was altered on disk', async () => {
    const dir = createTempMigrationsDir({
      '051_rbac_matrix.sql': 'CREATE TABLE changed_after_deploy (id INT);',
    });
    tempDirs.push(dir);

    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM public.schema_migrations')) {
          return {
            rows: [
              {
                filename: '051_rbac_matrix.sql',
                prefix_number: 51,
                checksum_sha256: 'deadbeef0000',
                is_baseline: false,
                applied_at: new Date().toISOString(),
              },
            ],
          };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    await expect(runPendingMigrations(mockClient, dir)).rejects.toThrow(
      /Migration checksum mismatch detected/
    );
  });

  it('baselines legacy <= 50 migrations after verifying public.users exists', async () => {
    const dir = createTempMigrationsDir({
      '001_init.sql': 'SELECT 1;',
      '050_sync.sql': 'SELECT 50;',
      '051_future.sql': 'SELECT 51;',
    });
    tempDirs.push(dir);

    const mockClient = {
      query: jest.fn(async (text: string) => {
        if (text.includes("to_regclass('public.users')")) {
          return { rows: [{ reg: 'users' }] };
        }
        if (text.includes('INSERT INTO public.schema_migrations')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;

    const baselineRes = await baselineMigrations(mockClient, dir, 50);
    expect(baselineRes).toEqual({ inserted: 2, totalEligible: 2 });

    const status = await getMigrationStatus(
      {
        query: jest.fn(async (text: string) => {
          if (text.includes('FROM public.schema_migrations')) {
            return {
              rows: [
                {
                  filename: '001_init.sql',
                  prefix_number: 1,
                  checksum_sha256: computeNormalizedChecksum('SELECT 1;'),
                  is_baseline: true,
                  applied_at: new Date().toISOString(),
                },
                {
                  filename: '050_sync.sql',
                  prefix_number: 50,
                  checksum_sha256: computeNormalizedChecksum('SELECT 50;'),
                  is_baseline: true,
                  applied_at: new Date().toISOString(),
                },
              ],
            };
          }
          return { rows: [] };
        }),
      } as unknown as PoolClient,
      dir
    );

    expect(status.baselined).toHaveLength(2);
    expect(status.pendingManaged).toEqual(['051_future.sql']);
    expect(status.pendingCount).toBe(1);
  });

  it('parses CLI options accurately', () => {
    const parsed = parseCliArgs(
      ['status', '--env-file', '../.env.prod-db', '--json', '--through', '50'],
      '/app/migrations'
    );
    expect(parsed.command).toBe('status');
    expect(parsed.envFile).toBe('../.env.prod-db');
    expect(parsed.json).toBe(true);
    expect(parsed.through).toBe(50);
  });
});

