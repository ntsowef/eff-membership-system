const mysql = require('mysql2/promise');

async function checkMeetingType4() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔍 Checking Meeting Type 4...\n');

    // Check meeting type 4 details
    console.log('📅 Meeting Type 4 Details:');
    const [meetingType] = await connection.execute(`
      SELECT * FROM meeting_types WHERE type_id = 4
    `);
    
    console.table(meetingType);

    // Check what the invitation service logic should do for this meeting type
    console.log('\n🎯 Testing Invitation Logic for Meeting Type 4:');
    
    if (meetingType.length > 0) {
      const type = meetingType[0];
      console.log(`Meeting Type: ${type.type_name} (${type.type_code})`);
      console.log(`Hierarchy Level: ${type.hierarchy_level}`);
      console.log(`Auto Invite Rules: ${type.auto_invite_rules}`);
      
      // Parse auto invite rules
      try {
        const rules = JSON.parse(type.auto_invite_rules);
        console.log('Parsed Rules:', rules);
      } catch (e) {
        console.log('Could not parse auto invite rules as JSON');
      }
    }

    // Test the exact query that should be used for National level meetings
    console.log('\n🏛️ National Leadership Query (what should be returned):');
    const [nationalLeaders] = await connection.execute(`
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
        AND lp.hierarchy_level = 'National'
      ORDER BY meeting_invitation_priority DESC, m.surname, m.firstname
    `);
    
    console.table(nationalLeaders);

    // Check if there are any provincial chairpersons being returned instead
    console.log('\n🏛️ Provincial Chairpersons (what might be returned instead):');
    const [provincialChairs] = await connection.execute(`
      SELECT DISTINCT
        m.member_id,
        m.firstname,
        m.surname,
        lp.position_name as role_name,
        lp.position_code as role_code,
        la.hierarchy_level,
        la.entity_id
      FROM members m
      INNER JOIN leadership_appointments la ON m.member_id = la.member_id
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      WHERE la.appointment_status = 'Active'
        AND lp.is_active = TRUE
        AND lp.position_code = 'PCHAIR'
      ORDER BY la.entity_id
    `);
    
    console.table(provincialChairs);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkMeetingType4().catch(console.error);
