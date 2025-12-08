const axios = require('axios');

async function testIECAPI() {
  console.log('🧪 Testing IEC API Direct Call');
  console.log('=' .repeat(80));
  
  try {
    const response = await axios.post('http://localhost:5000/api/v1/iec/verify', {
      id_number: '7808020703087'
    });
    
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('\n📊 IEC Verification Data:');
      console.log('-'.repeat(80));
      console.log(`ID Number: ${data.id_number}`);
      console.log(`Registered: ${data.is_registered}`);
      console.log(`Status: ${data.voter_status}`);
      console.log('\n🗺️ Geographic Data:');
      console.log(`  Province ID: ${data.province_id}`);
      console.log(`  Province: ${data.province}`);
      console.log(`  Province Code: ${data.province_code || '❌ NOT MAPPED'}`);
      console.log(`  Municipality ID: ${data.municipality_id}`);
      console.log(`  Municipality: ${data.municipality}`);
      console.log(`  Municipality Code: ${data.municipality_code || '❌ NOT MAPPED'}`);
      console.log(`  District Code: ${data.district_code || '❌ NOT MAPPED'}`);
      console.log(`  Ward ID: ${data.ward_id}`);
      console.log(`  Ward Code: ${data.ward_code || '❌ NOT MAPPED'}`);
      console.log(`  VD Number: ${data.vd_number}`);
      console.log(`  Voting District Code: ${data.voting_district_code || '❌ NOT MAPPED'}`);
      console.log(`  Voting Station: ${data.voting_station_name}`);
      console.log(`  Address: ${data.voting_station_address}`);
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 MAPPING SUMMARY:');
      console.log('='.repeat(80));
      console.log(`Province:        ${data.province_code ? '✅ MAPPED' : '❌ NOT MAPPED'}`);
      console.log(`District:        ${data.district_code ? '✅ MAPPED' : '❌ NOT MAPPED'}`);
      console.log(`Municipality:    ${data.municipality_code ? '✅ MAPPED' : '❌ NOT MAPPED'}`);
      console.log(`Ward:            ${data.ward_code ? '✅ MAPPED' : '❌ NOT MAPPED'}`);
      console.log(`Voting District: ${data.voting_district_code ? '✅ MAPPED' : '❌ NOT MAPPED'}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response ? error.response.data : error.message);
  }
}

testIECAPI();

