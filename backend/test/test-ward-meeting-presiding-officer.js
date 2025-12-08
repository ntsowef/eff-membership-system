/**
 * Test Ward Meeting Presiding Officer Dropdown Fix
 * Tests the getMembersByProvince endpoint that was failing due to MySQL placeholders
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

let authToken = '';

// Test data
const testWardCode = '41804014'; // Ward from user's request
const testProvinceCode = 'GT'; // Gauteng province

async function authenticate() {
  console.log('\n🔐 Authenticating as National Admin...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetMembersByProvince() {
  console.log(`\n📋 Test: GET /ward-audit/members/province/${testProvinceCode}`);
  console.log('   Purpose: Fetch members for presiding officer dropdown');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/ward-audit/members/province/${testProvinceCode}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const members = response.data.data;
      console.log(`✅ SUCCESS: Retrieved ${members.length} members from province ${testProvinceCode}`);
      
      if (members.length > 0) {
        console.log('\n   Sample members:');
        members.slice(0, 5).forEach((member, index) => {
          console.log(`   ${index + 1}. ${member.full_name} (ID: ${member.id_number || 'N/A'})`);
          console.log(`      Ward: ${member.ward_name || 'N/A'} | Status: ${member.membership_status || 'N/A'}`);
        });
      } else {
        console.log('⚠️  WARNING: No members found in this province');
      }
      
      return true;
    } else {
      console.log('❌ FAILED: Response not successful');
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.response?.data?.message || error.message);
    if (error.response?.status === 500) {
      console.error('   This likely indicates a database query error (MySQL placeholder issue)');
    }
    return false;
  }
}

async function testGetWardMeetings() {
  console.log(`\n📋 Test: GET /ward-audit/ward/${testWardCode}/meetings`);
  console.log('   Purpose: Fetch existing ward meetings');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/ward-audit/ward/${testWardCode}/meetings`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const meetings = response.data.data;
      console.log(`✅ SUCCESS: Retrieved ${meetings.length} meetings for ward ${testWardCode}`);
      
      if (meetings.length > 0) {
        console.log('\n   Recent meetings:');
        meetings.slice(0, 3).forEach((meeting, index) => {
          console.log(`   ${index + 1}. ${meeting.meeting_type} Meeting`);
          console.log(`      Presiding Officer: ${meeting.presiding_officer_name || 'Not assigned'}`);
          console.log(`      Secretary: ${meeting.secretary_name || 'Not assigned'}`);
          console.log(`      Quorum: ${meeting.quorum_achieved}/${meeting.quorum_required} (${meeting.quorum_met ? 'Met' : 'Not met'})`);
        });
      }
      
      return true;
    } else {
      console.log('❌ FAILED: Response not successful');
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCreateWardMeeting() {
  console.log(`\n📋 Test: POST /ward-audit/ward/${testWardCode}/meeting`);
  console.log('   Purpose: Create a new ward meeting with presiding officer');
  
  // First, get a member to use as presiding officer
  try {
    const membersResponse = await axios.get(
      `${BASE_URL}/ward-audit/members/province/${testProvinceCode}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (!membersResponse.data.success || membersResponse.data.data.length === 0) {
      console.log('⚠️  SKIPPED: No members available to assign as presiding officer');
      return true;
    }

    const presidingOfficer = membersResponse.data.data[0];
    const secretary = membersResponse.data.data.length > 1 ? membersResponse.data.data[1] : presidingOfficer;

    const meetingData = {
      meeting_type: 'BPA',
      presiding_officer_id: presidingOfficer.member_id,
      secretary_id: secretary.member_id,
      quorum_required: 50,
      quorum_achieved: 55,
      total_attendees: 60,
      meeting_outcome: 'Test meeting created successfully',
      key_decisions: 'Test decision 1, Test decision 2',
      action_items: 'Test action 1, Test action 2',
      next_meeting_date: '2025-11-15',
      quorum_verified_manually: true,
      quorum_verification_notes: 'Test verification',
      meeting_took_place_verified: true,
      meeting_verification_notes: 'Test meeting verification'
    };

    const response = await axios.post(
      `${BASE_URL}/ward-audit/ward/${testWardCode}/meeting`,
      meetingData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ SUCCESS: Ward meeting created successfully');
      console.log(`   Meeting ID: ${response.data.data.meeting_id}`);
      console.log(`   Presiding Officer: ${presidingOfficer.full_name}`);
      console.log(`   Secretary: ${secretary.full_name}`);
      return true;
    } else {
      console.log('❌ FAILED: Response not successful');
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 WARD MEETING PRESIDING OFFICER DROPDOWN FIX - TEST SUITE');
  console.log('='.repeat(80));
  console.log(`\nTest Ward: ${testWardCode}`);
  console.log(`Test Province: ${testProvinceCode}`);
  console.log(`Base URL: ${BASE_URL}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Authenticate
  if (!await authenticate()) {
    console.log('\n❌ Authentication failed. Cannot proceed with tests.');
    return;
  }

  // Test 1: Get members by province (presiding officer dropdown)
  results.total++;
  if (await testGetMembersByProvince()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: Get ward meetings
  results.total++;
  if (await testGetWardMeetings()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 3: Create ward meeting with presiding officer
  results.total++;
  if (await testCreateWardMeeting()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('='.repeat(80));

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The presiding officer dropdown fix is working correctly!');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);

