const mysql = require('mysql2/promise');

async function checkNationalLeadership() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking National Leadership Structure...\n');

    // 1. Check all national leadership positions
    console.log('📋 All National Leadership Positions:');
    const [positions] = await connection.execute(`
      SELECT 
        id, position_name, position_code, hierarchy_level, 
        is_active, order_index
      FROM leadership_positions 
      WHERE hierarchy_level = 'National' 
      ORDER BY order_index
    `);
    
    console.table(positions);

    // 2. Check active national leadership appointments
    console.log('\n👥 Active National Leadership Appointments:');
    const [appointments] = await connection.execute(`
      SELECT 
        lp.position_name,
        lp.position_code,
        lp.hierarchy_level,
        la.appointment_status,
        m.firstname,
        m.surname,
        m.member_id,
        la.entity_id,
        la.hierarchy_level as appointment_hierarchy
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members m ON la.member_id = m.member_id
      WHERE lp.hierarchy_level = 'National' 
        AND la.appointment_status = 'Active'
      ORDER BY lp.order_index
    `);
    
    console.table(appointments);

    // 3. Check what the invitation query would return for National level
    console.log('\n🎯 What National Meeting Invitation Query Returns:');
    const [invitationData] = await connection.execute(`
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        lp.position_name as role_name,
        lp.position_code as role_code,
        la.hierarchy_level,
        CASE
          WHEN lp.position_code IN ('PRES', 'DPRES', 'SECGEN', 'DSECGEN', 'TREASGEN', 'NCHAIR', 'PCHAIR', 'MCHAIR', 'WCHAIR') THEN TRUE
          WHEN lp.position_code LIKE 'NEC%' OR lp.position_code LIKE 'PEC%' OR lp.position_code LIKE 'MEC%' OR lp.position_code LIKE 'BCT%' THEN TRUE
          ELSE FALSE
        END as has_voting_rights,
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
        AND lp.hierarchy_level = 'National'
      ORDER BY meeting_invitation_priority DESC, m.surname, m.firstname
    `);
    
    console.table(invitationData);

    // 4. Check membership status for national leaders
    console.log('\n✅ National Leaders with Active Membership:');
    const [activeMembers] = await connection.execute(`
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        lp.position_name,
        lp.position_code,
        mst.status_name,
        ms.expiry_date
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN memberships ms ON m.member_id = ms.member_id
      INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND lp.hierarchy_level = 'National'
        AND mst.is_active = TRUE
        AND (ms.expiry_date IS NULL OR ms.expiry_date >= CURDATE())
      ORDER BY lp.order_index
    `);
    
    console.table(activeMembers);

    // 5. Check what meeting type 4 is
    console.log('\n📅 Meeting Type 4 Details:');
    const [meetingType] = await connection.execute(`
      SELECT * FROM meeting_types WHERE id = 4
    `);
    
    console.table(meetingType);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkNationalLeadership().catch(console.error);
