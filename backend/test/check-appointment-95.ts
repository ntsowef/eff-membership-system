/**
 * Check if appointment ID 95 exists
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function checkAppointment() {
  await initializeDatabase();
  
  try {
    console.log('\n🔍 Checking Appointment ID 95\n');
    console.log('='.repeat(80));
    
    // Check if appointment exists
    const query = `
      SELECT 
        id,
        position_id,
        member_id,
        hierarchy_level,
        entity_id,
        appointment_type,
        appointment_status,
        start_date,
        end_date,
        termination_reason,
        terminated_by
      FROM leadership_appointments
      WHERE id = 95;
    `;
    
    const result = await executeQuery(query);
    
    if (result.length === 0) {
      console.log('❌ Appointment ID 95 NOT FOUND');
    } else {
      console.log('✅ Appointment ID 95 EXISTS:');
      console.table(result);
    }
    
    // Check all appointments
    console.log('\n📊 All Appointments (Sample):');
    const allQuery = `
      SELECT 
        id,
        member_id,
        appointment_status,
        start_date,
        end_date
      FROM leadership_appointments
      ORDER BY id DESC
      LIMIT 10;
    `;
    
    const allResults = await executeQuery(allQuery);
    console.table(allResults);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAppointment();

