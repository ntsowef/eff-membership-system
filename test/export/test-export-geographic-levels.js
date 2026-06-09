/**
 * Test: Export query at all geographic levels
 * Verifies that the export query returns results at each geographic filter level,
 * including metro sub-region expansion.
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database'
});

const EXPECTED_COLUMNS = [
  'province_name', 'district_name', 'municipality_name', 'voting_district_name', 'ward_name',
  'firstname', 'surname', 'id_number', 'age', 'gender_name',
  'race_name', 'citizenship_name', 'language_name', 'residential_address',
  'cell_number', 'landline_number', 'email', 'occupation_name',
  'qualification_name', 'date_joined', 'last_payment_date', 'subscription_type',
  'membership_amount', 'membership_status'
];

async function testExportQuery(label, whereClause, params) {
  const sql = `SELECT * FROM vw_member_details WHERE 1=1 ${whereClause} ORDER BY surname, firstname LIMIT 5`;
  const result = await pool.query(sql, params);
  const count = result.rows.length;
  const missingCols = EXPECTED_COLUMNS.filter(c => count > 0 && !(c in result.rows[0]));
  const status = count > 0 && missingCols.length === 0 ? '✅ PASS' : count > 0 ? '⚠️  PARTIAL' : '❌ EMPTY';
  console.log(`${status} | ${label.padEnd(40)} | rows=${count}${missingCols.length ? ` | missing: ${missingCols.join(',')}` : ''}`);
  return count;
}

async function testMetroSubregionExpansion(metroCode) {
  // Mimic the backend subregion expansion logic
  const subQ = await pool.query(
    `SELECT municipality_code FROM municipalities WHERE parent_municipality_id = (SELECT municipality_id FROM municipalities WHERE municipality_code = $1)`,
    [metroCode]
  );
  const codes = [metroCode, ...subQ.rows.map(r => r.municipality_code)];
  const placeholders = codes.map((_, i) => `$${i + 1}`).join(',');
  const result = await pool.query(
    `SELECT COUNT(*) AS cnt FROM vw_member_details WHERE municipality_code IN (${placeholders}) AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`,
    codes
  );
  const cnt = parseInt(result.rows[0].cnt);
  const status = cnt > 0 ? '✅ PASS' : '❌ EMPTY';
  console.log(`${status} | Metro expansion: ${metroCode.padEnd(29)} | total_members=${cnt} (${codes.length} sub-codes)`);
  return cnt;
}

async function main() {
  try {
    console.log('=== Export Query Test at All Geographic Levels ===\n');

    // 1. Province level
    await testExportQuery('Province: GP (Gauteng)', `AND province_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, ['GP']);

    // 2. District level
    const districtRow = await pool.query(`SELECT district_code FROM vw_member_details WHERE province_code = 'GP' AND district_code IS NOT NULL LIMIT 1`);
    if (districtRow.rows.length > 0) {
      const dc = districtRow.rows[0].district_code;
      await testExportQuery(`District: ${dc}`, `AND district_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, [dc]);
    }

    // 3. Municipality level (non-metro)
    const nonMetroRow = await pool.query(`SELECT municipality_code, municipality_name FROM vw_member_details WHERE municipality_type = 'Local' AND municipality_code IS NOT NULL LIMIT 1`);
    if (nonMetroRow.rows.length > 0) {
      const mc = nonMetroRow.rows[0].municipality_code;
      await testExportQuery(`Municipality (non-metro): ${mc}`, `AND municipality_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, [mc]);
    }

    // 4. Metro sub-region expansion
    console.log('\n--- Metro Sub-Region Expansion Tests ---');
    const metros = ['JHB', 'CPT', 'ETH', 'TSH', 'EKU'];
    for (const metro of metros) {
      await testMetroSubregionExpansion(metro);
    }

    // 5. Sub-region level (direct)
    console.log('\n--- Sub-Region Direct Filter ---');
    const subregionRow = await pool.query(`SELECT municipality_code FROM municipalities WHERE parent_municipality_id IS NOT NULL LIMIT 1`);
    if (subregionRow.rows.length > 0) {
      const src = subregionRow.rows[0].municipality_code;
      await testExportQuery(`Sub-region: ${src}`, `AND municipality_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, [src]);
    }

    // 6. Ward level
    const wardRow = await pool.query(`SELECT ward_code FROM vw_member_details WHERE ward_code IS NOT NULL AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' LIMIT 1`);
    if (wardRow.rows.length > 0) {
      const wc = wardRow.rows[0].ward_code;
      await testExportQuery(`Ward: ${wc}`, `AND ward_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, [wc]);
    }

    // 7. Voting district level
    const vdRow = await pool.query(`SELECT voting_district_code FROM vw_member_details WHERE voting_district_code IS NOT NULL AND voting_district_code NOT IN ('22222222','33333333','99999999','11111111') AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' LIMIT 1`);
    if (vdRow.rows.length > 0) {
      const vdc = vdRow.rows[0].voting_district_code;
      await testExportQuery(`Voting District: ${vdc}`, `AND voting_district_code = $1 AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'`, [vdc]);
    }

    // 8. Verify all 24 columns present
    console.log('\n--- Column Verification ---');
    const sampleRow = await pool.query(`SELECT * FROM vw_member_details LIMIT 1`);
    if (sampleRow.rows.length > 0) {
      const cols = Object.keys(sampleRow.rows[0]);
      const missing = EXPECTED_COLUMNS.filter(c => !cols.includes(c));
      console.log(missing.length === 0 ? '✅ All 24 export columns present in view' : `❌ Missing columns: ${missing.join(', ')}`);
    }

    console.log('\n=== Test Complete ===');
  } catch (e) {
    console.error('Test error:', e.message);
  } finally {
    pool.end();
  }
}

main();

