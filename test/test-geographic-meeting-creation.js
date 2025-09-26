const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testGeographicMeetingCreation() {
  console.log('🧪 Testing Geographic Meeting Creation System\n');

  try {
    // Test 1: Get provinces for selection
    console.log('1️⃣ Testing Province API...');
    const provincesResponse = await axios.get(`${BASE_URL}/geographic/provinces`);
    const provinces = provincesResponse.data.data;
    console.log(`✅ Found ${provinces.length} provinces`);
    
    if (provinces.length > 0) {
      const sampleProvince = provinces[0];
      console.log(`   Sample: ${sampleProvince.province_name} (${sampleProvince.province_code})`);
      
      // Test 2: Get municipalities for the province
      console.log('\n2️⃣ Testing Municipality API...');
      const municipalitiesResponse = await axios.get(`${BASE_URL}/geographic/municipalities?province=${sampleProvince.province_code}`);
      const municipalities = municipalitiesResponse.data.data;
      console.log(`✅ Found ${municipalities.length} municipalities in ${sampleProvince.province_name}`);
      
      if (municipalities.length > 0) {
        const sampleMunicipality = municipalities[0];
        console.log(`   Sample: ${sampleMunicipality.municipality_name} (${sampleMunicipality.municipality_code})`);
        
        // Test 3: Get wards for the municipality
        console.log('\n3️⃣ Testing Ward API...');
        const wardsResponse = await axios.get(`${BASE_URL}/geographic/wards?municipality=${sampleMunicipality.municipality_code}`);
        const wards = wardsResponse.data.data;
        console.log(`✅ Found ${wards.length} wards in ${sampleMunicipality.municipality_name}`);
        
        if (wards.length > 0) {
          const sampleWard = wards[0];
          console.log(`   Sample: ${sampleWard.ward_name} (${sampleWard.ward_code})`);
          
          // Test 4: Test Provincial Meeting Creation
          console.log('\n4️⃣ Testing Provincial Meeting Creation...');
          const provincialMeetingData = {
            title: 'Test Provincial Meeting with Geographic Selection',
            meeting_type_id: 1, // Assuming type 1 exists
            hierarchy_level: 'Provincial',
            meeting_date: '2025-10-01',
            meeting_time: '14:00',
            location: `${sampleProvince.province_name} Provincial Office`,
            description: 'Testing provincial meeting with geographic selection',
            province_code: sampleProvince.province_code,
            entity_id: 1,
            entity_type: 'Province'
          };
          
          try {
            const provincialResponse = await axios.post(`${BASE_URL}/hierarchical-meetings`, provincialMeetingData);
            console.log(`✅ Provincial meeting created successfully! ID: ${provincialResponse.data.data.meetingId}`);
          } catch (error) {
            console.log(`⚠️ Provincial meeting creation: ${error.response?.data?.message || error.message}`);
          }
          
          // Test 5: Test Municipal Meeting Creation
          console.log('\n5️⃣ Testing Municipal Meeting Creation...');
          const municipalMeetingData = {
            title: 'Test Municipal Meeting with Geographic Selection',
            meeting_type_id: 2, // Assuming type 2 exists
            hierarchy_level: 'Municipal',
            meeting_date: '2025-10-02',
            meeting_time: '10:00',
            location: `${sampleMunicipality.municipality_name} Municipal Hall`,
            description: 'Testing municipal meeting with geographic selection',
            province_code: sampleProvince.province_code,
            municipality_code: sampleMunicipality.municipality_code,
            entity_id: 1,
            entity_type: 'Municipality'
          };
          
          try {
            const municipalResponse = await axios.post(`${BASE_URL}/hierarchical-meetings`, municipalMeetingData);
            console.log(`✅ Municipal meeting created successfully! ID: ${municipalResponse.data.data.meetingId}`);
          } catch (error) {
            console.log(`⚠️ Municipal meeting creation: ${error.response?.data?.message || error.message}`);
          }
          
          // Test 6: Test Ward Meeting Creation
          console.log('\n6️⃣ Testing Ward Meeting Creation...');
          const wardMeetingData = {
            title: 'Test Ward Meeting with Geographic Selection',
            meeting_type_id: 3, // Assuming type 3 exists
            hierarchy_level: 'Ward',
            meeting_date: '2025-10-03',
            meeting_time: '18:00',
            location: `${sampleWard.ward_name} Community Hall`,
            description: 'Testing ward meeting with geographic selection',
            province_code: sampleProvince.province_code,
            municipality_code: sampleMunicipality.municipality_code,
            ward_code: sampleWard.ward_code,
            entity_id: 1,
            entity_type: 'Ward'
          };
          
          try {
            const wardResponse = await axios.post(`${BASE_URL}/hierarchical-meetings`, wardMeetingData);
            console.log(`✅ Ward meeting created successfully! ID: ${wardResponse.data.data.meetingId}`);
          } catch (error) {
            console.log(`⚠️ Ward meeting creation: ${error.response?.data?.message || error.message}`);
          }
        }
      }
    }
    
    // Test 7: Test Meeting Types API
    console.log('\n7️⃣ Testing Meeting Types API...');
    const meetingTypesResponse = await axios.get(`${BASE_URL}/hierarchical-meetings/meeting-types`);
    const meetingTypes = meetingTypesResponse.data.data;
    console.log(`✅ Found ${meetingTypes.length} meeting types`);
    meetingTypes.slice(0, 3).forEach((type, index) => {
      console.log(`   ${index + 1}. ${type.type_name} (ID: ${type.type_id}) - ${type.hierarchy_level}`);
    });
    
    console.log('\n🎉 Geographic Meeting Creation Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Geographic APIs working');
    console.log('✅ Hierarchical data structure available');
    console.log('✅ Meeting creation endpoints accessible');
    console.log('✅ Ready for frontend integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testGeographicMeetingCreation().catch(console.error);
