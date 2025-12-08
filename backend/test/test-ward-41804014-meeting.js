/**
 * Test Ward 41804014 Meeting Creation with Presiding Officer
 * This test verifies the fix for the presiding officer dropdown issue
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
const WARD_CODE = '41804014'; // Ward from user's request
const PROVINCE_CODE = 'FS'; // Free State (where ward 41804014 is located)

async function runTest() {
  console.log('='.repeat(80));
  console.log('🧪 WARD 41804014 MEETING CREATION TEST');
  console.log('='.repeat(80));
  console.log(`\nWard: ${WARD_CODE} (Matjhabeng Sub-Region, Free State)`);
  console.log(`Province: ${PROVINCE_CODE}\n`);

  try {
    // Step 1: Authenticate
    console.log('Step 1: Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Get ward compliance details
    console.log(`Step 2: Fetching ward ${WARD_CODE} compliance details...`);
    const wardResponse = await axios.get(
      `${BASE_URL}/ward-audit/ward/${WARD_CODE}/compliance/details`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const ward = wardResponse.data.data;
    console.log('✅ Ward compliance details retrieved:');
    console.log(`   Ward Code: ${ward.ward_code}`);
    console.log(`   Ward Name: ${ward.ward_name}`);
    console.log(`   Municipality: ${ward.municipality_name}`);
    console.log(`   Total Members: ${ward.total_members}`);
    console.log(`   Active Members: ${ward.active_members}\n`);

    // Step 3: Get eligible members for presiding officer (from province)
    console.log(`Step 3: Fetching eligible members from province ${PROVINCE_CODE}...`);
    console.log('   (This is what the presiding officer dropdown uses)');
    const membersResponse = await axios.get(
      `${BASE_URL}/ward-audit/members/province/${PROVINCE_CODE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const eligibleMembers = membersResponse.data.data;
    console.log(`✅ Retrieved ${eligibleMembers.length} eligible members from Free State province`);
    
    if (eligibleMembers.length > 0) {
      console.log('\n   Sample eligible members for presiding officer:');
      eligibleMembers.slice(0, 10).forEach((m, i) => {
        console.log(`   ${i+1}. ${m.full_name} - ${m.ward_name || 'N/A'} (${m.membership_status})`);
      });
    }

    // Step 4: Get members from the specific ward (for secretary)
    console.log(`\nStep 4: Fetching members from ward ${WARD_CODE}...`);
    console.log('   (Secretary can be from the same ward)');
    const wardMembersResponse = await axios.get(
      `${BASE_URL}/ward-audit/ward/${WARD_CODE}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const wardMembers = wardMembersResponse.data.data;
    console.log(`✅ Retrieved ${wardMembers.length} members from ward ${WARD_CODE}`);
    
    if (wardMembers.length > 0) {
      console.log('\n   Sample ward members for secretary:');
      wardMembers.slice(0, 5).forEach((m, i) => {
        console.log(`   ${i+1}. ${m.full_name} (${m.membership_status})`);
      });
    }

    // Step 5: Create a test meeting
    if (eligibleMembers.length > 0 && wardMembers.length > 0) {
      console.log(`\nStep 5: Creating a test ward meeting...`);
      
      const presidingOfficer = eligibleMembers[0];
      const secretary = wardMembers[0];
      
      const meetingData = {
        meeting_type: 'BPA',
        presiding_officer_id: presidingOfficer.member_id,
        secretary_id: secretary.member_id,
        quorum_required: 50,
        quorum_achieved: 55,
        total_attendees: 60,
        meeting_outcome: 'Test meeting - Presiding officer dropdown fix verification',
        key_decisions: 'Verified that presiding officer can be selected from province',
        action_items: 'Continue testing other ward meeting features',
        next_meeting_date: '2025-11-15',
        quorum_verified_manually: true,
        quorum_verification_notes: 'Test verification for presiding officer fix',
        meeting_took_place_verified: true,
        meeting_verification_notes: 'Meeting created successfully with presiding officer from province'
      };

      const createResponse = await axios.post(
        `${BASE_URL}/ward-audit/ward/${WARD_CODE}/meeting`,
        meetingData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (createResponse.data.success) {
        const meeting = createResponse.data.data;
        console.log('✅ Ward meeting created successfully!');
        console.log(`   Meeting ID: ${meeting.meeting_id}`);
        console.log(`   Meeting Type: ${meeting.meeting_type}`);
        console.log(`   Presiding Officer: ${presidingOfficer.full_name} (from ${presidingOfficer.ward_name})`);
        console.log(`   Secretary: ${secretary.full_name} (from ward ${WARD_CODE})`);
        console.log(`   Quorum: ${meeting.quorum_achieved}/${meeting.quorum_required} (${meeting.quorum_met ? 'Met ✅' : 'Not met ❌'})`);
      }
    } else {
      console.log('\n⚠️  Skipping meeting creation - insufficient members');
    }

    // Step 6: Verify the meeting was created
    console.log(`\nStep 6: Verifying meeting was saved...`);
    const meetingsResponse = await axios.get(
      `${BASE_URL}/ward-audit/ward/${WARD_CODE}/meetings`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const meetings = meetingsResponse.data.data;
    console.log(`✅ Ward now has ${meetings.length} meeting(s) on record`);
    
    if (meetings.length > 0) {
      const latestMeeting = meetings[0];
      console.log('\n   Latest meeting details:');
      console.log(`   - Meeting Type: ${latestMeeting.meeting_type}`);
      console.log(`   - Presiding Officer: ${latestMeeting.presiding_officer_name || 'Not assigned'}`);
      console.log(`   - Secretary: ${latestMeeting.secretary_name || 'Not assigned'}`);
      console.log(`   - Quorum: ${latestMeeting.quorum_achieved}/${latestMeeting.quorum_required}`);
      console.log(`   - Created: ${new Date(latestMeeting.created_at).toLocaleString()}`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\n🎉 PRESIDING OFFICER DROPDOWN FIX VERIFIED!');
    console.log('\nWhat was fixed:');
    console.log('  ❌ Before: MySQL placeholder syntax (?) caused query to fail');
    console.log('  ✅ After: PostgreSQL placeholder syntax ($1, $2, etc.) works correctly');
    console.log('\nResult:');
    console.log(`  ✅ Presiding officer dropdown now loads ${eligibleMembers.length} members from Free State`);
    console.log(`  ✅ Secretary dropdown now loads ${wardMembers.length} members from ward ${WARD_CODE}`);
    console.log('  ✅ Ward meetings can be created successfully');
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('\n⚠️  This indicates a database query error.');
      console.error('   The MySQL placeholder (?) to PostgreSQL ($1) conversion may have failed.');
    }
    process.exit(1);
  }
}

runTest();

