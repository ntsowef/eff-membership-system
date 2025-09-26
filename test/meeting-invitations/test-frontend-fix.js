const mysql = require('mysql2/promise');

async function testFrontendFix() {
  console.log('🧪 Testing Frontend Fix...\n');
  
  try {
    // Simulate the frontend API call
    const testMeeting = {
      meeting_type_id: 4, // CCT Meeting
      hierarchy_level: 'National',
      meeting_date: '2025-09-30',
      meeting_time: '09:00',
      end_time: '13:00',
      duration_minutes: 240,
      location: 'Frontend Fix Test Location',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Testing frontend fix for meeting creation',
      objectives: 'Verify frontend can handle API response correctly',
      agenda_summary: 'Frontend testing agenda',
      quorum_required: 5,
      auto_send_invitations: true,
      title: 'Frontend Fix Test Meeting'
    };
    
    console.log('📤 Making API call (simulating frontend)...');
    
    const response = await fetch('http://localhost:5000/api/v1/hierarchical-meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMeeting)
    });
    
    if (response.ok) {
      const fullResponse = await response.json();
      console.log('✅ API Response received successfully!');
      
      // Simulate what the apiPost function does
      let processedResponse;
      if (fullResponse && typeof fullResponse === 'object' && 'data' in fullResponse && 'success' in fullResponse) {
        // apiPost unwraps the response.data.data
        processedResponse = fullResponse.data;
        console.log('🔄 Response processed by apiPost function (unwrapped)');
      } else {
        processedResponse = fullResponse;
      }
      
      console.log('\n📋 Frontend receives this structure:');
      console.log('   - meeting exists:', !!processedResponse.meeting);
      console.log('   - meeting.id:', processedResponse.meeting?.id);
      console.log('   - invitation_results exists:', !!processedResponse.invitation_results);
      console.log('   - total_invitations_sent:', processedResponse.invitation_results?.total_invitations_sent);
      
      console.log('\n🎯 Frontend Access Test:');
      const meetingId = processedResponse.meeting?.id;
      if (meetingId) {
        console.log(`   ✅ SUCCESS: Meeting ID found = ${meetingId}`);
        console.log(`   ✅ Navigation would work: /admin/meetings/${meetingId}`);
      } else {
        console.log('   ❌ FAILED: Meeting ID not found');
        console.log('   ❌ Would navigate to fallback: /admin/meetings/hierarchical');
      }
      
      console.log('\n📊 Meeting Creation Summary:');
      if (processedResponse.meeting) {
        const meeting = processedResponse.meeting;
        console.log(`   - Meeting ID: ${meeting.id}`);
        console.log(`   - Title: "${meeting.title}"`);
        console.log(`   - Status: ${meeting.meeting_status}`);
        console.log(`   - Hierarchy: ${meeting.hierarchy_level}`);
      }
      
      if (processedResponse.invitation_results) {
        const invitations = processedResponse.invitation_results;
        console.log(`   - Invitations Sent: ${invitations.total_invitations_sent}`);
        console.log(`   - Required: ${invitations.invitation_breakdown?.required || 0}`);
        console.log(`   - Optional: ${invitations.invitation_breakdown?.optional || 0}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendFix().catch(console.error);
