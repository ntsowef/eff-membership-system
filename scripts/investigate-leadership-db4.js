const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function investigate() {
  try {
    // Check Limpopo municipality types
    console.log('\n=== LIMPOPO MUNICIPALITY TYPES ===');
    const munis = await pool.query(`
      SELECT municipality_id, municipality_name, municipality_code, municipality_type
      FROM municipalities
      WHERE province_code = 'LP'
      ORDER BY municipality_name
    `);
    munis.rows.forEach(r => console.log(`  ID: ${r.municipality_id}, Name: ${r.municipality_name}, Code: ${r.municipality_code}, Type: ${r.municipality_type}`));

    // Check if any positions exist for Limpopo municipality IDs
    const muniIds = munis.rows.map(r => r.municipality_id);
    console.log('\n=== EXISTING POSITIONS FOR LIMPOPO MUNICIPALITIES ===');
    const existingPositions = await pool.query(`
      SELECT id, position_name, position_code, entity_id, entity_type
      FROM leadership_positions
      WHERE entity_id = ANY($1::int[])
        AND hierarchy_level = 'Municipality'
        AND is_active = true
      ORDER BY entity_id, position_order
    `, [muniIds]);
    console.log(`  Found ${existingPositions.rows.length} existing positions`);
    existingPositions.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.position_name}, Code: ${r.position_code}, EntityID: ${r.entity_id}`));

    // Check the Rustenburg positions (non-metro example)
    console.log('\n=== RUSTENBURG POSITIONS (example) ===');
    const rustPositions = await pool.query(`
      SELECT id, position_name, position_code, entity_id, entity_type, position_order
      FROM leadership_positions
      WHERE position_code LIKE 'RUST%'
      ORDER BY position_order
    `);
    rustPositions.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.position_name}, Code: ${r.position_code}, EntityID: ${r.entity_id}, Order: ${r.position_order}`));

    // Check if add_municipality_leadership_positions migration was run
    console.log('\n=== POSITIONS WITH MCHAIR_ PREFIX ===');
    const mchairPositions = await pool.query(`
      SELECT id, position_name, position_code, entity_id, entity_type
      FROM leadership_positions
      WHERE position_code LIKE 'MCHAIR_%'
      LIMIT 10
    `);
    console.log(`  Found ${mchairPositions.rows.length} positions with MCHAIR_ prefix`);
    mchairPositions.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.position_name}, Code: ${r.position_code}, EntityID: ${r.entity_id}`));

    // Check total positions count
    console.log('\n=== TOTAL POSITIONS COUNT ===');
    const totalCount = await pool.query('SELECT COUNT(*) as total FROM leadership_positions WHERE is_active = true');
    console.log(`  Total active positions: ${totalCount.rows[0].total}`);

    // Check max position ID
    console.log('\n=== MAX POSITION ID ===');
    const maxId = await pool.query('SELECT MAX(id) as max_id FROM leadership_positions');
    console.log(`  Max position ID: ${maxId.rows[0].max_id}`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

investigate();

