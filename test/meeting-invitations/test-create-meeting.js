const axios = require('axios');

async function testCreateMeeting() {
  try {
    console.log('🧪 Testing hierarchical meeting creation...');
    
    const meetingData = {
      title: "Test PCT Meeting",
      description: "Test meeting for debugging",
      hierarchy_level: "Provincial",
      meeting_type_id: 14, // pct_ordinary
      meeting_date: "2025-01-15",
      meeting_time: "09:00",
      end_time: "11:00",
      location: "Provincial Office",
      province_code: "KZN",
      municipality_code: "",
      ward_code: "",
      entity_id: 5, // KZN province ID
      entity_type: "Province"
    };

    console.log('📤 Sending request to create meeting...');
    console.log('Data:', JSON.stringify(meetingData, null, 2));

    const response = await axios.post('http://localhost:5000/api/v1/hierarchical-meetings', meetingData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Meeting created successfully!');
    console.log('Response:', response.data);

  } catch (error) {
    console.error('❌ Error creating meeting:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCreateMeeting();
