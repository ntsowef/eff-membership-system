const axios = require('axios');

async function testMinimalMeeting() {
  console.log('🧪 Testing Minimal Meeting Creation...\n');

  // Test with only required fields
  const minimalData = {
    title: 'Minimal Test Meeting',
    meeting_type_id: 4,
    hierarchy_level: 'National',
    meeting_date: '2025-09-25',
    meeting_time: '10:00'
  };

  console.log('📤 Testing with minimal required fields:');
  console.log(JSON.stringify(minimalData, null, 2));

  try {
    const response = await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', minimalData);
    console.log('\n✅ SUCCESS! Minimal meeting created');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's a specific validation error
      if (error.response.status === 400) {
        console.log('\n🔍 This is a validation error. Let\'s check each field:');
        
        // Test each field individually
        await testFieldValidation('title', 'Test Meeting');
        await testFieldValidation('meeting_type_id', 4);
        await testFieldValidation('hierarchy_level', 'National');
        await testFieldValidation('meeting_date', '2025-09-25');
        await testFieldValidation('meeting_time', '10:00');
      }
    }
  }
}

async function testFieldValidation(fieldName, fieldValue) {
  const baseData = {
    title: 'Test Meeting',
    meeting_type_id: 4,
    hierarchy_level: 'National',
    meeting_date: '2025-09-25',
    meeting_time: '10:00'
  };

  // Test with missing field
  const testData = { ...baseData };
  delete testData[fieldName];

  try {
    await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', testData);
    console.log(`   ✅ ${fieldName}: Not required (unexpected)`);
  } catch (error) {
    if (error.response?.status === 400) {
      const message = error.response.data.error?.message || error.response.data.message || '';
      if (message.toLowerCase().includes(fieldName.toLowerCase())) {
        console.log(`   ❌ ${fieldName}: Required (validation working)`);
      } else {
        console.log(`   ❓ ${fieldName}: Other validation error - ${message}`);
      }
    } else {
      console.log(`   ❓ ${fieldName}: Non-validation error`);
    }
  }
}

// Test different hierarchy levels
async function testHierarchyLevels() {
  console.log('\n🏛️ Testing Different Hierarchy Levels...\n');

  const levels = ['National', 'Provincial', 'Regional', 'Municipal', 'Ward'];
  
  for (const level of levels) {
    const testData = {
      title: `Test ${level} Meeting`,
      meeting_type_id: 4, // This might be the issue - meeting type 4 might only work for National
      hierarchy_level: level,
      meeting_date: '2025-09-25',
      meeting_time: '10:00'
    };

    try {
      await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', testData);
      console.log(`   ✅ ${level}: Works with meeting type 4`);
    } catch (error) {
      if (error.response?.status === 400) {
        const message = error.response.data.error?.message || error.response.data.message || '';
        console.log(`   ❌ ${level}: ${message}`);
      } else {
        console.log(`   ❓ ${level}: Non-validation error`);
      }
    }
  }
}

// Test different meeting types
async function testMeetingTypes() {
  console.log('\n📋 Testing Different Meeting Types...\n');

  // First get available meeting types
  try {
    const typesResponse = await axios.get('http://localhost:3000/api/v1/hierarchical-meetings/meeting-types');
    if (typesResponse.data.success && typesResponse.data.data) {
      const meetingTypes = typesResponse.data.data;
      console.log('Available meeting types:');
      meetingTypes.forEach(type => {
        console.log(`   ${type.type_id}. ${type.type_name} (${type.hierarchy_level}) - ${type.is_active ? 'Active' : 'Inactive'}`);
      });

      // Test with first active meeting type
      const activeType = meetingTypes.find(type => type.is_active);
      if (activeType) {
        console.log(`\n🧪 Testing with meeting type ${activeType.type_id} (${activeType.type_name}):`);
        
        const testData = {
          title: `Test ${activeType.type_name}`,
          meeting_type_id: activeType.type_id,
          hierarchy_level: activeType.hierarchy_level,
          meeting_date: '2025-09-25',
          meeting_time: '10:00'
        };

        try {
          await axios.post('http://localhost:3000/api/v1/hierarchical-meetings', testData);
          console.log('   ✅ Success with matching meeting type and hierarchy level');
        } catch (error) {
          if (error.response?.status === 400) {
            const message = error.response.data.error?.message || error.response.data.message || '';
            console.log(`   ❌ Still failed: ${message}`);
          } else {
            console.log(`   ❓ Non-validation error: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to get meeting types:', error.message);
  }
}

async function runAllTests() {
  await testMinimalMeeting();
  await testHierarchyLevels();
  await testMeetingTypes();
  
  console.log('\n🏁 Testing Complete!');
  console.log('\n💡 Key Findings:');
  console.log('   • Check if meeting_type_id 4 is valid for the hierarchy_level being used');
  console.log('   • Verify that the meeting type exists and is active');
  console.log('   • Ensure hierarchy_level matches the meeting type\'s hierarchy_level');
  console.log('   • Check date and time formats are correct');
}

runAllTests().catch(console.error);
