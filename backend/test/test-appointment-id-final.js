const axios = require('axios');

const baseURL = 'http://localhost:5000/api/v1';

async function testAppointmentIdReturn() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 TESTING APPOINTMENT ID RETURN FIX');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Set timeout
    axios.defaults.timeout = 10000;

    // Step 1: Login
    console.log('STEP 1: Authentication');
    console.log('─────────────────────────────────────────────────────────────');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Create appointment
    console.log('STEP 2: Create Appointment');
    console.log('─────────────────────────────────────────────────────────────');
    const appointmentData = {
      position_id: 80301, // BUF - East London Sub-Region Chairperson
      member_id: 1, // Use member ID 1 (should exist)
      hierarchy_level: 'Municipality',
      entity_id: 570, // BUF - East London
      appointment_type: 'Appointed',
      start_date: '2025-10-22',
      end_date: '2026-10-22',
      appointment_notes: 'Test appointment for ID return verification'
    };

    console.log('Creating appointment with data:');
    console.log(`  Position ID: ${appointmentData.position_id}`);
    console.log(`  Member ID: ${appointmentData.member_id}`);
    console.log(`  Hierarchy: ${appointmentData.hierarchy_level}`);
    console.log(`  Entity ID: ${appointmentData.entity_id}`);
    console.log('');

    const createResponse = await axios.post(`${baseURL}/leadership/appointments`, appointmentData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('📦 API Response:');
    console.log(JSON.stringify(createResponse.data, null, 2));
    console.log('');

    const appointmentId = createResponse.data.data.appointment_id || createResponse.data.data.id;
    
    if (appointmentId && appointmentId !== 0) {
      console.log('✅ SUCCESS: Appointment ID returned!');
      console.log(`   Appointment ID: ${appointmentId}`);
      console.log(`   Type: ${typeof appointmentId}`);
      console.log('');

      // Step 3: Verify appointment exists
      console.log('STEP 3: Verify Appointment');
      console.log('─────────────────────────────────────────────────────────────');
      const appointmentsResponse = await axios.get(`${baseURL}/leadership/appointments`, {
        params: {
          hierarchy_level: 'Municipality',
          entity_id: 570
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appointments = appointmentsResponse.data.data.appointments || appointmentsResponse.data.data;
      const foundAppointment = Array.isArray(appointments) ? 
        appointments.find(a => (a.id === appointmentId || a.appointment_id === appointmentId)) : null;
      
      if (foundAppointment) {
        console.log(`✅ Appointment verified in database`);
        console.log(`   ID: ${foundAppointment.id || foundAppointment.appointment_id}`);
        console.log(`   Position ID: ${foundAppointment.position_id}`);
        console.log(`   Member ID: ${foundAppointment.member_id}`);
        console.log('');
      } else {
        console.log(`⚠️  Appointment not found in database (might be a different ID)`);
        console.log(`   Total appointments found: ${Array.isArray(appointments) ? appointments.length : 0}`);
        console.log('');
      }

      // Step 4: Delete appointment
      console.log('STEP 4: Cleanup');
      console.log('─────────────────────────────────────────────────────────────');
      try {
        await axios.delete(`${baseURL}/leadership/appointments/${appointmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Test appointment deleted successfully\n`);
      } catch (deleteError) {
        console.log(`⚠️  Could not delete appointment: ${deleteError.response?.data?.message || deleteError.message}`);
        console.log(`   (This is OK - appointment can be cleaned up manually)\n`);
      }

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅ TEST PASSED: Appointment ID is now returned correctly!');
      console.log('═══════════════════════════════════════════════════════════════');
      process.exit(0);

    } else {
      console.log('❌ FAILURE: Appointment ID not returned or is 0!');
      console.log(`   Received: ${appointmentId}`);
      console.log(`   Response data:`, createResponse.data.data);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('❌ TEST FAILED: Appointment ID not returned');
      console.log('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('❌ TEST FAILED WITH ERROR');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

testAppointmentIdReturn();

