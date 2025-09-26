const axios = require('axios');

async function testBackendServer() {
  try {
    console.log('🔍 Testing backend server connection...');
    
    // Test basic server health
    const healthResponse = await axios.get('http://localhost:5000/api/v1/health');
    console.log('✅ Backend server is running!');
    console.log('   Health status:', healthResponse.data);
    
    // Test membership applications endpoint
    console.log('\n📋 Testing membership applications endpoint...');
    const appsResponse = await axios.get('http://localhost:5000/api/v1/membership-applications');
    console.log('✅ Applications endpoint working!');
    console.log(`   Found ${appsResponse.data.applications?.length || 0} applications`);
    
    // Test specific application detail
    if (appsResponse.data.applications && appsResponse.data.applications.length > 0) {
      const firstApp = appsResponse.data.applications[0];
      console.log(`\n🔍 Testing application detail for ID: ${firstApp.id}`);
      
      const detailResponse = await axios.get(`http://localhost:5000/api/v1/membership-applications/${firstApp.id}`);
      console.log('✅ Application detail endpoint working!');
      console.log(`   Application: ${detailResponse.data.application?.first_name} ${detailResponse.data.application?.last_name}`);
      console.log(`   Status: ${detailResponse.data.application?.status}`);
    }
    
    console.log('\n🎉 Backend server is fully functional and ready for frontend integration!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running on port 5000');
      console.log('   Please start the backend server with: npm run dev');
    } else {
      console.error('❌ Backend server test failed:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
    }
  }
}

console.log('🚀 Starting backend server test...');
testBackendServer();
