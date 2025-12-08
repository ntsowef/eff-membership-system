const axios = require('axios');
const fs = require('fs');

const baseURL = 'http://localhost:5000/api/v1';

// Test users
const testUsers = {
  national: {
    email: 'national.admin@eff.org.za',
    password: 'Admin@123',
    level: 'National Admin'
  },
  provincial: {
    email: 'gauteng.admin@eff.org.za',
    password: 'Admin@123',
    level: 'Provincial Admin (Gauteng)'
  }
};

// Test sub-regions (metro sub-regions)
const testSubRegions = [
  { municipality_id: 570, name: 'BUF - East London', code: 'BUF001', metro: 'Buffalo City' },
  { municipality_id: 560, name: 'CPT - Zone 1', code: 'CPT001', metro: 'Cape Town' },
  { municipality_id: 542, name: 'EKU - Central', code: 'EKU001', metro: 'Ekurhuleni' },
  { municipality_id: 585, name: 'ETH - Central', code: 'ETH001', metro: 'eThekwini' },
  { municipality_id: 547, name: 'JHB - A', code: 'JHB001', metro: 'Johannesburg' },
  { municipality_id: 581, name: 'MAN - Bloemfontein', code: 'MAN001', metro: 'Mangaung' },
  { municipality_id: 574, name: 'NMA - Champion Galela', code: 'NMA001', metro: 'Nelson Mandela Bay' },
  { municipality_id: 554, name: 'TSH - 1', code: 'TSH001', metro: 'Tshwane' }
];

