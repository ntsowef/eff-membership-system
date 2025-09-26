const axios = require('axios');

async function testExistingAdmin() {
  try {
    console.log('🔍 Testing existing admin users...');
    
    // Try the existing admin users from the database
    const adminCredentials = [
      { email: 'admin@geomaps.local', password: 'admin123' },
      { email: 'admin@membership.org', password: 'admin123' },
      { email: 'admin@membership.org', password: 'Admin123!' },
      { email: 'gauteng.admin@membership.org', password: 'admin123' },
      { email: 'ntsowef@gmail.com', password: 'admin123' },
      { email: 'admin@geomaps.local', password: 'password' },
      { email: 'admin@membership.org', password: 'password' }
    ];
    
    let workingCredentials = null;
    let token = null;
    
    for (const cred of adminCredentials) {
      try {
        console.log(`   Trying: ${cred.email} with password: ${cred.password}`);
        const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', cred);
        
        console.log(`   ✅ SUCCESS! Working credentials found:`);
        console.log(`      Email: ${cred.email}`);
        console.log(`      Password: ${cred.password}`);
        console.log(`      Response:`, JSON.stringify(loginResponse.data, null, 2));

        // Extract token from response
        token = loginResponse.data.token || loginResponse.data.data?.token;
        if (token) {
          console.log(`      Token: ${token.substring(0, 20)}...`);
          workingCredentials = cred;
        } else {
          console.log(`      ❌ No token found in response`);
          continue;
        }
        break;
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }
    
    if (!workingCredentials) {
      console.log('\n❌ No working admin credentials found');
      return;
    }
    
    // Test authenticated API calls
    console.log('\n🔍 Testing authenticated API calls...');
    
    const authenticatedAxios = axios.create({
      baseURL: 'http://localhost:5000/api/v1',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Test applications endpoint
    const appsResponse = await authenticatedAxios.get('/membership-applications');
    console.log('✅ Applications endpoint working!');
    console.log(`   Found ${appsResponse.data.applications?.length || 0} applications`);
    
    if (appsResponse.data.applications && appsResponse.data.applications.length > 0) {
      const testApp = appsResponse.data.applications[0];
      console.log(`\n🔍 Testing application detail for ID: ${testApp.id}`);
      
      const detailResponse = await authenticatedAxios.get(`/membership-applications/${testApp.id}`);
      console.log('✅ Application detail endpoint working!');
      console.log(`   Application: ${detailResponse.data.application?.first_name} ${detailResponse.data.application?.last_name}`);
      
      console.log('\n🎉 AUTHENTICATION SUCCESSFUL!');
      console.log('🎯 Ready for frontend integration testing!');
      console.log(`   Use credentials: ${workingCredentials.email} / ${workingCredentials.password}`);
      
      // Update the frontend test file with working credentials
      console.log('\n📝 Updating frontend test with working credentials...');
      
      const fs = require('fs');
      const testFilePath = 'test/test-application-detail-frontend.js';
      let testFileContent = fs.readFileSync(testFilePath, 'utf8');
      
      // Replace the credentials array with the working one
      const newCredentialsArray = `const credentials = [
      { email: '${workingCredentials.email}', password: '${workingCredentials.password}' }
    ];`;
      
      testFileContent = testFileContent.replace(
        /const credentials = \[[\s\S]*?\];/,
        newCredentialsArray
      );
      
      fs.writeFileSync(testFilePath, testFileContent);
      console.log('✅ Frontend test file updated with working credentials!');
      
      return workingCredentials;
    }
    
  } catch (error) {
    console.error('❌ Admin test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

console.log('🚀 Starting existing admin test...');
testExistingAdmin();
