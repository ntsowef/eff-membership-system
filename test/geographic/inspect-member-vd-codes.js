/**
 * Read-only diagnostic: quantify how many member voting_district_code values
 * need normalization (trailing ".0" / whitespace) and whether normalizing makes
 * them resolve to a real voting_districts row (so the joined VD name is correct).
 *
 * Checks both members_consolidated and members.
 *   $env:DB_HOST="69.164.245.173"; node ../test/geographic/inspect-member-vd-codes.js
 */
const { makePool } = require('./lib-vslisting');

// Trailing ".0+" strip + trim, matching lib-vslisting.sanitizeCode / the views.
const NORM = (col) => `regexp_replace(btrim(${col}), '\\.0+$', '')`;

async function diagnose(pool, table) {
  const raw = `${table}.voting_district_code`;
  const sql = `
    SELECT
      COUNT(*)                                                              AS total_rows,
      COUNT(*) FILTER (WHERE ${raw} IS NOT NULL AND btrim(${raw}) <> '')     AS rows_with_code,
      COUNT(*) FILTER (WHERE ${raw} <> ${NORM(raw)})                         AS need_normalization,
      COUNT(*) FILTER (WHERE ${raw} ~ '\\.0+$')                              AS dot_zero_suffix,
      COUNT(*) FILTER (WHERE ${raw} IS NOT NULL AND ${raw} <> ${NORM(raw)}
                         AND vd_norm.voting_district_code IS NOT NULL)       AS fixable_by_norm,
      COUNT(*) FILTER (WHERE btrim(${raw}) <> '' AND vd_raw.voting_district_code IS NULL
                         AND vd_norm.voting_district_code IS NULL)           AS orphan_after_norm
    FROM ${table}
    LEFT JOIN voting_districts vd_raw  ON ${raw} = vd_raw.voting_district_code
    LEFT JOIN voting_districts vd_norm ON ${NORM(raw)} = vd_norm.voting_district_code
  `;
  const res = await pool.query(sql);
  return res.rows[0];
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Diagnosing member VD codes on host=${host}\n`);
  const pool = makePool();
  try {
    for (const table of ['members_consolidated', 'members']) {
      console.log(`## ${table}`);
      console.table([await diagnose(pool, table)]);

      const sample = await pool.query(`
        SELECT ${table}.voting_district_code AS raw_code,
               ${NORM(`${table}.voting_district_code`)} AS normalized_code,
               vd.voting_district_name AS resolves_to_name
        FROM ${table}
        LEFT JOIN voting_districts vd
          ON ${NORM(`${table}.voting_district_code`)} = vd.voting_district_code
        WHERE ${table}.voting_district_code <> ${NORM(`${table}.voting_district_code`)}
        LIMIT 10
      `);
      console.log(`Sample rows needing normalization in ${table}:`);
      if (sample.rows.length) console.table(sample.rows);
      else console.log('  (none — all codes already normalized)');
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
