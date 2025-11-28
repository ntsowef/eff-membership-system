const axios = require('axios');

async function testAdminStatisticsAPI() {
  console.log('🔧 Testing Admin Statistics API after boolean conversion fix...\n');

  try {
    // Test the admin statistics endpoint that was failing
    console.log('1. Testing admin statistics endpoint...');
    const response = await axios.get('http://localhost:5000/api/v1/admin-management/statistics');
    
    console.log('✅ SUCCESS: Admin statistics API working!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ FAILED: Admin statistics API still failing');
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.message?.includes('boolean = integer')) {
      console.log('\n🚨 BOOLEAN CONVERSION ISSUE STILL EXISTS!');
      console.log('The server is still not using the updated SQL Migration Service.');
    }
  }

  try {
    // Test the members with voting districts endpoint
    console.log('\n2. Testing members with voting districts endpoint...');
    const response = await axios.get('http://localhost:5000/api/v1/views/members-with-voting-districts?search=750116&limit=100');
    
    console.log('✅ SUCCESS: Members with voting districts API working!');
    console.log('Response status:', response.status);
    console.log('Number of results:', response.data?.length || 0);
    
  } catch (error) {
    console.log('❌ FAILED: Members with voting districts API still failing');
    console.log('Error:', error.response?.data || error.message);
  }

  console.log('\n🎯 ADMIN STATISTICS API TEST COMPLETE!');
}

testAdminStatisticsAPI().catch(console.error);
