/**
 * Check Appointment Status
 * 
 * This script checks the status of a specific appointment
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function checkAppointmentStatus() {
  try {
    const appointmentId = process.argv[2] || 93;
    
    console.log(`🔍 Checking appointment ID: ${appointmentId}\n`);
    console.log('=' .repeat(80));

    // Get appointment details
    const query = `
      SELECT 
        la.*,
        lp.position_name,
        lp.position_code,
        lp.hierarchy_level as position_hierarchy,
        m.firstname || ' ' || COALESCE(m.surname, '') as member_name,
        'MEM' || LPAD(m.member_id::TEXT, 6, '0') as membership_number
      FROM leadership_appointments la
      JOIN leadership_positions lp ON la.position_id = lp.id
      LEFT JOIN members m ON la.member_id = m.member_id
      WHERE la.id = $1
    `;
    
    const result = await pool.query(query, [appointmentId]);
    
    if (result.rows.length === 0) {
      console.log(`❌ Appointment ID ${appointmentId} not found`);
      return;
    }
    
    const appointment = result.rows[0];
    
    console.log('\n📋 Appointment Details:');
    console.log('-'.repeat(80));
    console.log(`ID: ${appointment.id}`);
    console.log(`Position: ${appointment.position_name} (${appointment.position_code})`);
    console.log(`Hierarchy: ${appointment.hierarchy_level} (Entity ID: ${appointment.entity_id})`);
    console.log(`Member: ${appointment.member_name} (${appointment.membership_number})`);
    console.log(`\nStatus: ${appointment.appointment_status} ${appointment.appointment_status === 'Active' ? '✅' : '⚠️'}`);
    console.log(`Type: ${appointment.appointment_type}`);
    console.log(`Start Date: ${appointment.start_date || 'Not set'}`);
    console.log(`End Date: ${appointment.end_date || 'Not set'}`);
    
    if (appointment.termination_reason) {
      console.log(`\nTermination Reason: ${appointment.termination_reason}`);
    }
    
    if (appointment.notes) {
      console.log(`Notes: ${appointment.notes}`);
    }
    
    console.log(`\nCreated: ${appointment.created_at}`);
    console.log(`Updated: ${appointment.updated_at}`);
    
    // Check if can be removed
    console.log('\n' + '='.repeat(80));
    if (appointment.appointment_status === 'Active') {
      console.log('✅ This appointment CAN be removed (status is Active)');
    } else {
      console.log(`❌ This appointment CANNOT be removed (status is ${appointment.appointment_status}, not Active)`);
      console.log('\n💡 Possible solutions:');
      console.log('   1. Only remove appointments with "Active" status');
      console.log('   2. Update the appointment status to "Active" first (if appropriate)');
      console.log('   3. Use a different endpoint to modify non-active appointments');
    }
    
    // Show all appointments for this position
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 All appointments for position: ${appointment.position_name}`);
    console.log('-'.repeat(80));
    
    const allQuery = `
      SELECT 
        la.id,
        la.appointment_status,
        la.start_date,
        la.end_date,
        m.firstname || ' ' || COALESCE(m.surname, '') as member_name
      FROM leadership_appointments la
      LEFT JOIN members m ON la.member_id = m.member_id
      WHERE la.position_id = $1
      ORDER BY la.created_at DESC
    `;
    
    const allResult = await pool.query(allQuery, [appointment.position_id]);
    
    allResult.rows.forEach(row => {
      const statusIcon = row.appointment_status === 'Active' ? '✅' : 
                        row.appointment_status === 'Completed' ? '✔️' : 
                        row.appointment_status === 'Terminated' ? '❌' : '⚠️';
      console.log(`${statusIcon} ID ${row.id}: ${row.member_name} - ${row.appointment_status}`);
      console.log(`   Start: ${row.start_date || 'Not set'}, End: ${row.end_date || 'Not set'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkAppointmentStatus().catch(console.error);

