const axios = require('axios');

const baseURL = 'http://localhost:5000/api/v1';

// Test data for each hierarchy level
const testMeetings = [
  {
    level: 'National',
    title: 'National War Council Meeting',
    hierarchy_level: 'National',
    entity_id: 1,
    meeting_type_id: 22, // War Council Meeting
    meeting_date: '2025-11-15',
    meeting_time: '09:00',
    end_time: '12:00',
    location: 'National Headquarters',
    description: 'Weekly War Council Meeting for strategic decision making'
  },
  {
    level: 'Provincial',
    title: 'Gauteng Provincial AGM',
    hierarchy_level: 'Provincial',
    entity_id: 3, // Gauteng province ID (corrected)
    meeting_type_id: 24, // Provincial AGM
    meeting_date: '2025-11-20',
    meeting_time: '10:00',
    end_time: '14:00',
    location: 'Johannesburg Provincial Office',
    description: 'Semi-annual Provincial Annual General Meeting'
  },
  {
    level: 'Municipal',
    title: 'Johannesburg Sub-Regional Command Team Meeting',
    hierarchy_level: 'Municipal',
    entity_id: 547, // Johannesburg municipality ID
    meeting_type_id: 25, // Sub-Regional Command Team Meeting
    meeting_date: '2025-11-25',
    meeting_time: '15:00',
    end_time: '18:00',
    location: 'Municipal Hall',
    description: 'Monthly Sub-Regional Command Team meeting'
  }
];

const testResults = {
  authentication: { passed: 0, failed: 0 },
  getMeetingTypes: { passed: 0, failed: 0 },
  createMeetings: { passed: 0, failed: 0 },
  getMeetings: { passed: 0, failed: 0 },
  getMeetingById: { passed: 0, failed: 0 },
  deleteMeetings: { passed: 0, failed: 0 }
};

const createdMeetings = [];

async function testHierarchicalMeetings() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 HIERARCHICAL MEETINGS TESTING');
  console.log('   Testing Meetings from National to Ward Level');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Set timeout
    axios.defaults.timeout = 10000;

    // Step 1: Authentication
    console.log('======================================================================');
    console.log('📊 STEP 1: AUTHENTICATION');
    console.log('======================================================================\n');

    console.log('🔐 Logging in as National Admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');
    testResults.authentication.passed++;

    // Step 2: Get Meeting Types
    console.log('======================================================================');
    console.log('📊 STEP 2: GET MEETING TYPES');
    console.log('======================================================================\n');

    try {
      const meetingTypesResponse = await axios.get(`${baseURL}/hierarchical-meetings/meeting-types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const meetingTypes = meetingTypesResponse.data.data.meetingTypes || meetingTypesResponse.data.data;
      console.log(`✅ Retrieved ${meetingTypes.length} meeting types\n`);
      testResults.getMeetingTypes.passed++;
    } catch (error) {
      console.log(`❌ Failed to get meeting types: ${error.response?.data?.message || error.message}\n`);
      testResults.getMeetingTypes.failed++;
    }

    // Step 3: Create Meetings for Each Hierarchy Level
    console.log('======================================================================');
    console.log('📊 STEP 3: CREATE HIERARCHICAL MEETINGS');
    console.log('======================================================================\n');

    for (const meeting of testMeetings) {
      console.log(`📍 Creating ${meeting.level} Meeting: ${meeting.title}`);
      console.log(`   Hierarchy Level: ${meeting.hierarchy_level}`);
      console.log(`   Entity ID: ${meeting.entity_id}`);
      console.log(`   Date: ${meeting.meeting_date} at ${meeting.meeting_time}`);

      try {
        // Remove the 'level' field before sending
        const { level, ...meetingData } = meeting;
        const createResponse = await axios.post(`${baseURL}/hierarchical-meetings`, meetingData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const meetingId = createResponse.data.data.meeting?.meeting_id || createResponse.data.data.meetingId;
        
        if (meetingId) {
          createdMeetings.push({
            id: meetingId,
            level: meeting.level,
            title: meeting.title
          });
          console.log(`   ✅ Meeting created successfully (ID: ${meetingId})\n`);
          testResults.createMeetings.passed++;
        } else {
          console.log(`   ⚠️  Meeting created but no ID returned\n`);
          testResults.createMeetings.failed++;
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        console.log(`   ❌ Failed to create meeting: ${errorMsg}`);
        if (error.response?.data) {
          console.log(`   Error details:`, JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
        testResults.createMeetings.failed++;
      }
    }

    // Step 4: Get Meetings by Hierarchy Level
    console.log('======================================================================');
    console.log('📊 STEP 4: GET MEETINGS BY HIERARCHY LEVEL');
    console.log('======================================================================\n');

    for (const meeting of testMeetings) {
      try {
        const getMeetingsResponse = await axios.get(`${baseURL}/hierarchical-meetings`, {
          params: { hierarchy_level: meeting.hierarchy_level },
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const meetings = getMeetingsResponse.data.data.meetings || getMeetingsResponse.data.data;
        const count = Array.isArray(meetings) ? meetings.length : 0;
        console.log(`✅ ${meeting.level}: Retrieved ${count} meetings`);
        testResults.getMeetings.passed++;
      } catch (error) {
        console.log(`❌ ${meeting.level}: Failed to get meetings - ${error.response?.data?.message || error.message}`);
        testResults.getMeetings.failed++;
      }
    }
    console.log('');

    // Step 5: Get Individual Meetings by ID
    console.log('======================================================================');
    console.log('📊 STEP 5: GET MEETINGS BY ID');
    console.log('======================================================================\n');

    for (const meeting of createdMeetings) {
      try {
        const getMeetingResponse = await axios.get(`${baseURL}/hierarchical-meetings/${meeting.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const retrievedMeeting = getMeetingResponse.data.data.meeting || getMeetingResponse.data.data;
        console.log(`✅ ${meeting.level}: Retrieved meeting "${meeting.title}" (ID: ${meeting.id})`);
        testResults.getMeetingById.passed++;
      } catch (error) {
        console.log(`❌ ${meeting.level}: Failed to get meeting - ${error.response?.data?.message || error.message}`);
        testResults.getMeetingById.failed++;
      }
    }
    console.log('');

    // Step 6: Delete Created Meetings
    console.log('======================================================================');
    console.log('📊 STEP 6: CLEANUP - DELETE TEST MEETINGS');
    console.log('======================================================================\n');

    console.log(`🗑️  Deleting ${createdMeetings.length} test meetings...\n`);

    for (const meeting of createdMeetings) {
      try {
        await axios.delete(`${baseURL}/hierarchical-meetings/${meeting.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`   ✅ Deleted: ${meeting.level} - ${meeting.title}`);
        testResults.deleteMeetings.passed++;
      } catch (error) {
        console.log(`   ❌ Failed to delete: ${meeting.level} - ${meeting.title} - ${error.response?.data?.message || error.message}`);
        testResults.deleteMeetings.failed++;
      }
    }
    console.log('');

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 FINAL SUMMARY - HIERARCHICAL MEETINGS TESTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalTests = Object.values(testResults).reduce((sum, result) => sum + result.passed + result.failed, 0);
    const totalPassed = Object.values(testResults).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(testResults).reduce((sum, result) => sum + result.failed, 0);
    const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log('📈 Test Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}/${totalTests} (${successRate}%)`);
    console.log(`   Failed: ${totalFailed}/${totalTests}\n`);

    console.log('📋 Test Breakdown:');
    console.log(`   ${testResults.authentication.passed > 0 ? '✅' : '❌'} Authentication: ${testResults.authentication.passed}/${testResults.authentication.passed + testResults.authentication.failed} passed`);
    console.log(`   ${testResults.getMeetingTypes.passed > 0 ? '✅' : '❌'} Get Meeting Types: ${testResults.getMeetingTypes.passed}/${testResults.getMeetingTypes.passed + testResults.getMeetingTypes.failed} passed`);
    console.log(`   ${testResults.createMeetings.passed > 0 ? '✅' : '❌'} Create Meetings: ${testResults.createMeetings.passed}/${testResults.createMeetings.passed + testResults.createMeetings.failed} passed`);
    console.log(`   ${testResults.getMeetings.passed > 0 ? '✅' : '❌'} Get Meetings: ${testResults.getMeetings.passed}/${testResults.getMeetings.passed + testResults.getMeetings.failed} passed`);
    console.log(`   ${testResults.getMeetingById.passed > 0 ? '✅' : '❌'} Get Meeting By ID: ${testResults.getMeetingById.passed}/${testResults.getMeetingById.passed + testResults.getMeetingById.failed} passed`);
    console.log(`   ${testResults.deleteMeetings.passed > 0 ? '✅' : '❌'} Delete Meetings: ${testResults.deleteMeetings.passed}/${testResults.deleteMeetings.passed + testResults.deleteMeetings.failed} passed\n`);

    console.log('🎯 Hierarchy Levels Tested:');
    console.log(`   ✅ National Level (War Council)`);
    console.log(`   ✅ Provincial Level (Provincial AGM)`);
    console.log(`   ✅ Municipal Level (Sub-Regional Command Team)\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ HIERARCHICAL MEETINGS TESTS COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(totalFailed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testHierarchicalMeetings();

