const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testInvitationPreview() {
  console.log('🧪 Testing Invitation Preview Fix...\n');

  const testCases = [
    {
      name: 'National Level Meeting',
      data: {
        meeting_type_id: 4,
        hierarchy_level: 'National'
      }
    },
    {
      name: 'Provincial Level Meeting',
      data: {
        meeting_type_id: 7,
        hierarchy_level: 'Provincial'
      }
    },
    {
      name: 'Municipal Level Meeting',
      data: {
        meeting_type_id: 12,
        hierarchy_level: 'Municipal'
      }
    },
    {
      name: 'Ward Level Meeting',
      data: {
        meeting_type_id: 13,
        hierarchy_level: 'Ward'
      }
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`📋 Testing: ${testCase.name}`);
      
      const response = await axios.post(
        `${BASE_URL}/hierarchical-meetings/invitation-preview`,
        testCase.data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log(`✅ ${testCase.name}: PASSED`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Total Invitations: ${response.data.data.total_invitations}`);
        console.log(`   Message: ${response.data.message}\n`);
        passedTests++;
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);
      }

    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.message || error.response.data.error || 'Unknown error'}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('📊 TEST RESULTS:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The invitation preview fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run the test
testInvitationPreview().catch(console.error);
