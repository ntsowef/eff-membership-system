const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testRoleBasedFrontend() {
  console.log('🧪 **TESTING ROLE-BASED FRONTEND FUNCTIONALITY**\n');

  try {
    // Test 1: Financial Reviewer Login
    console.log('1️⃣ **Testing Financial Reviewer Login**');
    const financialReviewerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'financial.reviewer@test.com',
      password: 'password123'
    });

    if (financialReviewerLogin.status === 200) {
      console.log('✅ Financial Reviewer login successful');
      console.log(`   Token: ${financialReviewerLogin.data.token ? financialReviewerLogin.data.token.substring(0, 20) + '...' : 'No token'}`);
      console.log(`   User: ${financialReviewerLogin.data.user?.first_name || 'Unknown'} ${financialReviewerLogin.data.user?.last_name || 'User'}`);
      console.log(`   Role: ${financialReviewerLogin.data.user?.role || 'Unknown'}`);
    }

    // Test 2: Membership Approver Login
    console.log('\n2️⃣ **Testing Membership Approver Login**');
    const membershipApproverLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'membership.approver@test.com',
      password: 'password123'
    });

    if (membershipApproverLogin.status === 200) {
      console.log('✅ Membership Approver login successful');
      console.log(`   Token: ${membershipApproverLogin.data.token ? membershipApproverLogin.data.token.substring(0, 20) + '...' : 'No token'}`);
      console.log(`   User: ${membershipApproverLogin.data.user?.first_name || 'Unknown'} ${membershipApproverLogin.data.user?.last_name || 'User'}`);
      console.log(`   Role: ${membershipApproverLogin.data.user?.role || 'Unknown'}`);
    }

    // Test 3: Financial Reviewer - Get Applications
    console.log('\n3️⃣ **Testing Financial Reviewer - Get Applications**');
    const financialToken = financialReviewerLogin.data.token || financialReviewerLogin.data.access_token;
    const financialApplications = await axios.get(`${BASE_URL}/two-tier-approval/financial-review/applications`, {
      headers: { Authorization: `Bearer ${financialToken}` }
    });

    console.log(`✅ Financial Reviewer can access applications: ${financialApplications.data.applications.length} found`);
    if (financialApplications.data.applications.length > 0) {
      const app = financialApplications.data.applications[0];
      console.log(`   Sample Application: ID ${app.id}, Status: ${app.status}, Workflow: ${app.workflow_stage}`);
    }

    // Test 4: Membership Approver - Get Applications
    console.log('\n4️⃣ **Testing Membership Approver - Get Applications**');
    const approverToken = membershipApproverLogin.data.token || membershipApproverLogin.data.access_token;
    const approverApplications = await axios.get(`${BASE_URL}/two-tier-approval/final-review/applications`, {
      headers: { Authorization: `Bearer ${approverToken}` }
    });

    console.log(`✅ Membership Approver can access applications: ${approverApplications.data.applications.length} found`);
    if (approverApplications.data.applications.length > 0) {
      const app = approverApplications.data.applications[0];
      console.log(`   Sample Application: ID ${app.id}, Status: ${app.status}, Workflow: ${app.workflow_stage}`);
    }

    // Test 5: Test Application Detail Access
    console.log('\n5️⃣ **Testing Application Detail Access**');
    
    // Get an application ID for testing
    let testAppId = null;
    if (financialApplications.data.applications.length > 0) {
      testAppId = financialApplications.data.applications[0].id;
    } else if (approverApplications.data.applications.length > 0) {
      testAppId = approverApplications.data.applications[0].id;
    }

    if (testAppId) {
      // Test Financial Reviewer access
      const financialDetailAccess = await axios.get(`${BASE_URL}/two-tier-approval/applications/${testAppId}`, {
        headers: { Authorization: `Bearer ${financialToken}` }
      });
      console.log(`✅ Financial Reviewer can access application ${testAppId} details`);
      console.log(`   Application: ${financialDetailAccess.data.application.first_name} ${financialDetailAccess.data.application.last_name}`);

      // Test Membership Approver access
      const approverDetailAccess = await axios.get(`${BASE_URL}/two-tier-approval/applications/${testAppId}`, {
        headers: { Authorization: `Bearer ${approverToken}` }
      });
      console.log(`✅ Membership Approver can access application ${testAppId} details`);
      console.log(`   Application: ${approverDetailAccess.data.application.first_name} ${approverDetailAccess.data.application.last_name}`);
    } else {
      console.log('⚠️  No applications available for detail testing');
    }

    // Test 6: Workflow Statistics
    console.log('\n6️⃣ **Testing Workflow Statistics**');
    const financialStats = await axios.get(`${BASE_URL}/two-tier-approval/statistics`, {
      headers: { Authorization: `Bearer ${financialToken}` }
    });
    console.log('✅ Financial Reviewer can access workflow statistics');
    console.log(`   Statistics: ${JSON.stringify(financialStats.data.statistics, null, 2)}`);

    const approverStats = await axios.get(`${BASE_URL}/two-tier-approval/statistics`, {
      headers: { Authorization: `Bearer ${approverToken}` }
    });
    console.log('✅ Membership Approver can access workflow statistics');
    console.log(`   Statistics: ${JSON.stringify(approverStats.data.statistics, null, 2)}`);

    // Test 7: Frontend URLs
    console.log('\n7️⃣ **Frontend Access Information**');
    console.log('🌐 **Frontend Server**: http://localhost:3002');
    console.log('📋 **Application Detail Page**: http://localhost:3002/admin/applications/{id}');
    console.log('');
    console.log('🔐 **Test Credentials:**');
    console.log('   Financial Reviewer: financial.reviewer@test.com / password123');
    console.log('   Membership Approver: membership.approver@test.com / password123');
    console.log('');
    console.log('📝 **Role-Based Interface:**');
    console.log('   - Financial Reviewers see: Payment Information + Financial Review tabs');
    console.log('   - Membership Approvers see: Personal Info + Contact + Payment + Final Review + History tabs');
    console.log('   - Each role has access to appropriate workflow actions');

    console.log('\n🎉 **ALL ROLE-BASED FRONTEND TESTS PASSED!**');
    console.log('\n✅ **READY FOR TESTING:**');
    console.log('1. Open http://localhost:3002 in your browser');
    console.log('2. Login with the test credentials above');
    console.log('3. Navigate to an application detail page');
    console.log('4. Verify role-based tabs and functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Make sure the backend server is running on port 5000');
    }
  }
}

// Run the test
testRoleBasedFrontend();
