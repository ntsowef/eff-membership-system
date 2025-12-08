const axios = require('axios');

async function test() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginRes.data.data.token;
    const userId = loginRes.data.data.user.user_id;
    
    console.log('✅ Logged in, user_id:', userId);
    
    // Create meeting
    const meetingData = {
      meeting_type: 'BPA',
      presiding_officer_id: 1,
      secretary_id: 2,
      quorum_required: 50,
      quorum_achieved: 55,
      total_attendees: 60,
      meeting_outcome: 'Test',
      key_decisions: 'Test',
      action_items: 'Test',
      next_meeting_date: '2025-11-15',
      quorum_verified_manually: true,
      quorum_verification_notes: 'Test',
      meeting_took_place_verified: true,
      meeting_verification_notes: 'Test'
    };
    
    console.log('\nCreating meeting with data:', JSON.stringify(meetingData, null, 2));
    
    const res = await axios.post(
      'http://localhost:5000/api/v1/ward-audit/ward/41804014/meeting',
      meetingData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('\n✅ SUCCESS:', res.data);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    
    // Try to get more details from the error
    if (error.response?.data?.error) {
      console.error('\nError details:', JSON.stringify(error.response.data.error, null, 2));
    }
  }
}

test();

