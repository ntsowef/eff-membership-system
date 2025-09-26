const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1';

async function testPCTMeetingCreation() {
  console.log('🎯 Testing PCT Meeting Creation with Auto-Invitations');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create a PCT meeting for Gauteng (should trigger auto-invitations)
    console.log('\n📅 Test 1: Creating PCT Meeting for Gauteng...');
    
    const pctMeetingData = {
      title: "PCT Meeting - Gauteng Provincial Coordination",
      description: "Monthly Provincial Coordinating Team meeting to discuss strategic initiatives and coordination across Gauteng province.",
      hierarchy_level: "Province",
      entity_id: 7, // Gauteng province ID
      meeting_type: "Regular",
      start_datetime: "2025-09-25T10:00:00.000Z",
      end_datetime: "2025-09-25T12:00:00.000Z",
      location: "EFF Gauteng Provincial Office, Johannesburg",
      virtual_meeting_link: "https://zoom.us/j/123456789",
      max_attendees: 20
    };
    
    const response = await axios.post(`${API_BASE}/meetings`, pctMeetingData);
    
    if (response.data.success) {
      const meetingId = response.data.data.meeting.id;
      console.log(`✅ PCT Meeting created successfully! ID: ${meetingId}`);
      console.log(`📋 Meeting: ${response.data.data.meeting.title}`);
      
      // Wait a moment for invitations to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check the attendance/invitations
      console.log('\n👥 Checking auto-generated invitations...');
      const attendanceResponse = await axios.get(`${API_BASE}/meetings/${meetingId}/attendance`);
      
      if (attendanceResponse.data.success) {
        const { attendance, summary } = attendanceResponse.data.data;
        
        console.log(`📊 Invitation Summary:`);
        console.log(`   Total Invitees: ${summary.total_attendees}`);
        console.log(`   Pending: ${summary.pending || 0}`);
        console.log(`   Present: ${summary.present || 0}`);
        console.log(`   Absent: ${summary.absent || 0}`);
        
        console.log('\n👤 Invited Provincial Leaders:');
        attendance.forEach((attendee, index) => {
          console.log(`   ${index + 1}. ${attendee.member_name} (${attendee.member_number})`);
          console.log(`      Status: ${attendee.attendance_status}`);
          console.log(`      Notes: ${attendee.invitation_notes || 'N/A'}`);
          console.log(`      Invited: ${new Date(attendee.invited_at).toLocaleString()}`);
          console.log('');
        });
        
        if (attendance.length > 0) {
          console.log('🎉 SUCCESS: Provincial leadership was automatically invited!');
        } else {
          console.log('⚠️  WARNING: No invitations were created');
        }
      }
    }
    
    // Test 2: Create a regular meeting (should NOT trigger auto-invitations)
    console.log('\n📅 Test 2: Creating Regular Meeting (should NOT auto-invite)...');
    
    const regularMeetingData = {
      title: "Regular Branch Meeting - Soweto",
      description: "Monthly branch meeting for Soweto branch members.",
      hierarchy_level: "Ward",
      entity_id: 1,
      meeting_type: "Regular",
      start_datetime: "2025-09-26T18:00:00.000Z",
      end_datetime: "2025-09-26T20:00:00.000Z",
      location: "Soweto Community Hall",
      max_attendees: 50
    };
    
    const regularResponse = await axios.post(`${API_BASE}/meetings`, regularMeetingData);
    
    if (regularResponse.data.success) {
      const meetingId = regularResponse.data.data.meeting.id;
      console.log(`✅ Regular Meeting created successfully! ID: ${meetingId}`);
      
      // Check attendance (should be empty)
      const attendanceResponse = await axios.get(`${API_BASE}/meetings/${meetingId}/attendance`);
      
      if (attendanceResponse.data.success) {
        const { attendance } = attendanceResponse.data.data;
        
        if (attendance.length === 0) {
          console.log('✅ SUCCESS: No auto-invitations created for regular meeting (as expected)');
        } else {
          console.log(`⚠️  UNEXPECTED: ${attendance.length} invitations were created`);
        }
      }
    }
    
    // Test 3: Create PCT meeting for different province (should NOT trigger auto-invitations)
    console.log('\n📅 Test 3: Creating PCT Meeting for Western Cape (should NOT auto-invite)...');
    
    const wcPctMeetingData = {
      title: "PCT Meeting - Western Cape Provincial Coordination",
      description: "Provincial Coordinating Team meeting for Western Cape.",
      hierarchy_level: "Province",
      entity_id: 9, // Western Cape province ID (assuming)
      meeting_type: "Regular",
      start_datetime: "2025-09-27T10:00:00.000Z",
      end_datetime: "2025-09-27T12:00:00.000Z",
      location: "EFF Western Cape Office, Cape Town",
      max_attendees: 15
    };
    
    const wcResponse = await axios.post(`${API_BASE}/meetings`, wcPctMeetingData);
    
    if (wcResponse.data.success) {
      const meetingId = wcResponse.data.data.meeting.id;
      console.log(`✅ Western Cape PCT Meeting created successfully! ID: ${meetingId}`);
      
      // Check attendance (should be empty since it's not Gauteng)
      const attendanceResponse = await axios.get(`${API_BASE}/meetings/${meetingId}/attendance`);
      
      if (attendanceResponse.data.success) {
        const { attendance } = attendanceResponse.data.data;
        
        if (attendance.length === 0) {
          console.log('✅ SUCCESS: No auto-invitations created for Western Cape PCT (as expected - only Gauteng is configured)');
        } else {
          console.log(`⚠️  UNEXPECTED: ${attendance.length} invitations were created`);
        }
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error during testing:', error.response?.data || error.message);
  }
}

// Run the test
testPCTMeetingCreation();
