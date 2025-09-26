const axios = require('axios');

async function verifyMeetingInvitees() {
  try {
    console.log('🔍 Verifying Meeting Invitees Display...');
    console.log('============================================================');
    
    // Test the API endpoint directly
    console.log('📡 Testing API endpoint: /meetings/33/attendance');
    const response = await axios.get('http://localhost:5000/api/v1/meetings/33/attendance');
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data Structure:');
    console.log('  - success:', response.data.success);
    console.log('  - data.attendance length:', response.data.data?.attendance?.length || 0);
    console.log('  - data.summary.total_attendees:', response.data.data?.summary?.total_attendees || 0);
    
    if (response.data.data?.attendance?.length > 0) {
      console.log('\n👥 Invitees Found:');
      response.data.data.attendance.forEach((attendee, index) => {
        console.log(`  ${index + 1}. ${attendee.member_name} (${attendee.member_number})`);
        console.log(`     Status: ${attendee.attendance_status}`);
        console.log(`     Notes: ${attendee.attendance_notes || 'N/A'}`);
        console.log(`     Email: ${attendee.email || 'N/A'}`);
        console.log(`     Phone: ${attendee.phone || 'N/A'}`);
      });
      
      console.log('\n🎉 SUCCESS: Meeting has invitees - frontend should display them!');
      console.log('📝 Frontend should now show:');
      console.log('  - Attendance summary cards with counts');
      console.log('  - Invitees table with member details');
      console.log('  - No more "No Invitees Yet" message');
      
    } else {
      console.log('\n❌ No invitees found in API response');
    }
    
    console.log('\n🌐 Frontend URL: http://localhost:3000/admin/meetings/33');
    console.log('============================================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyMeetingInvitees();
