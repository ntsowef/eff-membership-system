const mysql = require('mysql2/promise');

async function debugLeadershipAppointments() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Debugging Leadership Appointments Structure...\n');

    // Check leadership_appointments table structure
    console.log('📋 Leadership Appointments Table Structure:');
    const [appointmentColumns] = await connection.execute('DESCRIBE leadership_appointments');
    appointmentColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Check leadership_positions table structure
    console.log('\n📋 Leadership Positions Table Structure:');
    const [positionColumns] = await connection.execute('DESCRIBE leadership_positions');
    positionColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Check sample data from leadership_appointments
    console.log('\n📊 Sample Leadership Appointments Data:');
    const [appointments] = await connection.execute(`
      SELECT 
        la.id,
        la.position_id,
        la.member_id,
        la.hierarchy_level,
        la.entity_id,
        la.appointment_status,
        lp.position_name,
        lp.position_code,
        lp.is_active as position_active,
        m.firstname,
        m.surname
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
      LIMIT 10
    `);

    appointments.forEach(app => {
      console.log(`  - ${app.firstname} ${app.surname}: ${app.position_name} (${app.position_code}) - ${app.hierarchy_level} Level`);
    });

    // Test the exact query from the service
    console.log('\n🧪 Testing Service Query Pattern:');
    const [testQuery] = await connection.execute(`
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        m.email,
        m.cell_number as phone_number,
        la.id as appointment_id,
        la.entity_id,
        la.hierarchy_level as entity_type,
        lp.id as position_id,
        lp.position_name as role_name,
        lp.position_code as role_code,
        la.hierarchy_level,
        CASE 
          WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'DSECGEN', 'TREASGEN', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN 'Executive'
          WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' OR lp.position_code LIKE 'MEC%' OR lp.position_code LIKE 'BCT%' THEN 'Leadership'
          WHEN lp.position_code LIKE 'H%' THEN 'Leadership'
          ELSE 'Member'
        END as role_category,
        CASE 
          WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'DSECGEN', 'TREASGEN', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN TRUE
          WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' OR lp.position_code LIKE 'MEC%' OR lp.position_code LIKE 'BCT%' THEN TRUE
          ELSE FALSE
        END as has_voting_rights,
        CASE 
          WHEN lp.position_code IN ('PRES', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN TRUE
          ELSE FALSE
        END as can_chair_meetings,
        CASE 
          WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'NCHAIR') THEN 1
          WHEN lp.position_code IN ('DSECGEN', 'TREASGEN', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN 2
          WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' THEN 3
          ELSE 4
        END as meeting_invitation_priority
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      WHERE la.appointment_status = 'Active' 
        AND lp.is_active = TRUE
      LIMIT 5
    `);

    console.log(`Found ${testQuery.length} members with active leadership appointments:`);
    testQuery.forEach(member => {
      console.log(`  - ${member.firstname} ${member.surname}: ${member.role_name} (${member.role_code}) - Priority: ${member.meeting_invitation_priority}`);
    });

    // Check if there are any members with active memberships
    console.log('\n👥 Checking Members with Active Memberships:');
    const [activeMembers] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM members m
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE mst.is_active = TRUE
        AND (ms.expiry_date IS NULL OR ms.expiry_date >= CURDATE())
    `);
    console.log(`Active members: ${activeMembers[0].count}`);

    // Check combined query (leadership + membership)
    console.log('\n🔗 Testing Combined Query (Leadership + Membership):');
    const [combinedQuery] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE la.appointment_status = 'Active' 
        AND lp.is_active = TRUE
        AND mst.is_active = TRUE
        AND (ms.expiry_date IS NULL OR ms.expiry_date >= CURDATE())
    `);
    console.log(`Members with both active leadership and membership: ${combinedQuery[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

debugLeadershipAppointments();
