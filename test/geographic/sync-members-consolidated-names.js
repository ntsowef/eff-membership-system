/**
 * Sync members_consolidated.voting_district_name to match the current
 * voting_districts.voting_district_name (after placeholder names were replaced
 * with station names).
 *
 * Join key: members_consolidated.voting_district_code = voting_districts.voting_district_code
 * Both sides of the code are sanitized (trailing ".0" stripped, trimmed) for the
 * join, consistent with vw_member_details_optimized.
 *
 * SAFETY: dry run by default; only writes when APPLY=1. Wrapped in a transaction.
 * Target production:
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/sync-members-consolidated-names.js          (dry run)
 *   $env:DB_HOST="69.164.245.173"; $env:APPLY="1"; node ../test/geographic/sync-members-consolidated-names.js  (apply)
 */
const { makePool } = require('./lib-vslisting');

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
// Sanitized join key: trim + strip a trailing ".0" suffix only.
const MC_CODE = `regexp_replace(btrim(mc.voting_district_code), '\\.0+$', '')`;

async function columnExists(client) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'members_consolidated'
       AND column_name = 'voting_district_name'`
  );
  return res.rowCount > 0;
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (set APPLY=1 to write)'} | host=${host}\n`);

  const pool = makePool();
  const client = await pool.connect();
  try {
    if (!(await columnExists(client))) {
      console.log('ABORT: members_consolidated has no "voting_district_name" column.');
      console.log('Nothing was changed. The descriptive VD name is derived at read time');
      console.log('via the voting_districts join (e.g. vw_member_details_optimized), so no');
      console.log('denormalized column needs updating. If you intend to ADD such a column,');
      console.log('that is a schema change and should be confirmed separately.');
      return;
    }

    const stats = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE mc.voting_district_code IS NOT NULL AND btrim(mc.voting_district_code) <> '') AS rows_with_code,
        COUNT(*) FILTER (WHERE vd.voting_district_code IS NOT NULL) AS matched_to_vd,
        COUNT(*) FILTER (WHERE vd.voting_district_code IS NOT NULL
                           AND mc.voting_district_name IS DISTINCT FROM vd.voting_district_name) AS to_update
      FROM members_consolidated mc
      LEFT JOIN voting_districts vd ON ${MC_CODE} = vd.voting_district_code
    `);
    console.log('## Plan');
    console.table(stats.rows);

    const sample = await client.query(`
      SELECT ${MC_CODE} AS voting_district_code,
             mc.voting_district_name AS current_name,
             vd.voting_district_name AS new_name
      FROM members_consolidated mc
      JOIN voting_districts vd ON ${MC_CODE} = vd.voting_district_code
      WHERE mc.voting_district_name IS DISTINCT FROM vd.voting_district_name
      ORDER BY mc.member_id
      LIMIT 20
    `);
    console.log('\n## Sample of changes to apply (max 20)');
    if (sample.rows.length) console.table(sample.rows);
    else console.log('No differences — every matched member already has the current VD name.');

    if (!APPLY) { console.log('\nDry run complete. No changes written.'); return; }

    await client.query('BEGIN');
    const res = await client.query(`
      UPDATE members_consolidated mc
      SET voting_district_name = vd.voting_district_name, updated_at = now()
      FROM voting_districts vd
      WHERE ${MC_CODE} = vd.voting_district_code
        AND mc.voting_district_name IS DISTINCT FROM vd.voting_district_name
    `);
    await client.query('COMMIT');

    const verify = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE voting_district_name LIKE 'VD %') AS vd_prefixed,
        COUNT(*) FILTER (WHERE voting_district_name ~ '^VD [0-9]+$') AS exact_placeholders
      FROM members_consolidated
    `);
    console.log('\n--- Result (committed) ---');
    console.log(`Rows updated in members_consolidated: ${res.rowCount}`);
    console.log('\n## Post-update placeholder check');
    console.table(verify.rows);
    if (Number(verify.rows[0].exact_placeholders) === 0) {
      console.log('Confirmed: no "VD <code>" placeholder names remain.');
    } else {
      console.log('WARNING: some "VD <code>" placeholders remain (codes with no matching VD).');
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
