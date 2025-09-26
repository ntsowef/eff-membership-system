const mysql = require('mysql2/promise');

async function checkLeadershipStructure() {
  console.log('🏛️ Checking Leadership Structure...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check leadership_appointments table structure
    console.log('📋 Leadership Appointments Table Structure:');
    const [appointmentCols] = await connection.execute('DESCRIBE leadership_appointments');
    appointmentCols.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
    });

    console.log('\n📋 Leadership Positions Table Structure:');
    const [positionCols] = await connection.execute('DESCRIBE leadership_positions');
    positionCols.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
    });

    // Check current appointments
    console.log('\n👥 Current Active Appointments:');
    const [appointments] = await connection.execute(`
      SELECT 
        la.id,
        la.position_id,
        la.member_id,
        la.appointment_status,
        lp.position_name,
        lp.position_code,
        TRIM(CONCAT(COALESCE(m.firstname, ''), ' ', COALESCE(m.surname, ''))) as member_name
      FROM leadership_appointments la
      JOIN leadership_positions lp ON la.position_id = lp.id
      JOIN members m ON la.member_id = m.member_id
      WHERE la.appointment_status = 'Active'
      ORDER BY lp.hierarchy_level, lp.position_name
      LIMIT 10
    `);

    appointments.forEach(appt => {
      console.log(`   ${appt.position_name} (${appt.position_code}): ${appt.member_name} [ID: ${appt.id}]`);
    });

    // Check vacant positions
    console.log('\n🏢 Vacant Positions (No Active Appointments):');
    const [vacantPositions] = await connection.execute(`
      SELECT
        lp.id,
        lp.position_name,
        lp.position_code,
        lp.hierarchy_level
      FROM leadership_positions lp
      LEFT JOIN leadership_appointments la ON lp.id = la.position_id
        AND la.appointment_status = 'Active'
      WHERE lp.is_active = TRUE
        AND la.id IS NULL
      ORDER BY lp.hierarchy_level, lp.position_name
      LIMIT 10
    `);

    if (vacantPositions.length > 0) {
      vacantPositions.forEach(pos => {
        console.log(`   ${pos.position_name} (${pos.position_code}) - ${pos.hierarchy_level} level`);
      });
    } else {
      console.log('   No vacant positions found (all positions have active appointments)');
    }

    // Check appointment statuses
    console.log('\n📊 Appointment Status Summary:');
    const [statusSummary] = await connection.execute(`
      SELECT 
        appointment_status,
        COUNT(*) as count
      FROM leadership_appointments
      GROUP BY appointment_status
      ORDER BY count DESC
    `);

    statusSummary.forEach(status => {
      console.log(`   ${status.appointment_status}: ${status.count} appointments`);
    });

    console.log('\n💡 Understanding the Structure:');
    console.log('   • leadership_positions: Defines available positions (President, Secretary, etc.)');
    console.log('   • leadership_appointments: Links members to positions with status');
    console.log('   • To "remove" a member: Change appointment_status from "Active" to "Vacant"');
    console.log('   • To make position vacant: No active appointments for that position');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkLeadershipStructure().catch(console.error);