async function loginUser(email, password) {
  try {
    const response = await axios.post(`${baseURL}/auth/login`, {
      email,
      password
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });

    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function getPositionsByEntityId(token, entityId) {
  try {
    const response = await axios.get(`${baseURL}/leadership/positions`, {
      params: { 
        hierarchy_level: 'Municipality',
        entity_id: entityId
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });

    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function getAppointmentsByEntityId(token, entityId) {
  try {
    const response = await axios.get(`${baseURL}/leadership/appointments`, {
      params: { 
        hierarchy_level: 'Municipality',
        entity_id: entityId
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });

    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function getLeadershipStructure(token, entityId) {
  try {
    const response = await axios.get(`${baseURL}/leadership/structure/Municipality/${entityId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });

    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function getMunicipalitiesByProvinceCode(token, provinceCode) {
  try {
    const response = await axios.get(`${baseURL}/leadership/geographic/municipalities/code/${provinceCode}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });

    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 SUB-REGION FILTERING API TESTING');
  console.log('   Testing Metro Sub-Region Leadership Position Filtering');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = {
    login: { success: false, token: null },
    tests: []
  };

  // ============================================================================
  // STEP 1: LOGIN AS NATIONAL ADMIN
  // ============================================================================
  console.log('='.repeat(70));
  console.log('📊 STEP 1: AUTHENTICATION');
  console.log('='.repeat(70));

  console.log('\n🔐 Logging in as National Admin...');
  const loginResponse = await loginUser(testUsers.national.email, testUsers.national.password);

  if (loginResponse.status === 200 && loginResponse.data.success) {
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.data.user.name}`);
    console.log(`   Admin Level: ${loginResponse.data.data.user.admin_level}`);
    
    results.login.success = true;
    results.login.token = loginResponse.data.data.token;
  } else {
    console.log('❌ Login failed');
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
    return;
  }

  const token = results.login.token;

  // ============================================================================
  // STEP 2: TEST SUB-REGION POSITION FILTERING
  // ============================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 STEP 2: SUB-REGION POSITION FILTERING');
  console.log('='.repeat(70));

  for (const subRegion of testSubRegions) {
    console.log(`\n📍 Testing: ${subRegion.name} (${subRegion.metro})`);
    console.log(`   Municipality ID: ${subRegion.municipality_id}`);
    console.log(`   Municipality Code: ${subRegion.code}`);

    const positionsResponse = await getPositionsByEntityId(token, subRegion.municipality_id);

    if (positionsResponse.status === 200 && positionsResponse.data.success) {
      const positions = positionsResponse.data.data.positions;
      console.log(`   ✅ Retrieved ${positions.length} positions`);
      
      if (positions.length > 0) {
        console.log(`   Sample positions:`);
        positions.slice(0, 3).forEach(pos => {
          console.log(`   - ${pos.position_name} (${pos.position_code})`);
        });
      }

      results.tests.push({
        test: `Get Positions - ${subRegion.name}`,
        status: 'PASS',
        entity_id: subRegion.municipality_id,
        position_count: positions.length
      });
    } else {
      console.log(`   ❌ Failed to retrieve positions`);
      console.log(`   Status: ${positionsResponse.status}`);
      results.tests.push({
        test: `Get Positions - ${subRegion.name}`,
        status: 'FAIL',
        entity_id: subRegion.municipality_id,
        error: positionsResponse.data
      });
    }
  }

  // ============================================================================
  // STEP 3: TEST SUB-REGION APPOINTMENT FILTERING
  // ============================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 STEP 3: SUB-REGION APPOINTMENT FILTERING');
  console.log('='.repeat(70));

  for (const subRegion of testSubRegions.slice(0, 3)) { // Test first 3 for brevity
    console.log(`\n📍 Testing: ${subRegion.name} (${subRegion.metro})`);

    const appointmentsResponse = await getAppointmentsByEntityId(token, subRegion.municipality_id);

    if (appointmentsResponse.status === 200 && appointmentsResponse.data.success) {
      const appointments = appointmentsResponse.data.data.appointments;
      console.log(`   ✅ Retrieved ${appointments.length} appointments`);
      
      if (appointments.length > 0) {
        console.log(`   Sample appointments:`);
        appointments.slice(0, 3).forEach(apt => {
          console.log(`   - ${apt.position_name}: ${apt.member_name || 'Vacant'} (${apt.appointment_status})`);
        });
      } else {
        console.log(`   ℹ️  No appointments found (positions are vacant)`);
      }

      results.tests.push({
        test: `Get Appointments - ${subRegion.name}`,
        status: 'PASS',
        entity_id: subRegion.municipality_id,
        appointment_count: appointments.length
      });
    } else {
      console.log(`   ❌ Failed to retrieve appointments`);
      console.log(`   Status: ${appointmentsResponse.status}`);
      results.tests.push({
        test: `Get Appointments - ${subRegion.name}`,
        status: 'FAIL',
        entity_id: subRegion.municipality_id,
        error: appointmentsResponse.data
      });
    }
  }

  // ============================================================================
  // STEP 4: TEST LEADERSHIP STRUCTURE BY SUB-REGION
  // ============================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 STEP 4: LEADERSHIP STRUCTURE BY SUB-REGION');
  console.log('='.repeat(70));

  for (const subRegion of testSubRegions.slice(0, 2)) { // Test first 2 for brevity
    console.log(`\n📍 Testing: ${subRegion.name} (${subRegion.metro})`);

    const structureResponse = await getLeadershipStructure(token, subRegion.municipality_id);

    if (structureResponse.status === 200 && structureResponse.data.success) {
      const structure = structureResponse.data.data.leadership_structure;
      console.log(`   ✅ Retrieved leadership structure`);
      console.log(`   Total positions: ${structure.length}`);
      
      // Count by category
      const categories = {};
      structure.forEach(pos => {
        categories[pos.position_category] = (categories[pos.position_category] || 0) + 1;
      });
      
      console.log(`   Position breakdown:`);
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`   - ${category}: ${count} positions`);
      });

      results.tests.push({
        test: `Get Structure - ${subRegion.name}`,
        status: 'PASS',
        entity_id: subRegion.municipality_id,
        structure_count: structure.length
      });
    } else {
      console.log(`   ❌ Failed to retrieve structure`);
      console.log(`   Status: ${structureResponse.status}`);
      results.tests.push({
        test: `Get Structure - ${subRegion.name}`,
        status: 'FAIL',
        entity_id: subRegion.municipality_id,
        error: structureResponse.data
      });
    }
  }

  // ============================================================================
  // STEP 5: TEST GEOGRAPHIC HIERARCHY - MUNICIPALITIES BY PROVINCE
  // ============================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 STEP 5: GEOGRAPHIC HIERARCHY - MUNICIPALITIES BY PROVINCE');
  console.log('='.repeat(70));

  const testProvinces = ['GP', 'WC', 'EC', 'KZN'];

  for (const provinceCode of testProvinces) {
    console.log(`\n🗺️  Testing Province: ${provinceCode}`);

    const municipalitiesResponse = await getMunicipalitiesByProvinceCode(token, provinceCode);

    if (municipalitiesResponse.status === 200 && municipalitiesResponse.data.success) {
      const municipalities = municipalitiesResponse.data.data.municipalities;
      console.log(`   ✅ Retrieved ${municipalities.length} municipalities`);
      
      // Count by type
      const types = {};
      municipalities.forEach(mun => {
        types[mun.municipality_type] = (types[mun.municipality_type] || 0) + 1;
      });
      
      console.log(`   Municipality breakdown:`);
      Object.entries(types).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });

      // Show metro sub-regions if any
      const metroSubRegions = municipalities.filter(m => m.municipality_type === 'Metro Sub-Region');
      if (metroSubRegions.length > 0) {
        console.log(`   Metro Sub-Regions (${metroSubRegions.length}):`);
        metroSubRegions.slice(0, 3).forEach(sr => {
          console.log(`   - ${sr.municipality_name} (${sr.municipality_code})`);
        });
      }

      results.tests.push({
        test: `Get Municipalities - ${provinceCode}`,
        status: 'PASS',
        province_code: provinceCode,
        municipality_count: municipalities.length,
        metro_subregion_count: metroSubRegions.length
      });
    } else {
      console.log(`   ❌ Failed to retrieve municipalities`);
      console.log(`   Status: ${municipalitiesResponse.status}`);
      results.tests.push({
        test: `Get Municipalities - ${provinceCode}`,
        status: 'FAIL',
        province_code: provinceCode,
        error: municipalitiesResponse.data
      });
    }
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY - SUB-REGION FILTERING TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalTests = results.tests.length;
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;

  console.log('📈 Test Results:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`   Failed: ${failedTests}/${totalTests}`);

  console.log('\n📋 Test Breakdown:');
  const testsByType = {};
  results.tests.forEach(test => {
    const type = test.test.split(' - ')[0];
    if (!testsByType[type]) testsByType[type] = { pass: 0, fail: 0 };
    testsByType[type][test.status === 'PASS' ? 'pass' : 'fail']++;
  });

  Object.entries(testsByType).forEach(([type, counts]) => {
    const total = counts.pass + counts.fail;
    const icon = counts.fail === 0 ? '✅' : '⚠️';
    console.log(`   ${icon} ${type}: ${counts.pass}/${total} passed`);
  });

  console.log('\n🎯 Key Findings:');
  
  // Position filtering
  const positionTests = results.tests.filter(t => t.test.startsWith('Get Positions'));
  if (positionTests.length > 0) {
    const avgPositions = positionTests.reduce((sum, t) => sum + (t.position_count || 0), 0) / positionTests.length;
    console.log(`   ✅ Sub-region position filtering: ${positionTests.filter(t => t.status === 'PASS').length}/${positionTests.length} sub-regions`);
    console.log(`   ✅ Average positions per sub-region: ${avgPositions.toFixed(0)}`);
  }

  // Geographic hierarchy
  const geoTests = results.tests.filter(t => t.test.startsWith('Get Municipalities'));
  if (geoTests.length > 0) {
    const totalSubRegions = geoTests.reduce((sum, t) => sum + (t.metro_subregion_count || 0), 0);
    console.log(`   ✅ Geographic hierarchy: ${geoTests.filter(t => t.status === 'PASS').length}/${geoTests.length} provinces`);
    console.log(`   ✅ Total metro sub-regions found: ${totalSubRegions}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ SUB-REGION FILTERING TESTS COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save results
  fs.writeFileSync('test/subregion-filtering-test-results.json', JSON.stringify(results, null, 2));
  console.log('💾 Detailed results saved to: test/subregion-filtering-test-results.json\n');
}

runTests();

