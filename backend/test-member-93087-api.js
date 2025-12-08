/**
 * Test member 93087 API response to verify province data
 */

const http = require('http');

function testMemberAPI() {
  console.log('🧪 Testing member API for member 93087...\n');
  
  // Test 1: Get member by ID number
  console.log('📋 Test 1: GET /api/v1/members/by-id-number/8001015009087');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/members/by-id-number/8001015009087',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        console.log('\n✅ Response received:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.data) {
          console.log('\n📊 Member Data:');
          console.log(`  - member_id: ${response.data.member_id}`);
          console.log(`  - first_name: ${response.data.first_name}`);
          console.log(`  - last_name: ${response.data.last_name}`);
          console.log(`  - province_name: ${response.data.province_name || 'NULL ❌'}`);
          console.log(`  - municipality_name: ${response.data.municipality_name}`);
          console.log(`  - ward_number: ${response.data.ward_number}`);
          console.log(`  - voting_station_name: ${response.data.voting_station_name}`);
          
          if (response.data.province_name) {
            console.log('\n✅ SUCCESS: Province data is present!');
          } else {
            console.log('\n❌ FAILURE: Province data is still NULL!');
          }
        }
      } else {
        console.log(`\n❌ Error: ${res.statusCode}`);
        console.log(data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request failed:', error);
  });
  
  req.end();
}

// Wait a moment for backend to be ready
setTimeout(() => {
  testMemberAPI();
}, 1000);

