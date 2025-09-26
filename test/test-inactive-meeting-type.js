const mysql = require('mysql2/promise');

async function testInactiveMeetingType() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('🔧 Testing inactive meeting type validation...');
    
    // First, deactivate a meeting type temporarily
    console.log('1. Deactivating meeting type ID 2 (National People\'s Assembly)...');
    await connection.execute(
      'UPDATE meeting_types SET is_active = FALSE WHERE type_id = 2'
    );
    
    // Test creating a meeting with the inactive meeting type
    console.log('2. Testing meeting creation with inactive meeting type...');
    const testData = {
      meeting_type_id: 2,
      title: "Test Inactive Meeting Type",
      description: "Testing validation with inactive meeting type",
      meeting_date: "2024-12-31",
      meeting_time: "10:00:00",
      location: "Test Location - National HQ",
      hierarchy_level: "National",
      entity_type: "National",
      entity_id: 1,
      auto_send_invitations: false
    };
    
    // Make API call to test validation
    const response = await fetch('http://localhost:5000/api/v1/hierarchical-meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('❌ ERROR: Meeting creation should have failed with inactive meeting type');
      console.log('Response:', result);
    } else {
      console.log('✅ SUCCESS: Meeting creation correctly failed with inactive meeting type');
      console.log('Error message:', result.error?.message || 'No error message');
    }
    
    // Reactivate the meeting type
    console.log('3. Reactivating meeting type ID 2...');
    await connection.execute(
      'UPDATE meeting_types SET is_active = TRUE WHERE type_id = 2'
    );
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await connection.end();
  }
}

testInactiveMeetingType();
