const mysql = require('mysql2/promise');

async function checkMemberNames() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking Member Names in Leadership Appointments...\n');

    // Check the raw member data
    console.log('👥 Raw Member Data:');
    const [rawMembers] = await connection.execute(`
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')) as full_name,
        TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, ''))) as trimmed_name
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      WHERE la.appointment_status = 'Active'
      ORDER BY m.member_id
    `);
    
    console.table(rawMembers);

    // Check what the leadership API query returns
    console.log('\n🏛️ Leadership Appointments Query Result:');
    const [appointments] = await connection.execute(`
      SELECT 
        la.id,
        m.member_id,
        m.firstname,
        m.surname,
        CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, '')) as constructed_name,
        TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, ''))) as member_name,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as member_number,
        lp.position_name,
        lp.position_code,
        lp.hierarchy_level,
        la.entity_id,
        la.start_date
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
      ORDER BY lp.hierarchy_level, lp.order_index, m.surname, m.firstname
    `);
    
    console.table(appointments);

    // Check for members with missing names
    console.log('\n⚠️ Members with Missing Name Components:');
    const [missingNames] = await connection.execute(`
      SELECT 
        m.member_id,
        m.firstname,
        m.surname,
        CASE 
          WHEN m.firstname IS NULL OR m.firstname = '' THEN 'Missing firstname'
          WHEN m.surname IS NULL OR m.surname = '' THEN 'Missing surname'
          ELSE 'Complete'
        END as name_status,
        lp.position_name
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      WHERE la.appointment_status = 'Active'
        AND (m.firstname IS NULL OR m.firstname = '' OR m.surname IS NULL OR m.surname = '')
      ORDER BY m.member_id
    `);
    
    if (missingNames.length > 0) {
      console.table(missingNames);
    } else {
      console.log('✅ All active leaders have complete names');
    }

    // Test the exact query used by the leadership service
    console.log('\n🔧 Testing Leadership Service Query:');
    const [serviceQuery] = await connection.execute(`
      SELECT 
        la.id,
        la.member_id,
        la.position_id,
        la.hierarchy_level,
        la.entity_id,
        la.appointment_type,
        la.start_date,
        la.end_date,
        la.appointment_status,
        la.appointment_notes,
        la.appointed_by,
        la.terminated_by,
        la.termination_reason,
        la.terminated_at,
        la.created_at,
        la.updated_at,
        lp.position_name,
        lp.position_code,
        TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, ''))) as member_name,
        CONCAT('MEM', LPAD(m.member_id, 6, '0')) as member_number,
        COALESCE(appointed_by_user.firstname, 'System') as appointed_by_name,
        COALESCE(terminated_by_user.firstname, '') as terminated_by_name,
        CASE 
          WHEN la.hierarchy_level = 'National' THEN 'National Office'
          WHEN la.hierarchy_level = 'Province' THEN CONCAT('Province ', la.entity_id)
          WHEN la.hierarchy_level = 'Municipality' THEN CONCAT('Municipality ', la.entity_id)
          WHEN la.hierarchy_level = 'Ward' THEN CONCAT('Ward ', la.entity_id)
          ELSE 'Unknown'
        END as entity_name
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members m ON la.member_id = m.member_id
      LEFT JOIN members appointed_by_user ON la.appointed_by = appointed_by_user.member_id
      LEFT JOIN members terminated_by_user ON la.terminated_by = terminated_by_user.member_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
      ORDER BY lp.hierarchy_level, lp.order_index
    `);
    
    console.table(serviceQuery.map(row => ({
      id: row.id,
      member_id: row.member_id,
      position: row.position_name,
      member_name: row.member_name,
      member_number: row.member_number,
      entity: row.entity_name,
      firstname: row.firstname,
      surname: row.surname
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkMemberNames().catch(console.error);
