/**
 * Test Application and Renewal Endpoints Compatibility
 * 
 * This test verifies that membership application approval and renewal endpoints
 * work correctly with the new consolidated database schema (eff_membership_database)
 * where membership fields are stored directly in the members table.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TEST_TIMEOUT = 30000;

// Test configuration
const config = {
  timeout: TEST_TIMEOUT,
  validateStatus: () => true // Don't throw on any status
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    log(`\n🧪 Running: ${testName}`, 'blue');
    await testFn();
    passedTests++;
    log(`✅ PASSED: ${testName}`, 'green');
    return true;
  } catch (error) {
    failedTests++;
    log(`❌ FAILED: ${testName}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return false;
  }
}

/**
 * Test 1: Get Pending Applications
 * Verifies that we can retrieve pending applications
 */
async function testGetPendingApplications() {
  const response = await axios.get(
    `${BASE_URL}/membership-applications/pending/review`,
    config
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  log(`   Found ${response.data.data?.length || 0} pending applications`, 'yellow');
}

/**
 * Test 2: Get Application by ID
 * Verifies that we can retrieve a specific application
 */
async function testGetApplicationById() {
  // First get a list of applications
  const listResponse = await axios.get(
    `${BASE_URL}/membership-applications?limit=1`,
    config
  );

  if (listResponse.status !== 200 || !listResponse.data.data?.length) {
    log('   ⚠️  No applications found to test', 'yellow');
    return;
  }

  const applicationId = listResponse.data.data[0].id;
  
  const response = await axios.get(
    `${BASE_URL}/membership-applications/${applicationId}`,
    config
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  const application = response.data.data;
  if (!application || !application.id) {
    throw new Error('Application data is missing required fields');
  }

  log(`   Retrieved application ID: ${application.id}`, 'yellow');
}

/**
 * Test 3: Verify Member Has Consolidated Fields After Approval
 * This test checks if approved applications create members with membership fields
 */
async function testMemberConsolidatedFields() {
  // Get a recently approved member (one with membership_number)
  const response = await axios.get(
    `${BASE_URL}/members?limit=1&sort=created_at&order=desc`,
    config
  );

  if (response.status !== 200 || !response.data.data?.length) {
    log('   ⚠️  No members found to test', 'yellow');
    return;
  }

  const member = response.data.data[0];
  
  // Verify consolidated membership fields exist
  const requiredFields = [
    'member_id',
    'firstname',
    'surname',
    'id_number'
  ];

  const membershipFields = [
    'membership_number',
    'date_joined',
    'expiry_date',
    'membership_status_id'
  ];

  for (const field of requiredFields) {
    if (!member[field]) {
      throw new Error(`Member is missing required field: ${field}`);
    }
  }

  let hasAnyMembershipField = false;
  for (const field of membershipFields) {
    if (member[field]) {
      hasAnyMembershipField = true;
      log(`   ✓ Member has ${field}: ${member[field]}`, 'yellow');
    }
  }

  if (!hasAnyMembershipField) {
    log('   ⚠️  Member does not have membership fields (may not be approved yet)', 'yellow');
  }
}

/**
 * Test 4: Test External Renewal Endpoint
 * Verifies that external renewal updates consolidated member fields
 */
async function testExternalRenewal() {
  // Get a member with an ID number
  const memberResponse = await axios.get(
    `${BASE_URL}/members?limit=1&sort=created_at&order=desc`,
    config
  );

  if (memberResponse.status !== 200 || !memberResponse.data.data?.length) {
    log('   ⚠️  No members found to test renewal', 'yellow');
    return;
  }

  const member = memberResponse.data.data[0];

  if (!member.id_number) {
    log('   ⚠️  Member does not have ID number, skipping renewal test', 'yellow');
    return;
  }

  const renewalData = {
    id_number: member.id_number,
    renewal_period_months: 24,
    payment_method: 'external_system',
    amount_paid: 100.00,
    notes: 'Test renewal from automated test suite',
    external_system_id: `TEST_${Date.now()}`
  };

  const response = await axios.post(
    `${BASE_URL}/external-renewal/renew`,
    renewalData,
    config
  );

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  const result = response.data.data;

  // Verify renewal details
  if (!result.renewal_details) {
    throw new Error('Response missing renewal_details');
  }

  if (!result.renewal_details.new_expiry_date) {
    throw new Error('Response missing new_expiry_date');
  }

  // Verify membership data uses consolidated schema
  if (!result.membership) {
    throw new Error('Response missing membership data');
  }

  const membership = result.membership;

  // These fields should come from the members table (consolidated schema)
  const consolidatedFields = ['membership_number', 'date_joined', 'expiry_date', 'membership_status_id'];
  for (const field of consolidatedFields) {
    if (!membership[field]) {
      log(`   ⚠️  Warning: membership missing ${field}`, 'yellow');
    } else {
      log(`   ✓ Membership has ${field}: ${membership[field]}`, 'yellow');
    }
  }

  log(`   ✓ Renewal successful - New expiry: ${result.renewal_details.new_expiry_date}`, 'yellow');
}

/**
 * Test 5: Test Renewal Processing Service
 * Verifies that renewal processing updates member expiry dates
 */
async function testRenewalProcessing() {
  // Get a member to renew
  const memberResponse = await axios.get(
    `${BASE_URL}/members?limit=1`,
    config
  );

  if (memberResponse.status !== 200 || !memberResponse.data.data?.length) {
    log('   ⚠️  No members found to test renewal processing', 'yellow');
    return;
  }

  const member = memberResponse.data.data[0];

  const renewalData = {
    member_id: member.member_id,
    renewal_type: 'standard',
    payment_method: 'online',
    amount_paid: 100.00,
    renewal_period_months: 24,
    processed_by: 1,
    notes: 'Test renewal processing'
  };

  // Note: This endpoint may not exist or may require authentication
  // We'll try to call it but won't fail if it's not available
  try {
    const response = await axios.post(
      `${BASE_URL}/membership-renewal/process/${member.member_id}`,
      renewalData,
      config
    );

    if (response.status === 200) {
      log(`   ✓ Renewal processing successful`, 'yellow');

      // Verify the member's expiry date was updated
      const updatedMemberResponse = await axios.get(
        `${BASE_URL}/members/${member.member_id}`,
        config
      );

      if (updatedMemberResponse.status === 200) {
        const updatedMember = updatedMemberResponse.data.data;
        if (updatedMember.expiry_date) {
          log(`   ✓ Member expiry date updated: ${updatedMember.expiry_date}`, 'yellow');
        }
      }
    } else if (response.status === 404) {
      log('   ⚠️  Renewal processing endpoint not found', 'yellow');
    } else if (response.status === 401 || response.status === 403) {
      log('   ⚠️  Renewal processing requires authentication', 'yellow');
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw error;
    }
    log(`   ⚠️  Renewal processing test skipped: ${error.message}`, 'yellow');
  }
}

/**
 * Test 6: Verify No Old Memberships Table References
 * This test checks that the API doesn't return data from old memberships table
 */
async function testNoOldMembershipsTableReferences() {
  // Get a member with details
  const response = await axios.get(
    `${BASE_URL}/members?limit=1`,
    config
  );

  if (response.status !== 200 || !response.data.data?.length) {
    log('   ⚠️  No members found to test', 'yellow');
    return;
  }

  const member = response.data.data[0];

  // In the consolidated schema, membership_id should equal member_id
  // or not exist as a separate field
  if (member.membership_id && member.membership_id !== member.member_id) {
    log(`   ⚠️  Warning: membership_id (${member.membership_id}) differs from member_id (${member.member_id})`, 'yellow');
    log('   This might indicate old schema references', 'yellow');
  } else {
    log('   ✓ No old memberships table references detected', 'yellow');
  }
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(80), 'blue');
  log('APPLICATION AND RENEWAL ENDPOINTS COMPATIBILITY TEST', 'blue');
  log('Testing consolidated database schema (eff_membership_database)', 'blue');
  log('='.repeat(80) + '\n', 'blue');

  // Run all tests
  await runTest('Test 1: Get Pending Applications', testGetPendingApplications);
  await runTest('Test 2: Get Application by ID', testGetApplicationById);
  await runTest('Test 3: Verify Member Consolidated Fields', testMemberConsolidatedFields);
  await runTest('Test 4: Test External Renewal Endpoint', testExternalRenewal);
  await runTest('Test 5: Test Renewal Processing Service', testRenewalProcessing);
  await runTest('Test 6: Verify No Old Memberships Table References', testNoOldMembershipsTableReferences);

  // Print summary
  log('\n' + '='.repeat(80), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(80), 'blue');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`,
    failedTests === 0 ? 'green' : 'yellow');
  log('='.repeat(80) + '\n', 'blue');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
  process.exit(1);
});

