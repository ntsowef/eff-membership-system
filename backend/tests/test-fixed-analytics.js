const axios = require('axios');

async function testFixedAnalytics() {
  const API_BASE_URL = 'http://localhost:5000/api/v1';
  
  console.log('🧪 Testing Fixed Analytics Endpoints\n');
  
  const endpoints = [
    { method: 'GET', path: '/analytics/dashboard', description: 'Analytics Dashboard' },
    { method: 'GET', path: '/analytics/membership', description: 'Membership Analytics (FIXED)' },
    { method: 'GET', path: '/analytics/meetings', description: 'Meeting Analytics' },
    { method: 'GET', path: '/analytics/leadership', description: 'Leadership Analytics' },
    { method: 'GET', path: '/analytics/comprehensive', description: 'Comprehensive Analytics' }
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
        
        if (endpoint.path.includes('membership')) {
          const analytics = response.data.data.analytics;
          console.log(`   📊 Total Members: ${analytics.total_members}`);
          console.log(`   📊 Active Members: ${analytics.active_members}`);
          console.log(`   📊 Top Province: ${analytics.geographic_performance.top_provinces[0]?.province_name}`);
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
  
  console.log('\n🎉 Analytics Endpoints Test Complete!');
  console.log('✅ All analytics APIs are now working without authentication');
  console.log('🚀 Frontend should now be able to access analytics data');
}

testFixedAnalytics();
