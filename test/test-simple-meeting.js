const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testSimpleMeeting() {
  console.log('🧪 Testing Simple Meeting Creation\n');

  try {
    // Test Provincial Meeting Creation
    console.log('Testing Provincial Meeting Creation...');
    const provincialMeetingData = {
      title: 'Test Provincial Meeting',
      meeting_type_id: 7, // Provincial People's Assembly
      hierarchy_level: 'Provincial',
      meeting_date: '2025-10-01',
      meeting_time: '14:00',
      location: 'Provincial Office',
      description: 'Testing provincial meeting creation'
    };
    
    console.log('Sending data:', JSON.stringify(provincialMeetingData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, provincialMeetingData);
    console.log('✅ Success:', response.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
    console.log('Headers:', error.response?.headers);
  }
}

testSimpleMeeting().catch(console.error);
