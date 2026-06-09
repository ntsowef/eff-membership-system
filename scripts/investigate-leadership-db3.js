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
    // 1. Provinces
    console.log('\n=== PROVINCES ===');
    const provinces = await pool.query('SELECT province_id, province_code, province_name FROM provinces ORDER BY province_id');
    provinces.rows.forEach(r => console.log(`  ID: ${r.province_id}, Code: ${r.province_code}, Name: ${r.province_name}`));

    // 2. Limpopo province code
    const limpopo = provinces.rows.find(r => r.province_name.toLowerCase().includes('limpopo'));
    console.log('\nLimpopo province:', JSON.stringify(limpopo));

    // 3. Limpopo municipalities
    console.log('\n=== LIMPOPO MUNICIPALITIES ===');
    const munis = await pool.query(`
      SELECT m.municipality_id, m.municipality_name, m.municipality_code, m.district_code,
             d.district_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      WHERE m.province_code = $1
      ORDER BY m.municipality_name
    `, [limpopo.province_code]);
    munis.rows.forEach(r => console.log(`  ID: ${r.municipality_id}, Name: ${r.municipality_name}, Code: ${r.municipality_code}, District: ${r.district_name}`));

    // 4. All leadership positions
    console.log('\n=== ALL LEADERSHIP POSITIONS ===');
    const positions = await pool.query(`
      SELECT id, position_name, position_code, hierarchy_level, position_order, entity_id, entity_type
      FROM leadership_positions
      WHERE is_active = true
      ORDER BY hierarchy_level, position_order
    `);
    positions.rows.forEach(r => console.log(`  ID: ${r.id}, Level: ${r.hierarchy_level}, Name: ${r.position_name}, Code: ${r.position_code}, EntityID: ${r.entity_id}, EntityType: ${r.entity_type}`));

    // 5. Existing appointments for Limpopo
    console.log('\n=== EXISTING LIMPOPO APPOINTMENTS ===');
    const muniIds = munis.rows.map(r => r.municipality_id);
    if (muniIds.length > 0) {
      const appts = await pool.query(`
        SELECT la.id, la.position_id, la.member_id, la.hierarchy_level, la.entity_id, la.appointment_status,
               lp.position_name
        FROM leadership_appointments la
        LEFT JOIN leadership_positions lp ON la.position_id = lp.id
        WHERE la.hierarchy_level = 'Municipality'
          AND la.entity_id = ANY($1::int[])
        ORDER BY la.entity_id
      `, [muniIds]);
      console.log(`  Found ${appts.rows.length} existing appointments`);
      appts.rows.slice(0, 10).forEach(r => console.log(`  ID: ${r.id}, Position: ${r.position_name}, EntityID: ${r.entity_id}, Status: ${r.appointment_status}`));
    }

    // 6. Users for appointed_by
    console.log('\n=== USERS (first 5) ===');
    const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 5');
    users.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.name}, Email: ${r.email}, Role: ${r.role}`));

    // 7. Sample members
    console.log('\n=== SAMPLE MEMBERS ===');
    const members = await pool.query('SELECT member_id, id_number, firstname, surname, cell_number, email FROM members_consolidated LIMIT 3');
    members.rows.forEach(r => console.log(`  MemberID: ${r.member_id}, ID: ${r.id_number}, Name: ${r.firstname} ${r.surname}`));

    // 8. Count members
    console.log('\n=== MEMBER COUNT ===');
    const count = await pool.query('SELECT COUNT(*) as total FROM members_consolidated');
    console.log(`  Total members: ${count.rows[0].total}`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

investigate();

