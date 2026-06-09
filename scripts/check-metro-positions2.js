const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'eff_admin', password: 'Frames!123',
  database: 'eff_membership_database'
});

(async () => {
  // 1. Check Sol Plaatje municipality details
  const r1 = await pool.query(`
    SELECT municipality_id, municipality_name, municipality_code, municipality_type
    FROM municipalities WHERE municipality_code = 'NC091'
  `);
  console.log('=== Sol Plaatje municipality ===');
  console.log(r1.rows[0]);

  // 2. Check positions for Sol Plaatje by municipality_id directly
  const solId = r1.rows[0].municipality_id;
  const r2 = await pool.query(`
    SELECT id, position_code, position_name, entity_id, hierarchy_level
    FROM leadership_positions
    WHERE entity_id = $1 AND hierarchy_level = 'Municipality'
    ORDER BY position_order
  `, [solId]);
  console.log('\n=== Sol Plaatje positions (by municipality_id=' + solId + ') ===');
  r2.rows.forEach(r => console.log(`  ${r.position_code} | ${r.position_name} | entity_id: ${r.entity_id}`));
  console.log('Count:', r2.rows.length);

  // 3. Check a working municipality from Northern Cape dry-run (Joe Morolong, id=538)
  const r3 = await pool.query(`
    SELECT id, position_code, position_name, entity_id
    FROM leadership_positions
    WHERE entity_id = 538 AND hierarchy_level = 'Municipality'
    ORDER BY position_order
  `);
  console.log('\n=== Joe Morolong positions (entity_id=538) ===');
  r3.rows.forEach(r => console.log(`  ${r.position_code} | ${r.position_name}`));
  console.log('Count:', r3.rows.length);

  // 4. Check ETH008 (eThekwini South) positions
  const r4a = await pool.query(`
    SELECT municipality_id, municipality_name, municipality_code, municipality_type
    FROM municipalities WHERE municipality_code = 'ETH008'
  `);
  console.log('\n=== ETH008 municipality ===');
  console.log(r4a.rows[0]);
  
  const ethId = r4a.rows[0].municipality_id;
  const r4 = await pool.query(`
    SELECT id, position_code, position_name, entity_id
    FROM leadership_positions
    WHERE entity_id = $1 AND hierarchy_level = 'Municipality'
    ORDER BY position_order
  `, [ethId]);
  console.log('\n=== ETH008 positions (entity_id=' + ethId + ') ===');
  r4.rows.forEach(r => console.log(`  ${r.position_code} | ${r.position_name}`));
  console.log('Count:', r4.rows.length);

  // 5. Check entity_id data type in leadership_positions
  const r5 = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'leadership_positions' AND column_name = 'entity_id'
  `);
  console.log('\n=== entity_id column type ===');
  console.log(r5.rows[0]);

  pool.end();
})().catch(e => { console.error(e.message); pool.end(); });

