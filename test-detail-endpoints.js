const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1/audit/ward-membership';

async function testDetailEndpoints() {
  console.log('🧪 Testing Ward Membership Audit Detail Endpoints...\n');

  try {
    // Test 1: Get a sample ward code from the main API
    console.log('1️⃣ Getting sample ward data...');
    const wardsResponse = await axios.get(`${BASE_URL}/wards?limit=1`);
    
    if (!wardsResponse.data.success || !wardsResponse.data.data.wards.length) {
      console.log('❌ No ward data available for testing');
      return;
    }

    const sampleWard = wardsResponse.data.data.wards[0];
    console.log(`✅ Sample ward: ${sampleWard.ward_name} (${sampleWard.ward_code})`);

    // Test 2: Test ward details endpoint
    console.log('\n2️⃣ Testing ward details endpoint...');
    try {
      const wardDetailsResponse = await axios.get(`${BASE_URL}/ward/${sampleWard.ward_code}/details`);
      
      if (wardDetailsResponse.data.success) {
        const wardDetails = wardDetailsResponse.data.data;
        console.log('✅ Ward details retrieved successfully!');
        console.log(`   Ward: ${wardDetails.ward_info.ward_name}`);
        console.log(`   Municipality: ${wardDetails.ward_info.municipality_name}`);
        console.log(`   Active Members: ${wardDetails.ward_info.active_members}`);
        console.log(`   Standing: ${wardDetails.ward_info.ward_standing}`);
        console.log(`   Historical Trends: ${wardDetails.historical_trends.length} months`);
        console.log(`   Municipality Comparison: ${wardDetails.municipality_comparison.length} wards`);
        console.log(`   Recommendations: ${wardDetails.recommendations.length} items`);
      } else {
        console.log('❌ Ward details request failed:', wardDetailsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Ward details endpoint error:', error.response?.data?.message || error.message);
    }

    // Test 3: Get a sample municipality code
    console.log('\n3️⃣ Getting sample municipality data...');
    const municipalitiesResponse = await axios.get(`${BASE_URL}/municipalities?limit=1`);
    
    if (!municipalitiesResponse.data.success || !municipalitiesResponse.data.data.municipalities.length) {
      console.log('❌ No municipality data available for testing');
      return;
    }

    const sampleMunicipality = municipalitiesResponse.data.data.municipalities[0];
    console.log(`✅ Sample municipality: ${sampleMunicipality.municipality_name} (${sampleMunicipality.municipality_code})`);

    // Test 4: Test municipality details endpoint
    console.log('\n4️⃣ Testing municipality details endpoint...');
    try {
      const municipalityDetailsResponse = await axios.get(`${BASE_URL}/municipality/${sampleMunicipality.municipality_code}/details`);
      
      if (municipalityDetailsResponse.data.success) {
        const municipalityDetails = municipalityDetailsResponse.data.data;
        console.log('✅ Municipality details retrieved successfully!');
        console.log(`   Municipality: ${municipalityDetails.municipality_info.municipality_name}`);
        console.log(`   District: ${municipalityDetails.municipality_info.district_name}`);
        console.log(`   Total Wards: ${municipalityDetails.municipality_info.total_wards}`);
        console.log(`   Compliance: ${municipalityDetails.municipality_info.compliance_percentage}%`);
        console.log(`   Performance: ${municipalityDetails.municipality_info.municipality_performance}`);
        console.log(`   Ward Breakdown: ${municipalityDetails.wards_breakdown.length} wards`);
        console.log(`   Historical Trends: ${municipalityDetails.historical_trends.length} months`);
        console.log(`   Recommendations: ${municipalityDetails.recommendations.length} items`);
      } else {
        console.log('❌ Municipality details request failed:', municipalityDetailsResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Municipality details endpoint error:', error.response?.data?.message || error.message);
    }

    // Test 5: Test error handling with invalid codes
    console.log('\n5️⃣ Testing error handling...');
    try {
      await axios.get(`${BASE_URL}/ward/INVALID_CODE/details`);
      console.log('❌ Should have returned 404 for invalid ward code');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for invalid ward code');
      } else {
        console.log('❌ Unexpected error for invalid ward code:', error.response?.status);
      }
    }

    try {
      await axios.get(`${BASE_URL}/municipality/INVALID_CODE/details`);
      console.log('❌ Should have returned 404 for invalid municipality code');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for invalid municipality code');
      } else {
        console.log('❌ Unexpected error for invalid municipality code:', error.response?.status);
      }
    }

    console.log('\n🎉 Detail endpoints testing complete!');

  } catch (error) {
    console.error('❌ Error testing detail endpoints:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5000');
    }
  }
}

// Run the test
testDetailEndpoints();
