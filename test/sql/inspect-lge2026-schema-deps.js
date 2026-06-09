/**
 * Inspect column types/keys of `members_consolidated` and `wards`
 * so that the new `lge2026_candidates` table FKs match exactly.
 */
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database',
  });
  await client.connect();
  try {
    for (const tbl of ['members_consolidated', 'wards']) {
      const cols = await client.query(
        `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
          WHERE table_name = $1
            AND column_name IN ('member_id','ward_code','status','is_active')
          ORDER BY ordinal_position`,
        [tbl]
      );
      console.log(`\n--- ${tbl} (relevant cols) ---`);
      console.table(cols.rows);
      const pk = await client.query(
        `SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
           FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [tbl]
      );
      console.log(`PK of ${tbl}:`, pk.rows);
    }

    const exists = await client.query(
      `SELECT to_regclass('public.lge2026_candidates') AS rel`
    );
    console.log('\nlge2026_candidates exists?', exists.rows[0].rel);
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
