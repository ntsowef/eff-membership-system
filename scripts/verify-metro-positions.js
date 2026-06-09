const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'eff_admin', password: 'Frames!123',
  database: 'eff_membership_database',
});

(async () => {
  // 1. Count SRCT-style positions for metro sub-regions
  const r1 = await pool.query(`
    SELECT COUNT(*) as cnt
    FROM leadership_positions lp
    JOIN municipalities m ON lp.entity_id = m.municipality_id
    WHERE m.municipality_type = 'Metro Sub-Region'
    AND lp.hierarchy_level = 'Municipality'
    AND (lp.position_code LIKE 'MCHAIR_%'
      OR lp.position_code LIKE 'MSEC_%'
      OR lp.position_code LIKE 'MTREAS_%'
      OR lp.position_code LIKE 'MYOUTH_%'
      OR lp.position_code LIKE 'MWOMEN_%'
      OR lp.position_code LIKE 'SRCT%')
  `);
  console.log('SRCT-style positions for metro sub-regions:', r1.rows[0].cnt);

  // 2. Count total positions per metro sub-region
  const r2 = await pool.query(`
    SELECT m.municipality_code, m.municipality_name, COUNT(lp.id) as total_positions,
      COUNT(CASE WHEN lp.position_code LIKE 'MCHAIR_%' OR lp.position_code LIKE 'MSEC_%'
        OR lp.position_code LIKE 'MTREAS_%' OR lp.position_code LIKE 'MYOUTH_%'
        OR lp.position_code LIKE 'MWOMEN_%' OR lp.position_code LIKE 'SRCT%' THEN 1 END) as srct_positions
    FROM municipalities m
    LEFT JOIN leadership_positions lp ON m.municipality_id = lp.entity_id AND lp.hierarchy_level = 'Municipality'
    WHERE m.municipality_type = 'Metro Sub-Region'
    GROUP BY m.municipality_code, m.municipality_name
    ORDER BY m.municipality_code
  `);
  console.log('\n=== Per Metro Sub-Region ===');
  let allGood = true;
  r2.rows.forEach(r => {
    const ok = parseInt(r.srct_positions) >= 16;
    if (!ok) allGood = false;
    console.log(`  ${r.municipality_code} | ${r.municipality_name} | total: ${r.total_positions} | srct-style: ${r.srct_positions} ${ok ? '✓' : '✗ MISSING'}`);
  });
  console.log(`\nAll 53 have SRCT positions: ${allGood ? 'YES ✓' : 'NO ✗'}`);

  // 3. Verify ETH008 specifically
  const r3 = await pool.query(`
    SELECT lp.position_code, lp.position_name
    FROM leadership_positions lp
    JOIN municipalities m ON lp.entity_id = m.municipality_id
    WHERE m.municipality_code = 'ETH008'
    AND lp.hierarchy_level = 'Municipality'
    AND (lp.position_code LIKE 'MCHAIR_%' OR lp.position_code LIKE 'MSEC_%'
      OR lp.position_code LIKE 'MTREAS_%' OR lp.position_code LIKE 'SRCT%')
    ORDER BY lp.position_order
  `);
  console.log('\n=== ETH008 SRCT-style positions ===');
  r3.rows.forEach(r => console.log(`  ${r.position_code} | ${r.position_name}`));
  console.log('Count:', r3.rows.length);

  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });

