const axios = require('axios');
const fs = require('fs');

const baseURL = 'http://localhost:5000/api/v1';

// Test configuration
const testConfig = {
  nationalAdmin: {
    email: 'national.admin@eff.org.za',
    password: 'Admin@123'
  },
  provincialAdmin: {
    email: 'gauteng.admin@eff.org.za',
    password: 'Admin@123'
  }
};

// Test sub-regions (one from each metro)
const testSubRegions = [
  { municipality_id: 570, name: 'BUF - East London', code: 'BUF001', metro: 'Buffalo City', province: 'EC' },
  { municipality_id: 560, name: 'CPT - Zone 1', code: 'CPT001', metro: 'Cape Town', province: 'WC' },
  { municipality_id: 542, name: 'EKU - Central', code: 'EKU001', metro: 'Ekurhuleni', province: 'GP' },
  { municipality_id: 585, name: 'ETH - Central', code: 'ETH001', metro: 'eThekwini', province: 'KZN' },
  { municipality_id: 547, name: 'JHB - A', code: 'JHB001', metro: 'Johannesburg', province: 'GP' },
  { municipality_id: 581, name: 'MAN - Bloemfontein', code: 'MAN001', metro: 'Mangaung', province: 'FS' },
  { municipality_id: 574, name: 'NMA - Champion Galela', code: 'NMA001', metro: 'Nelson Mandela Bay', province: 'EC' },
  { municipality_id: 554, name: 'TSH - 1', code: 'TSH001', metro: 'Tshwane', province: 'GP' }
];

// Test results
const testResults = {
  authentication: { passed: 0, failed: 0 },
  getPositions: { passed: 0, failed: 0 },
  getMembers: { passed: 0, failed: 0 },
  createAppointments: { passed: 0, failed: 0 },
  verifyAppointments: { passed: 0, failed: 0 },
  deleteAppointments: { passed: 0, failed: 0 }
};

const appointmentsCreated = [];

// Helper function to login
async function login(email, password) {
  try {
    const response = await axios.post(`${baseURL}/auth/login`, {
      email,
      password
    });
    return response.data.data.token;
  } catch (error) {
    throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
  }
}

