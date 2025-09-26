const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testMeetingCreationWithEmptyFields() {
  console.log('🧪 Testing Meeting Creation with Empty Optional Fields...\n');

  try {
    // Test 1: National meeting with empty optional fields
    console.log('📝 Test 1: National meeting with empty optional fields');
    const nationalMeetingData = {
      title: 'Test National Meeting',
      meeting_type_id: 4, // CCT/NEC Quarterly Meeting
      hierarchy_level: 'National',
      entity_id: 1,
      entity_type: 'National',
      meeting_date: '2025-09-26',
      meeting_time: '09:00',
      end_time: '', // Empty string
      duration_minutes: 240,
      location: '', // Empty string
      virtual_meeting_link: '', // Empty string
      meeting_platform: 'In-Person',
      description: '', // Empty string
      objectives: '', // Empty string
      agenda_summary: '', // Empty string
      quorum_required: 5,
      auto_send_invitations: true
    };

    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, nationalMeetingData);
    console.log('✅ National meeting created successfully!');
    console.log('📊 Response:', {
      status: response.status,
      meetingId: response.data.meeting?.meeting_id,
      title: response.data.meeting?.title
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Validation Error:', {
        status: error.response.status,
        message: error.response.data.message,
        details: error.response.data.details
      });
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Test 2: Provincial meeting with geographic selection
    console.log('📝 Test 2: Provincial meeting with geographic selection');
    const provincialMeetingData = {
      title: 'Test Provincial Meeting',
      meeting_type_id: 5, // Provincial People's Assembly
      hierarchy_level: 'Provincial',
      entity_id: 1,
      entity_type: 'Province',
      meeting_date: '2025-09-27',
      meeting_time: '10:00',
      end_time: '12:00', // With end time
      duration_minutes: 120,
      location: 'Provincial Office',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Provincial meeting test',
      objectives: '',
      agenda_summary: '',
      quorum_required: 10,
      auto_send_invitations: false,
      province_code: 'GP' // Geographic selection
    };

    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, provincialMeetingData);
    console.log('✅ Provincial meeting created successfully!');
    console.log('📊 Response:', {
      status: response.status,
      meetingId: response.data.meeting?.meeting_id,
      title: response.data.meeting?.title
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Validation Error:', {
        status: error.response.status,
        message: error.response.data.message,
        details: error.response.data.details
      });
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Test 3: Municipal meeting with full geographic selection
    console.log('📝 Test 3: Municipal meeting with full geographic selection');
    const municipalMeetingData = {
      title: 'Test Municipal Meeting',
      meeting_type_id: 6, // Municipal People's Assembly
      hierarchy_level: 'Municipal',
      entity_id: 1,
      entity_type: 'Municipality',
      meeting_date: '2025-09-28',
      meeting_time: '14:00',
      end_time: '', // Empty end time
      duration_minutes: 180,
      location: '',
      virtual_meeting_link: 'https://meet.google.com/test',
      meeting_platform: 'Virtual',
      description: '',
      objectives: 'Municipal objectives',
      agenda_summary: '',
      quorum_required: 15,
      auto_send_invitations: true,
      province_code: 'GP',
      municipality_code: 'JHB'
    };

    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, municipalMeetingData);
    console.log('✅ Municipal meeting created successfully!');
    console.log('📊 Response:', {
      status: response.status,
      meetingId: response.data.meeting?.meeting_id,
      title: response.data.meeting?.title
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Validation Error:', {
        status: error.response.status,
        message: error.response.data.message,
        details: error.response.data.details
      });
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

// Run the test
testMeetingCreationWithEmptyFields().catch(console.error);
