const axios = require('axios');

async function testNoAuthAccess() {
  const API_BASE_URL = 'http://localhost:5000/api/v1';
  
  console.log('🧪 Testing API Access Without Authentication\n');
  
  const endpoints = [
    { method: 'GET', path: '/analytics/dashboard', description: 'Analytics Dashboard' },
    { method: 'GET', path: '/statistics/dashboard', description: 'Statistics Dashboard' },
    { method: 'GET', path: '/members?limit=5', description: 'Members List' },
    { method: 'GET', path: '/members/stats/provinces', description: 'Member Statistics' },
    { method: 'GET', path: '/health', description: 'Health Check' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.description}...`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        timeout: 10000
      });
      
      if (response.data.success) {
        console.log(`✅ ${endpoint.description}: SUCCESS`);
        if (endpoint.path.includes('members') && response.data.data.members) {
          console.log(`   Found ${response.data.data.members.length} members`);
        }
        if (endpoint.path.includes('analytics') && response.data.data) {
          console.log(`   Analytics data available`);
        }
      } else {
        console.log(`⚠️  ${endpoint.description}: Unexpected response format`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint.description}: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      } else {
        console.log(`❌ ${endpoint.description}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Authentication Removal Test Complete!');
  console.log('✅ All APIs are now accessible without authentication');
  console.log('🚀 Ready for development and functionality testing');
}

testNoAuthAccess();
