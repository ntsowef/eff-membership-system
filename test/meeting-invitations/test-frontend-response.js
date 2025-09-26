const mysql = require('mysql2/promise');

async function testFrontendResponse() {
  console.log('🧪 Testing Frontend Response Structure...\n');
  
  try {
    // Test the API endpoint that the frontend calls
    const testMeeting = {
      meeting_type_id: 4, // CCT Meeting
      hierarchy_level: 'National',
      meeting_date: '2025-09-29',
      meeting_time: '10:00',
      end_time: '14:00',
      duration_minutes: 240,
      location: 'Test Location',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Frontend Response Test Meeting',
      objectives: 'Test frontend response structure',
      agenda_summary: 'Testing agenda',
      quorum_required: 5,
      auto_send_invitations: true,
      title: 'Frontend Response Test'
    };
    
    console.log('📤 Making API call to /api/v1/hierarchical-meetings...');
    
    const response = await fetch('http://localhost:5000/api/v1/hierarchical-meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMeeting)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response received successfully!');
      console.log('📋 Response Structure Analysis:');
      console.log(`   - success: ${result.success}`);
      console.log(`   - message: "${result.message}"`);
      console.log(`   - data exists: ${!!result.data}`);
      console.log(`   - data.meeting exists: ${!!result.data?.meeting}`);
      console.log(`   - data.meeting.id: ${result.data?.meeting?.id}`);
      console.log(`   - data.meeting.meeting_id: ${result.data?.meeting?.meeting_id}`);
      console.log(`   - data.invitation_results exists: ${!!result.data?.invitation_results}`);
      console.log(`   - total_invitations_sent: ${result.data?.invitation_results?.total_invitations_sent}`);
      
      console.log('\n🔍 Frontend Access Patterns:');
      console.log('   ✅ Correct: response.data.meeting.id =', result.data?.meeting?.id);
      console.log('   ❌ Incorrect: response.data.meeting.meeting_id =', result.data?.meeting?.meeting_id);
      
      console.log('\n📊 Meeting Details:');
      if (result.data?.meeting) {
        const meeting = result.data.meeting;
        console.log(`   - ID: ${meeting.id}`);
        console.log(`   - Title: "${meeting.title}"`);
        console.log(`   - Hierarchy Level: ${meeting.hierarchy_level}`);
        console.log(`   - Status: ${meeting.meeting_status}`);
        console.log(`   - Created At: ${meeting.created_at}`);
      }
      
      console.log('\n📧 Invitation Summary:');
      if (result.data?.invitation_results) {
        const invitations = result.data.invitation_results;
        console.log(`   - Total Sent: ${invitations.total_invitations_sent}`);
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

testFrontendResponse().catch(console.error);
