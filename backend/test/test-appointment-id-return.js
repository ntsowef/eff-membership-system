const axios = require('axios');

const baseURL = 'http://localhost:5000/api/v1';

async function testAppointmentIdReturn() {
  console.log('🔍 Testing Appointment ID Return\n');

  try {
    // Set timeout for all requests
    axios.defaults.timeout = 10000;
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get a position
    console.log('2. Getting a sub-region position...');
    const positionsResponse = await axios.get(`${baseURL}/leadership/positions`, {
      params: {
        hierarchy_level: 'Municipality',
        entity_id: 570 // BUF - East London
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const position = positionsResponse.data.data.positions[0];
    console.log(`✅ Got position: ${position.position_name} (ID: ${position.id})\n`);

    // Step 3: Get a member
    console.log('3. Getting a member...');
    const membersResponse = await axios.get(`${baseURL}/members`, {
      params: { limit: 1, page: 1 },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const members = membersResponse.data.data.members || membersResponse.data.data;
    if (!members || members.length === 0) {
      throw new Error('No members found');
    }
    const member = Array.isArray(members) ? members[0] : members;
    const memberFirstName = member.firstname || member.first_name || 'Unknown';
    const memberLastName = member.surname || member.last_name || 'Member';
    console.log(`✅ Got member: ${memberFirstName} ${memberLastName} (ID: ${member.member_id})\n`);

    // Step 4: Create appointment
    console.log('4. Creating appointment...');
    const appointmentData = {
      position_id: position.id,
      member_id: member.member_id,
      hierarchy_level: 'Municipality',
      entity_id: 570,
      appointment_type: 'Appointed',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointment_notes: 'Test appointment for ID return verification'
    };

    const createResponse = await axios.post(`${baseURL}/leadership/appointments`, appointmentData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('📦 Full API Response:');
    console.log(JSON.stringify(createResponse.data, null, 2));
    console.log('');

    const appointmentId = createResponse.data.data.appointment_id || createResponse.data.data.id;
    
    if (appointmentId) {
      console.log(`✅ Appointment created successfully!`);
      console.log(`   Appointment ID: ${appointmentId}`);
      console.log(`   Position: ${position.position_name}`);
      console.log(`   Member: ${memberFirstName} ${memberLastName}\n`);

      // Step 5: Verify appointment exists
      console.log('5. Verifying appointment...');
      const appointmentsResponse = await axios.get(`${baseURL}/leadership/appointments`, {
        params: {
          hierarchy_level: 'Municipality',
          entity_id: 570
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appointments = appointmentsResponse.data.data.appointments || appointmentsResponse.data.data;
      const foundAppointment = appointments.find(a => a.id === appointmentId || a.appointment_id === appointmentId);
      
      if (foundAppointment) {
        console.log(`✅ Appointment verified in database (ID: ${foundAppointment.id || foundAppointment.appointment_id})\n`);
      } else {
        console.log(`⚠️  Appointment not found in database\n`);
      }

      // Step 6: Delete appointment
      console.log('6. Deleting test appointment...');
      try {
        await axios.delete(`${baseURL}/leadership/appointments/${appointmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Appointment deleted successfully\n`);
      } catch (deleteError) {
        console.log(`❌ Failed to delete appointment: ${deleteError.response?.data?.message || deleteError.message}\n`);
      }

    } else {
      console.log(`❌ Appointment ID not returned in response!`);
      console.log(`   Response data:`, createResponse.data.data);
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testAppointmentIdReturn().then(() => {
  console.log('\n✅ All tests completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

