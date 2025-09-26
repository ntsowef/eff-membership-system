const mysql = require('mysql2/promise');

async function testInvitationSystem() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });
  
  try {
    console.log('🧪 Testing Meeting Invitation System...\n');
    
    // Test 1: Create a simple National meeting
    console.log('📅 Test 1: Creating National CCT Meeting...');
    
    const testMeeting = {
      meeting_type_id: 4, // CCT Meeting
      hierarchy_level: 'National',
      meeting_date: '2025-09-28',
      meeting_time: '10:00',
      end_time: '14:00',
      duration_minutes: 240,
      location: 'Luthuli House',
      virtual_meeting_link: '',
      meeting_platform: 'In-Person',
      description: 'Test CCT Meeting',
      objectives: 'Test meeting creation with invitations',
      agenda_summary: 'Testing agenda',
      quorum_required: 5,
      auto_send_invitations: true,
      title: 'Test CCT Meeting'
    };
    
    // Make API call to create meeting
    const response = await fetch('http://localhost:5000/api/v1/hierarchical-meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMeeting)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Meeting created successfully!');
      console.log('📋 Full API Response:', JSON.stringify(result, null, 2));

      // Extract meeting ID from the nested response structure
      const meetingId = result.data?.meeting?.id;
      console.log(`   Meeting ID: ${meetingId}`);
      console.log(`   Total Invitations Sent: ${result.data?.invitation_results?.total_invitations_sent || 0}`);

      if (meetingId) {
        // Check if invitations were created
        const [invitations] = await connection.execute(
          'SELECT COUNT(*) as invitation_count FROM meeting_invitations WHERE meeting_id = ?',
          [meetingId]
        );
      
        console.log(`   Invitations created: ${invitations[0].invitation_count}`);

        if (invitations[0].invitation_count > 0) {
          // Show invitation details
          const [invitationDetails] = await connection.execute(`
            SELECT
              mi.id,
              mi.member_id,
              TRIM(CONCAT(COALESCE(m.firstname,''),' ',COALESCE(m.surname,''))) AS member_name,
              mi.attendance_type,
              mi.role_in_meeting,
              mi.voting_rights,
              mi.invitation_status,
              mi.invitation_priority
            FROM meeting_invitations mi
            JOIN members m ON mi.member_id = m.member_id
            WHERE mi.meeting_id = ?
            ORDER BY mi.invitation_priority DESC, member_name
          `, [meetingId]);

          console.log('\n📧 Invitation Details:');
          console.table(invitationDetails);
        }
      } else {
        console.log('❌ No meeting ID found in response');
      }
      
    } else {
      const error = await response.text();
      console.log('❌ Meeting creation failed:');
      console.log(error);
    }
    
    // Test 2: Check meeting_invitations table structure
    console.log('\n📋 Meeting Invitations Table Structure:');
    const [columns] = await connection.execute('DESCRIBE meeting_invitations');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await connection.end();
  }
}

testInvitationSystem().catch(console.error);
