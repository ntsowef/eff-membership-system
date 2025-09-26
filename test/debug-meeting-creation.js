const axios = require('axios');

async function debugMeetingCreation() {
  console.log('🔍 Debugging Meeting Creation Issue...\n');

  try {
    // First, let's check what meeting types are available
    console.log('📋 Getting available meeting types...');
    const meetingTypesResponse = await axios.get('http://localhost:3000/api/v1/hierarchical-meetings/meeting-types');
    
    if (meetingTypesResponse.data.success) {
      const meetingTypes = meetingTypesResponse.data.data;
      console.log(`✅ Found ${meetingTypes.length} meeting types:`);
      meetingTypes.forEach(type => {
        console.log(`   ${type.type_id}. ${type.type_name} (${type.hierarchy_level}) - ${type.is_active ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.error('❌ Failed to get meeting types');
      return;
    }

    // Test the validation schema with a sample request
    console.log('\n🧪 Testing meeting creation with sample data...');
    
    const testMeetingData = {
      title: 'Test CCT/NEC Quarterly Meeting', // Fixed: using 'title' instead of 'meeting_title'
      meeting_type_id: 4, // CCT/NEC Quarterly Meeting
      hierarchy_level: 'National',
      entity_id: 1,
      entity_type: 'National',
      meeting_date: '2025-09-25', // Future date
      meeting_time: '10:00',
      end_time: '12:00',
      duration_minutes: 120,
      location: 'EFF Headquarters',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Quarterly meeting of the Central Command Team and National Executive Committee',
      objectives: 'Review quarterly progress and plan upcoming activities',
      agenda_summary: '1. Opening and welcome\n2. Previous meeting minutes\n3. Quarterly reports\n4. Strategic planning\n5. Closing',
      quorum_required: 4,
      meeting_chair_id: null,
      meeting_secretary_id: null,
      auto_send_invitations: false
    };

    console.log('📤 Sending test meeting creation request...');
    console.log('Request data:', JSON.stringify(testMeetingData, null, 2));

    const createResponse = await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', testMeetingData);
    
    if (createResponse.data.success) {
      console.log('✅ Meeting creation successful!');
      console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    } else {
      console.error('❌ Meeting creation failed:', createResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      
      if (error.response.data) {
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        
        // Check for validation errors
        if (error.response.status === 400) {
          console.log('\n🔍 Validation Error Analysis:');
          if (error.response.data.message) {
            console.log('   Error Message:', error.response.data.message);
            
            // Common validation issues
            if (error.response.data.message.includes('title')) {
              console.log('   💡 Issue: Frontend might be sending "meeting_title" instead of "title"');
            }
            if (error.response.data.message.includes('meeting_type_id')) {
              console.log('   💡 Issue: meeting_type_id might be invalid or not a number');
            }
            if (error.response.data.message.includes('hierarchy_level')) {
              console.log('   💡 Issue: hierarchy_level might not match meeting type');
            }
            if (error.response.data.message.includes('date')) {
              console.log('   💡 Issue: meeting_date format might be incorrect (should be ISO date)');
            }
            if (error.response.data.message.includes('time')) {
              console.log('   💡 Issue: meeting_time format might be incorrect (should be HH:MM)');
            }
          }
        }
      }
    }
  }
}

// Test validation schema compliance
async function testValidationSchema() {
  console.log('\n🧪 Testing Validation Schema Compliance...\n');

  const testCases = [
    {
      name: 'Missing title',
      data: {
        meeting_type_id: 4,
        hierarchy_level: 'National',
        meeting_date: '2025-09-25',
        meeting_time: '10:00'
      },
      expectedError: 'title is required'
    },
    {
      name: 'Invalid meeting_type_id',
      data: {
        title: 'Test Meeting',
        meeting_type_id: 'invalid',
        hierarchy_level: 'National',
        meeting_date: '2025-09-25',
        meeting_time: '10:00'
      },
      expectedError: 'meeting_type_id must be a number'
    },
    {
      name: 'Invalid hierarchy_level',
      data: {
        title: 'Test Meeting',
        meeting_type_id: 4,
        hierarchy_level: 'Invalid',
        meeting_date: '2025-09-25',
        meeting_time: '10:00'
      },
      expectedError: 'hierarchy_level must be one of'
    },
    {
      name: 'Invalid date format',
      data: {
        title: 'Test Meeting',
        meeting_type_id: 4,
        hierarchy_level: 'National',
        meeting_date: '25/09/2025', // Wrong format
        meeting_time: '10:00'
      },
      expectedError: 'meeting_date must be a valid ISO 8601 date'
    },
    {
      name: 'Invalid time format',
      data: {
        title: 'Test Meeting',
        meeting_type_id: 4,
        hierarchy_level: 'National',
        meeting_date: '2025-09-25',
        meeting_time: '25:00' // Invalid time
      },
      expectedError: 'meeting_time with value'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🔍 Testing: ${testCase.name}`);
      const response = await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', testCase.data);
      console.log(`❌ Unexpected success for "${testCase.name}"`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ Correct validation error for "${testCase.name}"`);
        console.log(`   Message: ${error.response.data.message}`);
      } else if (error.response && error.response.status === 401) {
        console.log(`⚠️  Authentication required for "${testCase.name}" (expected in development)`);
      } else {
        console.log(`❓ Unexpected error for "${testCase.name}": ${error.message}`);
      }
    }
    console.log('');
  }
}

// Run all tests
async function runAllTests() {
  await debugMeetingCreation();
  await testValidationSchema();
  
  console.log('\n🏁 Debugging Complete!');
  console.log('\n📋 Summary of Fixes Applied:');
  console.log('   ✅ Fixed field name mismatch: "meeting_title" → "title"');
  console.log('   ✅ Added proper data transformation in handleSubmit');
  console.log('   ✅ Ensured meeting_type_id is converted to number');
  console.log('\n💡 Common Issues to Check:');
  console.log('   • Ensure meeting_date is in YYYY-MM-DD format');
  console.log('   • Ensure meeting_time is in HH:MM format');
  console.log('   • Ensure hierarchy_level matches the meeting type');
  console.log('   • Ensure meeting_type_id exists and is active');
  console.log('   • Check that all required fields are provided');
}

runAllTests().catch(console.error);
