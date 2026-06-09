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
    // 1. Get all provinces
    console.log('\n=== PROVINCES ===');
    const provinces = await pool.query('SELECT id, province_name FROM provinces ORDER BY id');
    provinces.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.province_name}`));

    // 2. Get Limpopo municipalities
    console.log('\n=== LIMPOPO MUNICIPALITIES ===');
    const munis = await pool.query(`
      SELECT m.id, m.municipality_name, m.municipality_code, m.district_id, d.district_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_id = d.id
      WHERE m.province_id = (SELECT id FROM provinces WHERE province_name ILIKE '%limpopo%')
      ORDER BY m.municipality_name
    `);
    munis.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.municipality_name}, Code: ${r.municipality_code}, District: ${r.district_name}`));

    // 3. Get municipality-level leadership positions
    console.log('\n=== MUNICIPALITY LEADERSHIP POSITIONS ===');
    const positions = await pool.query(`
      SELECT id, position_name, position_code, hierarchy_level, position_order
      FROM leadership_positions
      WHERE hierarchy_level = 'Municipality' AND is_active = true
      ORDER BY position_order
    `);
    positions.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.position_name}, Code: ${r.position_code}, Order: ${r.position_order}`));

    // 4. Get ALL leadership positions (all levels)
    console.log('\n=== ALL LEADERSHIP POSITIONS ===');
    const allPositions = await pool.query(`
      SELECT id, position_name, position_code, hierarchy_level, position_order
      FROM leadership_positions
      WHERE is_active = true
      ORDER BY hierarchy_level, position_order
    `);
    allPositions.rows.forEach(r => console.log(`  ID: ${r.id}, Level: ${r.hierarchy_level}, Name: ${r.position_name}, Code: ${r.position_code}`));

    // 5. Check existing appointments for Limpopo municipalities
    console.log('\n=== EXISTING LIMPOPO MUNICIPALITY APPOINTMENTS ===');
    const appointments = await pool.query(`
      SELECT la.id, la.position_id, la.member_id, la.hierarchy_level, la.entity_id, la.appointment_status,
             lp.position_name, m.municipality_name
      FROM leadership_appointments la
      LEFT JOIN leadership_positions lp ON la.position_id = lp.id
      LEFT JOIN municipalities m ON la.entity_id = m.id AND la.hierarchy_level = 'Municipality'
      WHERE la.hierarchy_level = 'Municipality'
        AND la.entity_id IN (SELECT id FROM municipalities WHERE province_id = (SELECT id FROM provinces WHERE province_name ILIKE '%limpopo%'))
      ORDER BY la.entity_id, lp.position_order
    `);
    if (appointments.rows.length === 0) {
      console.log('  No existing appointments found');
    } else {
      appointments.rows.forEach(r => console.log(`  ID: ${r.id}, Position: ${r.position_name}, Municipality: ${r.municipality_name}, Status: ${r.appointment_status}`));
    }

    // 6. Check members_consolidated table structure
    console.log('\n=== MEMBERS_CONSOLIDATED KEY COLUMNS ===');
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
      ORDER BY ordinal_position
    `);
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));

    // 7. Check users table for appointed_by
    console.log('\n=== USERS (first 5) ===');
    const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 5');
    users.rows.forEach(r => console.log(`  ID: ${r.id}, Name: ${r.name}, Email: ${r.email}, Role: ${r.role}`));

    // 8. Sample member lookup by ID number
    console.log('\n=== SAMPLE MEMBER LOOKUP ===');
    const sampleMember = await pool.query(`
      SELECT member_id, id_number, firstname, surname, cell_number, email
      FROM members_consolidated
      LIMIT 3
    `);
    sampleMember.rows.forEach(r => console.log(`  MemberID: ${r.member_id}, ID: ${r.id_number}, Name: ${r.firstname} ${r.surname}`));

    // 9. Check leadership_appointments table structure
    console.log('\n=== LEADERSHIP_APPOINTMENTS TABLE STRUCTURE ===');
    const laCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'leadership_appointments'
      ORDER BY ordinal_position
    `);
    laCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable}, default: ${r.column_default})`));

    // 10. Check leadership_positions table structure
    console.log('\n=== LEADERSHIP_POSITIONS TABLE STRUCTURE ===');
    const lpCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'leadership_positions'
      ORDER BY ordinal_position
    `);
    lpCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable}, default: ${r.column_default})`));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

investigate();

