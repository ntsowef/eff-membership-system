/**
 * Investigate parent municipalities/districts for the unresolved/ambiguous
 * missing wards (metros CPT/ETH and the new FS164 municipality).
 * Run from backend/:  node ../test/geographic/inspect-missing-muni.js
 */
const { makePool } = require('./lib-vslisting');

async function q(pool, label, sql, params) {
  const res = await pool.query(sql, params);
  console.log(`\n## ${label}`);
  console.table(res.rows);
}

async function main() {
  const pool = makePool();
  try {
    await q(pool, 'Metro / new municipality codes (CPT*, ETH*, FS16*)', `
      SELECT municipality_code, municipality_name, district_code, province_code
      FROM municipalities
      WHERE municipality_code LIKE 'CPT%' OR municipality_code LIKE 'ETH%'
         OR municipality_code LIKE 'FS16%'
      ORDER BY municipality_code
    `);

    await q(pool, 'Exact codes CPT / ETH / FS164 present?', `
      SELECT municipality_code, municipality_name
      FROM municipalities WHERE municipality_code IN ('CPT','ETH','FS164')
    `);

    await q(pool, 'FS districts', `
      SELECT district_code, district_name, province_code
      FROM districts WHERE province_code = 'FS' ORDER BY district_code
    `);

    await q(pool, 'Existing FS16x wards (to see district/munic pattern)', `
      SELECT w.ward_code, w.municipality_code, m.municipality_name, m.district_code
      FROM wards w JOIN municipalities m ON w.municipality_code = m.municipality_code
      WHERE w.ward_code LIKE '4160%' OR m.municipality_code LIKE 'FS16%'
      ORDER BY w.ward_code LIMIT 20
    `);

    await q(pool, 'Municipality column null-ability check (district_code/province_code)', `
      SELECT
        SUM(CASE WHEN district_code IS NULL THEN 1 ELSE 0 END) AS null_district,
        SUM(CASE WHEN province_code IS NULL THEN 1 ELSE 0 END) AS null_province,
        COUNT(*) AS total
      FROM municipalities
    `);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
