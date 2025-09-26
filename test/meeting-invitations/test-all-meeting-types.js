const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test data for different meeting types
const testMeetings = [
  {
    name: 'Provincial PCT Meeting',
    data: {
      title: 'Test Provincial PCT Meeting',
      description: 'Testing Provincial Command Team meeting',
      hierarchy_level: 'Provincial',
      meeting_type_id: 14, // pct_ordinary
      meeting_date: '2025-01-20',
      meeting_time: '09:00',
      end_time: '11:00',
      location: 'Provincial Office KZN',
      province_code: 'KZN',
      municipality_code: '',
      ward_code: '',
      entity_id: 5,
      entity_type: 'Province'
    }
  },
  {
    name: 'Municipal SRCT Meeting',
    data: {
      title: 'Test Municipal SRCT Meeting',
      description: 'Testing Sub-Regional Command Team meeting',
      hierarchy_level: 'Municipal',
      meeting_type_id: 15, // srct_ordinary
      meeting_date: '2025-01-21',
      meeting_time: '10:00',
      end_time: '12:00',
      location: 'Municipal Office Buffalo City',
      province_code: 'EC',
      municipality_code: 'BUF',
      ward_code: '',
      entity_id: 1, // Assuming Buffalo City municipality ID
      entity_type: 'Municipality'
    }
  },
  {
    name: 'Ward BCT Meeting',
    data: {
      title: 'Test Ward BCT Meeting',
      description: 'Testing Branch Command Team meeting',
      hierarchy_level: 'Ward',
      meeting_type_id: 16, // bct_ordinary
      meeting_date: '2025-01-22',
      meeting_time: '14:00',
      end_time: '16:00',
      location: 'Ward Community Hall',
      province_code: 'GP',
      municipality_code: 'JHB',
      ward_code: '10503001',
      entity_id: 1, // Assuming ward ID
      entity_type: 'Ward'
    }
  },
  {
    name: 'Branch General Meeting',
    data: {
      title: 'Test Branch General Meeting',
      description: 'Testing Branch General Meeting for all members',
      hierarchy_level: 'Ward',
      meeting_type_id: 17, // branch_general_meeting
      meeting_date: '2025-01-23',
      meeting_time: '18:00',
      end_time: '20:00',
      location: 'Community Center',
      province_code: 'GP',
      municipality_code: 'JHB',
      ward_code: '10503001',
      entity_id: 1,
      entity_type: 'Ward'
    }
  },
  {
    name: 'BGA Meeting',
    data: {
      title: 'Test BGA Meeting',
      description: 'Testing Branch General Assembly meeting',
      hierarchy_level: 'Ward',
      meeting_type_id: 18, // bga
      meeting_date: '2025-01-24',
      meeting_time: '15:00',
      end_time: '17:00',
      location: 'Assembly Hall',
      province_code: 'GP',
      municipality_code: 'JHB',
      ward_code: '10503001',
      entity_id: 1,
      entity_type: 'Ward'
    }
  },
  {
    name: 'BPA Meeting',
    data: {
      title: 'Test BPA Meeting',
      description: 'Testing Branch Political Assembly meeting',
      hierarchy_level: 'Ward',
      meeting_type_id: 19, // bpa
      meeting_date: '2025-01-25',
      meeting_time: '16:00',
      end_time: '18:00',
      location: 'Political Assembly Hall',
      province_code: 'GP',
      municipality_code: 'JHB',
      ward_code: '10503001',
      entity_id: 1,
      entity_type: 'Ward'
    }
  }
];

async function testMeetingCreation(meeting) {
  try {
    console.log(`\n🧪 Testing ${meeting.name}...`);
    console.log(`📤 Creating meeting: ${meeting.data.title}`);
    
    const response = await axios.post(`${BASE_URL}/hierarchical-meetings`, meeting.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 201) {
      console.log(`✅ ${meeting.name} created successfully!`);
      console.log(`   Meeting ID: ${response.data.data.meeting.id}`);
      console.log(`   Start Time: ${response.data.data.meeting.start_datetime}`);
      console.log(`   End Time: ${response.data.data.meeting.end_datetime}`);
      console.log(`   Location: ${response.data.data.meeting.location}`);
      
      // Check if invitations were generated
      if (response.data.data.invitation_results) {
        console.log(`   Invitations: ${response.data.data.invitation_results.length} sent`);
      } else {
        console.log(`   Invitations: None (no leadership data available)`);
      }
      
      return { success: true, meetingId: response.data.data.meeting.id };
    } else {
      console.log(`❌ ${meeting.name} failed with status: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ ${meeting.name} failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error?.message || 'Unknown error'}`);
      return { success: false, error: error.response.data?.error?.message || 'HTTP Error' };
    } else if (error.request) {
      console.log(`   Error: No response from server`);
      return { success: false, error: 'No response from server' };
    } else {
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive meeting type tests...\n');
  console.log('📋 Testing all hierarchical meeting types:');
  console.log('   - Provincial PCT Meeting');
  console.log('   - Municipal SRCT Meeting');
  console.log('   - Ward BCT Meeting');
  console.log('   - Branch General Meeting');
  console.log('   - BGA Meeting');
  console.log('   - BPA Meeting');
  
  const results = [];
  
  for (const meeting of testMeetings) {
    const result = await testMeetingCreation(meeting);
    results.push({ name: meeting.name, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   ✓ ${r.name}`));
  }
  
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => console.log(`   ✗ ${r.name}: ${r.error}`));
  }
  
  if (successful.length === results.length) {
    console.log('\n🎉 All meeting types are working correctly!');
    console.log('✅ PCT, SRCT, and BCT meetings are now properly configured.');
  } else {
    console.log('\n⚠️  Some meeting types need attention.');
    console.log('💡 Check server logs for detailed error information.');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});