// Helper function to get positions for a sub-region
async function getSubRegionPositions(token, entityId) {
  try {
    const response = await axios.get(`${baseURL}/leadership/positions`, {
      params: {
        hierarchy_level: 'Municipality',
        entity_id: entityId
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data.positions;
  } catch (error) {
    throw new Error(`Get positions failed: ${error.response?.data?.message || error.message}`);
  }
}

// Helper function to get eligible members
async function getEligibleMembers(token, limit = 50) {
  try {
    const response = await axios.get(`${baseURL}/members`, {
      params: {
        limit: limit,
        page: 1
      },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data.members || response.data.data;
  } catch (error) {
    throw new Error(`Get members failed: ${error.response?.data?.message || error.message}`);
  }
}

// Helper function to create appointment
async function createAppointment(token, appointmentData) {
  try {
    const response = await axios.post(`${baseURL}/leadership/appointments`, appointmentData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Create appointment failed: ${error.response?.data?.message || error.message}`);
  }
}

// Helper function to get appointments
async function getAppointments(token, filters) {
  try {
    const response = await axios.get(`${baseURL}/leadership/appointments`, {
      params: filters,
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data.appointments || response.data.data;
  } catch (error) {
    throw new Error(`Get appointments failed: ${error.response?.data?.message || error.message}`);
  }
}

// Helper function to delete appointment
async function deleteAppointment(token, appointmentId) {
  try {
    const response = await axios.delete(`${baseURL}/leadership/appointments/${appointmentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Delete appointment failed: ${error.response?.data?.message || error.message}`);
  }
}

// Main test function
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 SUB-REGION LEADERSHIP ASSIGNMENT TESTING');
  console.log('   Testing Leadership Appointments for Metro Sub-Regions');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let nationalAdminToken = null;

  // STEP 1: Authentication
  console.log('======================================================================');
  console.log('📊 STEP 1: AUTHENTICATION');
  console.log('======================================================================\n');

  try {
    console.log('🔐 Logging in as National Admin...');
    nationalAdminToken = await login(testConfig.nationalAdmin.email, testConfig.nationalAdmin.password);
    console.log('✅ Login successful\n');
    testResults.authentication.passed++;
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}\n`);
    testResults.authentication.failed++;
    return;
  }

  // STEP 2: Get eligible members
  console.log('======================================================================');
  console.log('📊 STEP 2: GET ELIGIBLE MEMBERS');
  console.log('======================================================================\n');

  let eligibleMembers = [];
  try {
    console.log('👥 Fetching eligible members...');
    eligibleMembers = await getEligibleMembers(nationalAdminToken, 100);
    console.log(`✅ Retrieved ${eligibleMembers.length} eligible members\n`);
    testResults.getMembers.passed++;
  } catch (error) {
    console.log(`❌ Failed to get members: ${error.message}\n`);
    testResults.getMembers.failed++;
    return;
  }

  if (eligibleMembers.length === 0) {
    console.log('⚠️  No eligible members found. Cannot proceed with appointments.\n');
    return;
  }

  // STEP 3: Test leadership assignments for each sub-region
  console.log('======================================================================');
  console.log('📊 STEP 3: CREATE LEADERSHIP APPOINTMENTS FOR SUB-REGIONS');
  console.log('======================================================================\n');

  for (const subRegion of testSubRegions) {
    console.log(`📍 Testing: ${subRegion.name} (${subRegion.metro})`);
    console.log(`   Municipality ID: ${subRegion.municipality_id}`);
    console.log(`   Municipality Code: ${subRegion.code}`);

    // Get positions for this sub-region
    let positions = [];
    try {
      positions = await getSubRegionPositions(nationalAdminToken, subRegion.municipality_id);
      console.log(`   ✅ Retrieved ${positions.length} positions`);
      testResults.getPositions.passed++;
    } catch (error) {
      console.log(`   ❌ Failed to get positions: ${error.message}`);
      testResults.getPositions.failed++;
      continue;
    }

    // Create appointments for key positions (Chairperson, Secretary, Treasurer)
    const keyPositions = positions.filter(p => 
      p.position_name.includes('Chairperson') || 
      p.position_name.includes('Secretary') || 
      p.position_name.includes('Treasurer')
    ).slice(0, 3);

    console.log(`   📝 Creating appointments for ${keyPositions.length} key positions...`);

    for (let i = 0; i < keyPositions.length && i < eligibleMembers.length; i++) {
      const position = keyPositions[i];
      const member = eligibleMembers[i];

      const appointmentData = {
        position_id: position.id,
        member_id: member.member_id,
        hierarchy_level: 'Municipality',
        entity_id: subRegion.municipality_id,
        appointment_type: 'Appointed',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
        appointment_notes: `Test appointment for ${subRegion.name} - ${position.position_name}`
      };

      try {
        const result = await createAppointment(nationalAdminToken, appointmentData);
        const memberFirstName = member.firstname || member.first_name || 'Unknown';
        const memberLastName = member.surname || member.last_name || 'Member';
        const appointmentId = result.appointment_id || result.id;

        appointmentsCreated.push({
          appointment_id: appointmentId,
          position_name: position.position_name,
          member_name: `${memberFirstName} ${memberLastName}`,
          sub_region: subRegion.name
        });
        console.log(`      ✅ Appointed ${memberFirstName} ${memberLastName} as ${position.position_name} (ID: ${appointmentId})`);
        testResults.createAppointments.passed++;
      } catch (error) {
        console.log(`      ❌ Failed to create appointment: ${error.message}`);
        testResults.createAppointments.failed++;
      }
    }

    console.log('');
  }

  // STEP 4: Verify appointments
  console.log('======================================================================');
  console.log('📊 STEP 4: VERIFY APPOINTMENTS');
  console.log('======================================================================\n');

  for (const subRegion of testSubRegions) {
    try {
      const appointments = await getAppointments(nationalAdminToken, {
        hierarchy_level: 'Municipality',
        entity_id: subRegion.municipality_id,
        appointment_status: 'Active'
      });
      
      const subRegionAppointments = appointmentsCreated.filter(a => a.sub_region === subRegion.name);
      
      if (appointments.length >= subRegionAppointments.length) {
        console.log(`✅ ${subRegion.name}: Verified ${appointments.length} appointments`);
        testResults.verifyAppointments.passed++;
      } else {
        console.log(`⚠️  ${subRegion.name}: Expected ${subRegionAppointments.length}, found ${appointments.length}`);
        testResults.verifyAppointments.failed++;
      }
    } catch (error) {
      console.log(`❌ ${subRegion.name}: Failed to verify: ${error.message}`);
      testResults.verifyAppointments.failed++;
    }
  }

  console.log('');

  // STEP 5: Cleanup - Delete test appointments
  console.log('======================================================================');
  console.log('📊 STEP 5: CLEANUP - DELETE TEST APPOINTMENTS');
  console.log('======================================================================\n');

  console.log(`🗑️  Deleting ${appointmentsCreated.length} test appointments...`);

  for (const appointment of appointmentsCreated) {
    try {
      await deleteAppointment(nationalAdminToken, appointment.appointment_id);
      console.log(`   ✅ Deleted appointment: ${appointment.member_name} - ${appointment.position_name}`);
      testResults.deleteAppointments.passed++;
    } catch (error) {
      console.log(`   ❌ Failed to delete appointment ${appointment.appointment_id}: ${error.message}`);
      testResults.deleteAppointments.failed++;
    }
  }

  console.log('');

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY - SUB-REGION LEADERSHIP ASSIGNMENT TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalPassed = Object.values(testResults).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;

  console.log('📈 Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${totalPassed}/${totalTests} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`   Failed: ${totalFailed}/${totalTests}\n`);

  console.log('📋 Test Breakdown:');
  console.log(`   ${testResults.authentication.passed > 0 ? '✅' : '❌'} Authentication: ${testResults.authentication.passed}/${testResults.authentication.passed + testResults.authentication.failed} passed`);
  console.log(`   ${testResults.getMembers.passed > 0 ? '✅' : '❌'} Get Members: ${testResults.getMembers.passed}/${testResults.getMembers.passed + testResults.getMembers.failed} passed`);
  console.log(`   ${testResults.getPositions.passed > 0 ? '✅' : '❌'} Get Positions: ${testResults.getPositions.passed}/${testResults.getPositions.passed + testResults.getPositions.failed} passed`);
  console.log(`   ${testResults.createAppointments.passed > 0 ? '✅' : '❌'} Create Appointments: ${testResults.createAppointments.passed}/${testResults.createAppointments.passed + testResults.createAppointments.failed} passed`);
  console.log(`   ${testResults.verifyAppointments.passed > 0 ? '✅' : '❌'} Verify Appointments: ${testResults.verifyAppointments.passed}/${testResults.verifyAppointments.passed + testResults.verifyAppointments.failed} passed`);
  console.log(`   ${testResults.deleteAppointments.passed > 0 ? '✅' : '❌'} Delete Appointments: ${testResults.deleteAppointments.passed}/${testResults.deleteAppointments.passed + testResults.deleteAppointments.failed} passed\n`);

  console.log('🎯 Key Findings:');
  console.log(`   ✅ Sub-regions tested: ${testSubRegions.length}`);
  console.log(`   ✅ Appointments created: ${testResults.createAppointments.passed}`);
  console.log(`   ✅ Appointments verified: ${testResults.verifyAppointments.passed}`);
  console.log(`   ✅ Appointments cleaned up: ${testResults.deleteAppointments.passed}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ SUB-REGION LEADERSHIP ASSIGNMENT TESTS COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      success_rate: `${((totalPassed/totalTests)*100).toFixed(1)}%`
    },
    test_breakdown: testResults,
    appointments_created: appointmentsCreated,
    sub_regions_tested: testSubRegions
  };

  fs.writeFileSync('test/subregion-assignment-test-results.json', JSON.stringify(detailedResults, null, 2));
  console.log('💾 Detailed results saved to: test/subregion-assignment-test-results.json\n');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

