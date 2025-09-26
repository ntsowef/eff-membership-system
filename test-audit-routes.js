// Simple test to verify audit routes are working
const axios = require('axios');

async function testAuditRoutes() {
  console.log('🔍 Testing Member Audit Routes...\n');
  
  const baseURL = 'http://localhost:5000/api/v1';
  
  const routes = [
    '/audit/overview',
    '/audit/members?limit=5',
    '/audit/wards?limit=5',
    '/audit/municipalities?limit=5'
  ];
  
  for (const route of routes) {
    try {
      console.log(`Testing: ${baseURL}${route}`);
      const response = await axios.get(`${baseURL}${route}`, {
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500; // Accept any status code less than 500
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${route}: SUCCESS (200)`);
        if (response.data && response.data.success !== false) {
          console.log(`   Data: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } else if (response.status === 404) {
        console.log(`❌ ${route}: NOT FOUND (404) - Route not registered`);
      } else {
        console.log(`⚠️  ${route}: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${route}: Backend server not running`);
      } else if (error.response && error.response.status === 404) {
        console.log(`❌ ${route}: NOT FOUND (404) - Route not registered`);
      } else {
        console.log(`❌ ${route}: ERROR - ${error.message}`);
      }
    }
    console.log('');
  }
  
  // Test health endpoint to verify server is running
  try {
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    if (healthResponse.status === 200) {
      console.log('✅ Backend server is running and healthy');
    }
  } catch (error) {
    console.log('❌ Backend server health check failed:', error.message);
  }
}

testAuditRoutes().catch(console.error);
