const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testMeetingCreationFinal() {
  console.log('🧪 Testing Final Meeting Creation Implementation...\n');

  try {
    // Test with complete data including entity_id
    console.log('📝 Test: National meeting with complete data');
    const nationalMeetingData = {
      title: 'Final Test National Meeting',
      meeting_type_id: 4, // CCT/NEC Quarterly Meeting
      hierarchy_level: 'National',
      entity_id: 1, // Provide entity_id explicitly
      entity_type: 'National',
      meeting_date: '2025-09-26',
      meeting_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
      location: 'National Office',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Final test meeting for National level',
      objectives: 'Test the complete meeting creation flow',
      agenda_summary: 'Testing agenda',
      quorum_required: 5,
      auto_send_invitations: false
    };

    console.log('📤 Sending request with data:', JSON.stringify(nationalMeetingData, null, 2));

    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, nationalMeetingData);
    console.log('✅ National meeting created successfully!');
    console.log('📊 Response:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.log('❌ Network Error: No response received');
      console.log('Request details:', error.request);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Test Provincial meeting with geographic data
    console.log('📝 Test: Provincial meeting with geographic selection');
    const provincialMeetingData = {
      title: 'Test Provincial Meeting',
      meeting_type_id: 5, // Assuming Provincial People's Assembly
      hierarchy_level: 'Provincial',
      entity_id: 1,
      entity_type: 'Province',
      meeting_date: '2025-09-27',
      meeting_time: '10:00',
      end_time: '12:00',
      duration_minutes: 120,
      location: 'Provincial Office',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Provincial meeting test',
      objectives: 'Test provincial meeting creation',
      agenda_summary: 'Provincial agenda',
      quorum_required: 10,
      auto_send_invitations: false,
      province_code: 'GP' // Geographic selection
    };

    console.log('📤 Sending provincial meeting request...');

    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, provincialMeetingData);
    console.log('✅ Provincial meeting created successfully!');
    console.log('📊 Response:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Provincial Meeting Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run the test
testMeetingCreationFinal().catch(console.error);
