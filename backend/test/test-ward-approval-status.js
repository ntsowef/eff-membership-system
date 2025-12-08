/**
 * Test to check ward 41804014 approval status and criteria
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
  console.log('================================================================================');
  console.log('🔍 WARD 41804014 APPROVAL STATUS CHECK');
  console.log('================================================================================\n');
  
  try {
    // Login
    console.log('Step 1: Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful\n');
    
    // Get ward compliance details
    console.log('Step 2: Fetching ward 41804014 compliance details...');
    const response = await axios.get(
      `${BASE_URL}/ward-audit/ward/41804014/compliance/details`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const ward = response.data.data;
    
    console.log('✅ Ward compliance details retrieved\n');
    console.log('================================================================================');
    console.log('WARD INFORMATION');
    console.log('================================================================================');
    console.log(`Ward Code: ${ward.ward_code}`);
    console.log(`Ward Name: ${ward.ward_name}`);
    console.log(`Municipality: ${ward.municipality_name}`);
    console.log(`Total Members: ${ward.total_members}`);
    console.log(`Active Members: ${ward.active_members || 'N/A'}`);
    console.log(`Is Compliant: ${ward.is_compliant ? '✅ YES' : '❌ NO'}`);
    console.log(`All Criteria Passed: ${ward.all_criteria_passed ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n================================================================================');
    console.log('COMPLIANCE CRITERIA STATUS');
    console.log('================================================================================');
    
    console.log(`\n1️⃣  Criterion 1 (Membership & Voting Districts): ${ward.criterion_1_compliant ? '✅ PASSED' : '❌ FAILED'}`);
    if (ward.criterion_1_data) {
      console.log(`    - Total Members: ${ward.criterion_1_data.total_members}`);
      console.log(`    - Voting Districts: ${ward.criterion_1_data.voting_districts_count}`);
      console.log(`    - VDs with 10+ members: ${ward.criterion_1_data.compliant_vds_count}`);
      console.log(`    - Compliance Rate: ${ward.criterion_1_data.compliance_percentage}%`);
    }
    
    console.log(`\n2️⃣  Criterion 2 (Membership Growth): ${ward.criterion_2_passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (ward.criterion_2_data) {
      console.log(`    - Growth Rate: ${ward.criterion_2_data.growth_rate}%`);
      console.log(`    - Previous Count: ${ward.criterion_2_data.previous_count}`);
      console.log(`    - Current Count: ${ward.criterion_2_data.current_count}`);
    }
    
    console.log(`\n3️⃣  Criterion 3 (Meeting Attendance): ${ward.criterion_3_passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (ward.criterion_3_data) {
      console.log(`    - Total Meetings: ${ward.criterion_3_data.total_meetings}`);
      console.log(`    - Meetings with Quorum: ${ward.criterion_3_data.meetings_with_quorum}`);
      console.log(`    - Quorum Achievement Rate: ${ward.criterion_3_data.quorum_achievement_rate}%`);
    }
    
    console.log(`\n4️⃣  Criterion 4 (Presiding Officer): ${ward.criterion_4_passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (ward.criterion_4_data) {
      console.log(`    - Presiding Officer: ${ward.criterion_4_data.presiding_officer_name}`);
      console.log(`    - Meeting Date: ${new Date(ward.criterion_4_data.meeting_date).toLocaleDateString()}`);
    } else {
      console.log(`    - Status: No presiding officer recorded`);
    }
    
    console.log(`\n5️⃣  Criterion 5 (Delegate Selection): ${ward.criterion_5_passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (ward.criterion_5_data) {
      console.log(`    - SRPA Delegates: ${ward.criterion_5_data.srpa_delegates}`);
      console.log(`    - PPA Delegates: ${ward.criterion_5_data.ppa_delegates}`);
      console.log(`    - NPA Delegates: ${ward.criterion_5_data.npa_delegates}`);
    } else {
      console.log(`    - Status: No delegates assigned`);
    }
    
    console.log('\n================================================================================');
    console.log('APPROVAL BUTTON STATUS');
    console.log('================================================================================');
    
    const canApprove = ward.all_criteria_passed && !ward.is_compliant;
    
    if (canApprove) {
      console.log('✅ APPROVE BUTTON SHOULD BE VISIBLE');
      console.log('   All criteria are passed and ward is not yet compliant.');
    } else {
      console.log('❌ APPROVE BUTTON IS HIDDEN');
      if (!ward.all_criteria_passed) {
        console.log('   Reason: Not all criteria are passed');
        console.log('   Failed criteria:');
        if (!ward.criterion_1_compliant) console.log('     - Criterion 1: Membership & Voting Districts');
        if (!ward.criterion_2_passed) console.log('     - Criterion 2: Membership Growth');
        if (!ward.criterion_3_passed) console.log('     - Criterion 3: Meeting Attendance');
        if (!ward.criterion_4_passed) console.log('     - Criterion 4: Presiding Officer');
        if (!ward.criterion_5_passed) console.log('     - Criterion 5: Delegate Selection');
      }
      if (ward.is_compliant) {
        console.log('   Reason: Ward is already compliant (already approved)');
      }
    }
    
    console.log('\n================================================================================');
    console.log('NEXT STEPS');
    console.log('================================================================================');
    
    if (!ward.all_criteria_passed) {
      console.log('\n📋 To make the approve button appear, complete the following:');
      if (!ward.criterion_1_compliant) {
        console.log('   ❌ Criterion 1: Ensure ward has ≥100 members and 50%+ voting districts have ≥10 members');
      }
      if (!ward.criterion_2_passed) {
        console.log('   ❌ Criterion 2: Ensure membership growth is positive');
      }
      if (!ward.criterion_3_passed) {
        console.log('   ❌ Criterion 3: Record meetings with quorum achievement');
      }
      if (!ward.criterion_4_passed) {
        console.log('   ❌ Criterion 4: Record a meeting with a presiding officer');
      }
      if (!ward.criterion_5_passed) {
        console.log('   ❌ Criterion 5: Assign delegates for SRPA/PPA/NPA assemblies');
      }
    } else if (ward.is_compliant) {
      console.log('\n✅ Ward is already compliant (approved)');
      console.log('   No further action needed.');
    } else {
      console.log('\n✅ All criteria passed! You can now approve this ward.');
      console.log('   Click the "Approve Ward Compliance" button on the ward detail page.');
    }
    
    console.log('\n================================================================================');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();

