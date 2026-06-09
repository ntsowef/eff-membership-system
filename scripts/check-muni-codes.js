const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database' });

async function main() {
  // Check CPT zone codes
  const res = await pool.query(`
    SELECT municipality_code, municipality_name, district_code, parent_municipality_id 
    FROM municipalities 
    WHERE municipality_code LIKE 'CPT%'
    ORDER BY municipality_code
  `);
  console.log('=== CPT zones ===');
  res.rows.forEach(r => console.log(r.municipality_code, '|', r.municipality_name, '| district:', r.district_code, '| parent:', r.parent_municipality_id));

  // Check the district order - what districts are in each province?
  const res2 = await pool.query(`
    SELECT p.province_name, d.district_code, d.district_name
    FROM districts d
    JOIN provinces p ON d.province_code = p.province_code
    ORDER BY p.province_name, d.district_name
  `);
  console.log('\n=== Districts by Province ===');
  res2.rows.forEach(r => console.log(r.province_name, '|', r.district_code, '|', r.district_name));

  // Check ward counts per municipality (just a few)
  const res3 = await pool.query(`
    SELECT w.municipality_code, COUNT(*) as ward_count
    FROM wards w 
    WHERE w.municipality_code IN ('EC101', 'EC102', 'EC108', 'EC109', 'MAN002', 'MAN003', 'MAN004')
    GROUP BY w.municipality_code
    ORDER BY w.municipality_code
  `);
  console.log('\n=== Ward counts ===');
  res3.rows.forEach(r => console.log(r.municipality_code, '| wards:', r.ward_count));

  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });

