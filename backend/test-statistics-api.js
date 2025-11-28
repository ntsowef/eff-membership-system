const axios = require('axios');

async function testStatisticsAPI() {
  console.log('🧪 Testing Statistics API with boolean conversion fix...\n');

  const baseURL = 'http://localhost:5000/api/v1';
  
  try {
    // Test the top-wards endpoint that was failing
    console.log('1. Testing top-wards endpoint...');
    
    const response = await axios.get(`${baseURL}/statistics/top-wards`, {
      timeout: 10000,
      params: {
        province_code: 'WC',
        limit: 5
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Top-wards API call successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Response structure:`);
    
    const data = response.data;
    console.log(`- Success: ${data.success}`);
    console.log(`- Data count: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\nTop wards in WC:');
      data.data.forEach((ward, index) => {
        console.log(`${index + 1}. ${ward.ward_name} (${ward.ward_code}) - ${ward.member_count} members, ${ward.active_members} active (${ward.active_percentage}%)`);
      });
    }

    // Test with different provinces
    console.log('\n2. Testing with different provinces...');
    
    const provinces = ['GP', 'KZN', 'EC'];
    
    for (const province of provinces) {
      try {
        const provinceResponse = await axios.get(`${baseURL}/statistics/top-wards`, {
          timeout: 5000,
          params: {
            province_code: province,
            limit: 3
          }
        });
        
        console.log(`✅ ${province}: ${provinceResponse.data.data?.length || 0} wards returned`);
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  ${province}: ${error.response.status} - ${error.response.data.message || error.message}`);
        } else {
          console.log(`❌ ${province}: ${error.message}`);
        }
      }
    }

    // Test with different limits
    console.log('\n3. Testing with different limits...');
    
    const limits = [1, 10, 20];
    
    for (const limit of limits) {
      try {
        const limitResponse = await axios.get(`${baseURL}/statistics/top-wards`, {
          timeout: 5000,
          params: {
            province_code: 'GP',
            limit: limit
          }
        });
        
        console.log(`✅ Limit ${limit}: ${limitResponse.data.data?.length || 0} wards returned`);
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  Limit ${limit}: ${error.response.status} - ${error.response.data.message || error.message}`);
        } else {
          console.log(`❌ Limit ${limit}: ${error.message}`);
        }
      }
    }

    // Test error handling with invalid province
    console.log('\n4. Testing error handling with invalid province...');
    
    try {
      const invalidResponse = await axios.get(`${baseURL}/statistics/top-wards`, {
        timeout: 5000,
        params: {
          province_code: 'INVALID',
          limit: 5
        }
      });
      console.log('⚠️  Invalid province unexpectedly succeeded');
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        console.log('✅ Invalid province correctly handled');
      } else {
        console.log(`⚠️  Invalid province returned: ${error.response?.status || error.message}`);
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

testStatisticsAPI().catch(console.error);
