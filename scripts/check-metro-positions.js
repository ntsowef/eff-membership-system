const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'eff_admin', password: 'Frames!123',
  database: 'eff_membership_database'
});

(async () => {
  // 1. Check metro sub-region positions
  const r1 = await pool.query(`
    SELECT m.municipality_code, m.municipality_name, COUNT(lp.id) as pos_count
    FROM municipalities m
    LEFT JOIN leadership_positions lp ON m.municipality_id = lp.entity_id AND lp.hierarchy_level = 'Municipality'
    WHERE m.municipality_type = 'Metro Sub-Region'
    GROUP BY m.municipality_code, m.municipality_name
    ORDER BY m.municipality_code
  `);
  console.log('=== Metro Sub-Region Position Counts ===');
  let totalWithPositions = 0;
  r1.rows.forEach(r => {
    const count = parseInt(r.pos_count);
    if (count > 0) totalWithPositions++;
    console.log(`  ${r.municipality_code} | ${r.municipality_name} | positions: ${count}`);
  });
  console.log(`Total metro sub-regions: ${r1.rows.length}`);
  console.log(`With positions: ${totalWithPositions}, Without: ${r1.rows.length - totalWithPositions}`);

  // 2. Check what codes regular municipalities use (sample from Northern Cape dry-run that worked)
  const r2 = await pool.query(`
    SELECT lp.position_code, lp.position_name, lp.position_order
    FROM leadership_positions lp
    JOIN municipalities m ON lp.entity_id = m.municipality_id
    WHERE m.municipality_type = 'Local Municipality'
    AND lp.hierarchy_level = 'Municipality'
    AND m.municipality_code = 'NC091'
    ORDER BY lp.position_order
  `);
  console.log('\n=== Sample: Sol Plaatje (NC091) - Regular Municipality Positions ===');
  r2.rows.forEach(r => console.log(`  ${r.position_code} | ${r.position_name} | order: ${r.position_order}`));

  // 3. Check if any metro sub-region has positions, and what codes they use
  const r3 = await pool.query(`
    SELECT lp.position_code, lp.position_name, m.municipality_code, m.municipality_name
    FROM leadership_positions lp
    JOIN municipalities m ON lp.entity_id = m.municipality_id
    WHERE m.municipality_type = 'Metro Sub-Region'
    AND lp.hierarchy_level = 'Municipality'
    ORDER BY m.municipality_code, lp.position_order
    LIMIT 30
  `);
  console.log('\n=== Existing Metro Sub-Region Positions (first 30) ===');
  if (r3.rows.length === 0) {
    console.log('  NONE FOUND - migration has NOT been run');
  } else {
    r3.rows.forEach(r => console.log(`  ${r.municipality_code} | ${r.position_code} | ${r.position_name}`));
  }

  // 4. Check entity_id type - is it municipality_id (integer) or municipality_code (string)?
  const r4 = await pool.query(`
    SELECT lp.entity_id, lp.position_code, m.municipality_id, m.municipality_code
    FROM leadership_positions lp
    JOIN municipalities m ON lp.entity_id = m.municipality_id
    WHERE m.municipality_code = 'NC091'
    AND lp.hierarchy_level = 'Municipality'
    LIMIT 3
  `);
  console.log('\n=== entity_id check (NC091) ===');
  r4.rows.forEach(r => console.log(`  entity_id: ${r.entity_id} (type: ${typeof r.entity_id}) | municipality_id: ${r.municipality_id} | municipality_code: ${r.municipality_code}`));

  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });

