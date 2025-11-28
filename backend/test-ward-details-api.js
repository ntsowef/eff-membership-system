const axios = require('axios');

async function testWardDetailsAPI() {
  console.log('🧪 Testing Ward Details API endpoint...\n');

  const baseURL = 'http://localhost:5000/api/v1';
  
  try {
    // Test the ward details endpoint that was failing
    console.log('1. Testing ward details endpoint...');
    
    const testWardCode = '21507034';
    const response = await axios.get(`${baseURL}/audit/ward-membership/ward/${testWardCode}/details`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Ward details API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Response structure:`);
    
    const data = response.data;
    console.log(`- Success: ${data.success}`);
    console.log(`- Message: ${data.message}`);
    
    if (data.data && data.data.ward_info) {
      const ward = data.data.ward_info;
      console.log(`- Ward: ${ward.ward_name} (${ward.ward_code})`);
      console.log(`- Municipality: ${ward.municipality_name}`);
      console.log(`- Province: ${ward.province_name}`);
      console.log(`- Active Members: ${ward.active_members}`);
      console.log(`- Ward Standing: ${ward.ward_standing}`);
      console.log(`- Target Achievement: ${ward.target_achievement_percentage}%`);
    }

    if (data.data && data.data.trends) {
      console.log(`- Trends Data: ${data.data.trends.length} records`);
    }

    if (data.data && data.data.municipality_comparison) {
      console.log(`- Municipality Comparison: ${data.data.municipality_comparison.length} wards`);
    }

    if (data.data && data.data.recommendations) {
      console.log(`- Recommendations: ${data.data.recommendations.length} items`);
    }

    // Test with different ward codes
    console.log('\n2. Testing with multiple ward codes...');
    
    const testWardCodes = ['21507034', '21507035', '21507036'];
    
    for (const wardCode of testWardCodes) {
      try {
        const wardResponse = await axios.get(`${baseURL}/audit/ward-membership/ward/${wardCode}/details`, {
          timeout: 5000
        });
        
        const wardData = wardResponse.data.data.ward_info;
        console.log(`✅ Ward ${wardCode}: ${wardData.ward_name} - ${wardData.active_members} members`);
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  Ward ${wardCode}: ${error.response.status} - ${error.response.data.message || error.message}`);
        } else {
          console.log(`❌ Ward ${wardCode}: ${error.message}`);
        }
      }
    }

    // Test error handling with invalid ward code
    console.log('\n3. Testing error handling with invalid ward code...');
    
    try {
      const invalidResponse = await axios.get(`${baseURL}/audit/ward-membership/ward/INVALID123/details`, {
        timeout: 5000
      });
      console.log('❌ Invalid ward code unexpectedly succeeded');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Invalid ward code correctly returned 404');
      } else {
        console.log(`⚠️  Invalid ward code returned: ${error.response?.status || error.message}`);
      }
    }

    // Test the trends endpoint that was also mentioned in the error
    console.log('\n4. Testing trends endpoint...');
    
    try {
      const trendsResponse = await axios.get(`${baseURL}/audit/ward-membership/trends`, {
        timeout: 5000,
        params: {
          ward_code: testWardCode,
          months: 12
        }
      });
      
      console.log('✅ Trends endpoint successful!');
      console.log(`Status: ${trendsResponse.status}`);
      console.log(`Trends data: ${trendsResponse.data.data?.trends?.length || 0} records`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  Trends endpoint: ${error.response.status} - ${error.response.data.message || error.message}`);
      } else {
        console.log(`❌ Trends endpoint: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testWardDetailsAPI().catch(console.error);
