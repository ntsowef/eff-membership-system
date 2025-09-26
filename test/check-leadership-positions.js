const mysql = require('mysql2/promise');

async function checkLeadershipPositions() {
  console.log('🔍 Checking Leadership Positions and Appointments...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check leadership positions
    console.log('📋 Leadership Positions:');
    const [positions] = await connection.execute(`
      SELECT id, position_name, position_code, hierarchy_level, order_index, is_active 
      FROM leadership_positions 
      WHERE is_active = TRUE 
      ORDER BY hierarchy_level, order_index
    `);
    
    positions.forEach(pos => {
      console.log(`   ${pos.hierarchy_level}: ${pos.position_name} (${pos.position_code}) - Order: ${pos.order_index}`);
    });

    // Check leadership appointments
    console.log('\n👥 Current Leadership Appointments:');
    const [appointments] = await connection.execute(`
      SELECT 
        la.id,
        la.member_id,
        lp.position_name,
        lp.position_code,
        la.hierarchy_level,
        la.entity_id,
        la.appointment_status,
        CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name
      FROM leadership_appointments la
      INNER JOIN leadership_positions lp ON la.position_id = lp.id
      INNER JOIN members m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
      ORDER BY la.hierarchy_level, lp.order_index
    `);

    if (appointments.length === 0) {
      console.log('   ❌ No active leadership appointments found!');
    } else {
      appointments.forEach(app => {
        console.log(`   ${app.hierarchy_level}: ${app.member_name} → ${app.position_name} (Entity: ${app.entity_id})`);
      });
    }

    // Compare with organizational roles
    console.log('\n🔄 Organizational Roles (current system):');
    const [orgRoles] = await connection.execute(`
      SELECT role_id, role_name, role_code, hierarchy_level, role_category 
      FROM organizational_roles 
      WHERE is_active = TRUE 
      ORDER BY hierarchy_level, role_name
    `);
    
    orgRoles.forEach(role => {
      console.log(`   ${role.hierarchy_level}: ${role.role_name} (${role.role_code}) - Category: ${role.role_category}`);
    });

    // Check member_roles vs leadership_appointments
    console.log('\n📊 Data Comparison:');
    const [memberRolesCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM member_roles WHERE is_active = TRUE
    `);
    const [appointmentsCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM leadership_appointments WHERE appointment_status = 'Active'
    `);
    
    console.log(`   Member Roles (current): ${memberRolesCount[0].count}`);
    console.log(`   Leadership Appointments: ${appointmentsCount[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the script
checkLeadershipPositions().catch(console.error);
