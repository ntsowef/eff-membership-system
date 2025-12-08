const axios = require('axios');

async function test() {
  console.log('Testing Appointment ID Return...\n');

  try {
    // Login
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.token;
    console.log('✅ Logged in\n');

    // Create appointment
    const appointmentRes = await axios.post('http://localhost:5000/api/v1/leadership/appointments', {
      position_id: 80305,
      member_id: 1,
      hierarchy_level: 'Municipality',
      entity_id: 570,
      appointment_type: 'Appointed',
      start_date: '2025-10-22',
      end_date: '2026-10-22',
      appointment_notes: 'Test'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('API Response:');
    console.log(JSON.stringify(appointmentRes.data, null, 2));
    console.log('');

    const appointmentId = appointmentRes.data.data.appointment_id;
    
    if (appointmentId) {
      console.log(`✅ SUCCESS! Appointment ID: ${appointmentId}\n`);
      
      // Delete
      await axios.delete(`http://localhost:5000/api/v1/leadership/appointments/${appointmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Cleaned up\n');
      
      process.exit(0);
    } else {
      console.log('❌ FAILED! No appointment ID returned\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();

