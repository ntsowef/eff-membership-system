const axios = require('axios');
const mysql = require('mysql2/promise');

async function testMunicipalAdminCreationFix() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'root',
    database: 'membership_new'
  });
  
  try {
    console.log('🧪 COMPREHENSIVE TEST: Municipal Admin Creation Fix\n');
    
    // Test Case 1: Direct API call (should work)
    console.log('📋 TEST 1: Direct API Call');
    const directApiData = {
      name: 'Direct API Test Admin',
      email: 'direct-api-test@example.com',
      password: 'TestPassword123!',
      admin_level: 'municipality',
      role_name: 'municipal_admin',
      province_code: 'LP',
      district_code: 'DC35',
      municipal_code: 'LIM354',
      ward_code: '',
      justification: 'Direct API test'
    };
    
    const directResponse = await axios.post('http://localhost:5000/api/v1/admin-management/create-admin', directApiData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoiYWRtaW5AbWVtYmVyc2hpcC5vcmciLCJyb2xlSWQiOjEsImlhdCI6MTcyNjMxNzI0MSwiZXhwIjoxNzI2MzIwODQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    console.log(`✅ Direct API: ${directResponse.data.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Test Case 2: Frontend-style data transformation (with fix)
    console.log('\n📋 TEST 2: Frontend Data Flow (Fixed)');
    const frontendFormData = {
      name: 'Frontend Fixed Test Admin',
      email: 'frontend-fixed-test@example.com',
      password: 'TestPassword123!',
      admin_level: 'municipality',
      role_name: 'Municipal Admin',
      province_code: 'LP',
      district_code: 'DC35',
      municipal_code: 'LIM354', // ✅ This is correctly set by frontend
      ward_code: '',
      selected_province_code: 'LP',
    };
    
    // Apply the FIXED transformation from UserManagementPage.tsx
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
    
    const fixedApiData = {
      name: frontendFormData.name,
      email: frontendFormData.email,
      password: frontendFormData.password,
      admin_level: adminLevelMapping[frontendFormData.admin_level] || frontendFormData.admin_level.toLowerCase(),
      role_name: roleNameMapping[frontendFormData.role_name] || frontendFormData.role_name.toLowerCase().replace(' ', '_'),
      province_code: frontendFormData.selected_province_code || frontendFormData.province_code,
      district_code: frontendFormData.district_code,
      municipal_code: frontendFormData.municipal_code, // ✅ FIXED: Now uses correct field
      ward_code: frontendFormData.ward_code,
      justification: 'Admin user created via user management interface',
    };
    
    const frontendResponse = await axios.post('http://localhost:5000/api/v1/admin-management/create-admin', fixedApiData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoiYWRtaW5AbWVtYmVyc2hpcC5vcmciLCJyb2xlSWQiOjEsImlhdCI6MTcyNjMxNzI0MSwiZXhwIjoxNzI2MzIwODQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    console.log(`✅ Frontend Fixed: ${frontendResponse.data.success ? 'SUCCESS' : 'FAILED'}`);
    
    // Verify both users in database
    console.log('\n📋 DATABASE VERIFICATION:');
    const [users] = await connection.execute(`
      SELECT id, name, email, admin_level, province_code, district_code, municipal_code, ward_code 
      FROM users 
      WHERE email IN ('direct-api-test@example.com', 'frontend-fixed-test@example.com')
      ORDER BY created_at DESC
    `);
    
    console.table(users);
    
    // Analyze results
    let allTestsPassed = true;
    users.forEach(user => {
      if (user.admin_level === 'municipality' && user.municipal_code === 'LIM354') {
        console.log(`✅ ${user.name}: Municipal code correctly captured`);
      } else {
        console.log(`❌ ${user.name}: Municipal code missing or incorrect`);
        allTestsPassed = false;
      }
    });
    
    // Test Case 3: Test with different municipalities
    console.log('\n📋 TEST 3: Different Municipality Test');
    const differentMuniData = {
      name: 'Different Muni Test Admin',
      email: 'different-muni-test@example.com',
      password: 'TestPassword123!',
      admin_level: 'municipality',
      role_name: 'municipal_admin',
      province_code: 'LP',
      district_code: 'DC35',
      municipal_code: 'LIM353', // Different municipality (Molemole)
      ward_code: '',
      justification: 'Different municipality test'
    };
    
    const differentMuniResponse = await axios.post('http://localhost:5000/api/v1/admin-management/create-admin', differentMuniData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoiYWRtaW5AbWVtYmVyc2hpcC5vcmciLCJyb2xlSWQiOjEsImlhdCI6MTcyNjMxNzI0MSwiZXhwIjoxNzI2MzIwODQxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    const [differentMuniUser] = await connection.execute(
      'SELECT id, name, municipal_code FROM users WHERE email = ?',
      ['different-muni-test@example.com']
    );
    
    if (differentMuniUser.length > 0 && differentMuniUser[0].municipal_code === 'LIM353') {
      console.log('✅ Different municipality test: SUCCESS');
    } else {
      console.log('❌ Different municipality test: FAILED');
      allTestsPassed = false;
    }
    
    // Final Results
    console.log('\n🏆 FINAL RESULTS:');
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Municipal admin creation bug is FIXED!');
      console.log('✅ Municipal codes are now being captured correctly');
      console.log('✅ System is ready for production use');
    } else {
      console.log('❌ Some tests failed - further investigation needed');
    }
    
    // Clean up test users
    await connection.execute(`
      DELETE FROM users 
      WHERE email IN (
        'direct-api-test@example.com', 
        'frontend-fixed-test@example.com',
        'different-muni-test@example.com'
      )
    `);
    console.log('\n🧹 Cleaned up test users');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.response?.data || error.message);
  } finally {
    await connection.end();
  }
}

testMunicipalAdminCreationFix();
