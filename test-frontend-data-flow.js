const axios = require('axios');

async function testFrontendDataFlow() {
  try {
    console.log('🔍 Testing frontend data transformation flow...\n');
    
    // Simulate the data as it would come from CreateUserDialog
    const frontendFormData = {
      name: 'Frontend Test Admin',
      email: 'frontend-test@example.com',
      password: 'TestPassword123!',
      admin_level: 'municipality', // This gets transformed
      role_name: 'Municipal Admin', // This gets transformed
      province_code: 'LP',
      district_code: 'DC35',
      municipal_code: 'LIM354', // This is the key field we're testing
      ward_code: '',
      selected_province_code: 'LP',
      selected_province_name: 'Limpopo',
      is_existing_user_promotion: false,
      promote_existing_member: false,
    };
    
    console.log('📋 Frontend form data:');
    console.log(JSON.stringify(frontendFormData, null, 2));
    
    // Simulate the transformation that happens in UserManagementPage.tsx
    const adminLevelMapping = {
      'National': 'national',
      'Provincial': 'province', 
      'District': 'district',
      'Municipal': 'municipality',
      'Ward': 'ward'
    };
    
    const roleNameMapping = {
      'National Admin': 'national_admin',
      'Provincial Admin': 'provincial_admin',
      'District Admin': 'district_admin', 
      'Municipal Admin': 'municipal_admin',
      'Ward Admin': 'ward_admin'
    };
    
    // Transform the data exactly like UserManagementPage does
    const apiData = {
      name: frontendFormData.name,
      email: frontendFormData.email,
      password: frontendFormData.password,
      admin_level: adminLevelMapping[frontendFormData.admin_level] || frontendFormData.admin_level.toLowerCase(),
      role_name: roleNameMapping[frontendFormData.role_name] || frontendFormData.role_name.toLowerCase().replace(' ', '_'),
      province_code: frontendFormData.selected_province_code || frontendFormData.province_code,
      district_code: frontendFormData.district_code,
      municipal_code: frontendFormData.municipality_code, // ❌ This is the bug! Should be municipal_code
      ward_code: frontendFormData.ward_code,
      justification: `Admin user created via user management interface`,
    };
    
    console.log('\n📤 Transformed API data (with bug):');
    console.log(JSON.stringify(apiData, null, 2));
    
    // Show the bug
    console.log('\n🐛 BUG IDENTIFIED:');
    console.log(`   Frontend sets: municipal_code = "${frontendFormData.municipal_code}"`);
    console.log(`   But API data gets: municipality_code = "${apiData.municipal_code}" (undefined!)`);
    console.log(`   Should be: municipal_code = "${frontendFormData.municipal_code}"`);
    
    // Show the correct transformation
    const correctedApiData = {
      ...apiData,
      municipal_code: frontendFormData.municipal_code, // ✅ Fixed
    };
    delete correctedApiData.municipality_code; // Remove the undefined field
    
    console.log('\n✅ Corrected API data:');
    console.log(JSON.stringify(correctedApiData, null, 2));
    
    // Test the corrected API call
    console.log('\n🧪 Testing corrected API call...');
    const response = await axios.post('http://localhost:5000/api/v1/admin-management/create-admin', correctedApiData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoiYWRtaW5AbWVtYmVyc2hpcC5vcmciLCJyb2xlSWQiOjEsImlhdCI6MTcyNjMxNzI0MSwiZXhwIjoxNzI2MzIwODQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Verify in database
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: 'root',
      database: 'membership_new'
    });
    
    const [users] = await connection.execute(
      'SELECT id, name, email, admin_level, province_code, district_code, municipal_code, ward_code FROM users WHERE email = ?',
      ['frontend-test@example.com']
    );
    
    console.log('\n📋 Created user in database:');
    console.table(users);
    
    // Clean up
    await connection.execute('DELETE FROM users WHERE email = ?', ['frontend-test@example.com']);
    console.log('\n🧹 Cleaned up test user');
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFrontendDataFlow();
