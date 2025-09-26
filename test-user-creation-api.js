const axios = require('axios');

async function testUserCreationAPI() {
  try {
    console.log('🧪 Testing municipal admin user creation API...\n');
    
    // Test data that should create a municipal admin
    const testUserData = {
      name: 'Test Municipal Admin',
      email: 'test-municipal@example.com',
      password: 'TestPassword123!',
      admin_level: 'municipality',
      role_name: 'municipal_admin',
      province_code: 'LP',
      district_code: 'DC35',
      municipal_code: 'LIM354', // This should be captured
      ward_code: '',
      justification: 'Testing municipal admin creation bug fix'
    };
    
    console.log('📤 Sending API request with data:');
    console.log(JSON.stringify(testUserData, null, 2));
    
    // Make API call to create admin user
    const response = await axios.post('http://localhost:5000/api/v1/admin-management/create-admin', testUserData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoiYWRtaW5AbWVtYmVyc2hpcC5vcmciLCJyb2xlSWQiOjEsImlhdCI6MTcyNjMxNzI0MSwiZXhwIjoxNzI2MzIwODQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.user_id) {
      // Check if the user was created with the correct municipal_code
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root', 
        password: 'root',
        database: 'membership_new'
      });
      
      const [users] = await connection.execute(
        'SELECT id, name, email, admin_level, province_code, district_code, municipal_code, ward_code FROM users WHERE email = ?',
        ['test-municipal@example.com']
      );
      
      console.log('\n📋 Created user in database:');
      console.table(users);
      
      if (users.length > 0) {
        const user = users[0];
        if (user.municipal_code === 'LIM354') {
          console.log('\n✅ SUCCESS: Municipal code was correctly captured!');
        } else {
          console.log('\n❌ FAILURE: Municipal code was not captured correctly!');
          console.log(`   Expected: LIM354`);
          console.log(`   Actual: ${user.municipal_code || 'NULL'}`);
        }
      }
      
      // Clean up - delete the test user
      await connection.execute('DELETE FROM users WHERE email = ?', ['test-municipal@example.com']);
      console.log('\n🧹 Cleaned up test user');
      
      await connection.end();
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testUserCreationAPI();
