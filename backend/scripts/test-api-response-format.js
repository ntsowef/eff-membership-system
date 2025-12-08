const axios = require('axios');

async function testApiResponse() {
  try {
    console.log('🔍 Testing API response format for voting districts...\n');
    
    const response = await axios.get('http://localhost:5000/api/v1/members/stats/voting-districts?ward=19100100');
    
    console.log('📊 Full Response Structure:');
    console.log('- Status:', response.status);
    console.log('- response.data type:', typeof response.data);
    console.log('- response.data keys:', Object.keys(response.data));
    console.log('- response.data.success:', response.data.success);
    console.log('- response.data.data type:', typeof response.data.data);
    console.log('- response.data.data keys:', response.data.data ? Object.keys(response.data.data) : 'N/A');
    console.log('- response.data.data.data is array:', Array.isArray(response.data.data?.data));
    console.log('- response.data.data.data length:', response.data.data?.data?.length);
    
    console.log('\n📝 First voting district:');
    if (response.data.data?.data?.[0]) {
      console.log(JSON.stringify(response.data.data.data[0], null, 2));
    }
    
    console.log('\n🔄 Simulating apiGet extraction:');
    // This is what apiGet does (lines 132-135 in frontend/src/lib/api.ts)
    let extracted;
    if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
      extracted = response.data.data;
      console.log('✅ apiGet would extract: response.data.data');
    } else {
      extracted = response.data;
      console.log('❌ apiGet would return: response.data');
    }
    
    console.log('- Extracted type:', typeof extracted);
    console.log('- Extracted keys:', extracted ? Object.keys(extracted) : 'N/A');
    console.log('- extracted.data is array:', Array.isArray(extracted?.data));
    console.log('- extracted.data length:', extracted?.data?.length);
    
    console.log('\n🎯 Frontend would access:');
    console.log('- result?.data?.data would be:', Array.isArray(extracted?.data) ? `array with ${extracted.data.length} items` : typeof extracted?.data);
    
    if (Array.isArray(extracted?.data)) {
      console.log('\n✅ SUCCESS: Frontend can access the array via result.data');
      console.log('First item:', JSON.stringify(extracted.data[0], null, 2));
    } else if (Array.isArray(extracted)) {
      console.log('\n⚠️  WARNING: extracted is already an array, frontend should use result directly');
    } else {
      console.log('\n❌ ERROR: Cannot find array in expected location');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApiResponse();

