/**
 * Test North West Province API Endpoints
 * 
 * This script tests the geographic API endpoints for North West province
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000/api/v1';

async function testNorthWestAPI() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   North West Province API Test                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Test provinces endpoint
    console.log('1️⃣  Testing /geographic/provinces...');
    const provincesRes = await axios.get(`${API_BASE}/geographic/provinces`);
    const provinces = provincesRes.data.data || provincesRes.data;
    
    const nwProvince = provinces.find(p => 
      p.province_code === 'NW' || p.province_name.toLowerCase().includes('north west')
    );
    
    if (!nwProvince) {
      console.log('   ❌ North West province not found in API response!');
      console.log('   Available provinces:', provinces.map(p => `${p.province_name} (${p.province_code})`).join(', '));
      return;
    }
    
    console.log(`   ✅ Found: ${nwProvince.province_name} (${nwProvince.province_code})\n`);

    // 2. Test districts endpoint for North West
    console.log('2️⃣  Testing /geographic/districts?province=NW...');
    try {
      const districtsRes = await axios.get(`${API_BASE}/geographic/districts?province=${nwProvince.province_code}`);
      const districts = districtsRes.data.data || districtsRes.data;
      
      if (!districts || districts.length === 0) {
        console.log('   ❌ NO districts returned for North West!');
        console.log('   Response:', JSON.stringify(districtsRes.data, null, 2));
      } else {
        console.log(`   ✅ Found ${districts.length} districts:`);
        districts.forEach(d => {
          console.log(`      - ${d.district_name} (${d.district_code})`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error fetching districts:', error.response?.data || error.message);
    }
    console.log('');

    // 3. Test municipalities endpoint for North West
    console.log('3️⃣  Testing /geographic/municipalities?province=NW...');
    try {
      const municipalitiesRes = await axios.get(`${API_BASE}/geographic/municipalities?province=${nwProvince.province_code}`);
      const municipalities = municipalitiesRes.data.data || municipalitiesRes.data;
      
      if (!municipalities || municipalities.length === 0) {
        console.log('   ❌ NO municipalities returned for North West!');
      } else {
        console.log(`   ✅ Found ${municipalities.length} municipalities:`);
        municipalities.slice(0, 10).forEach(m => {
          console.log(`      - ${m.municipality_name} (${m.municipality_code}) - ${m.municipality_type}`);
        });
        if (municipalities.length > 10) {
          console.log(`      ... and ${municipalities.length - 10} more`);
        }
      }
    } catch (error) {
      console.log('   ❌ Error fetching municipalities:', error.response?.data || error.message);
    }
    console.log('');

    // 4. Test member stats districts endpoint (used by Ward Audit)
    console.log('4️⃣  Testing /members/stats/districts?province=NW...');
    try {
      const statsRes = await axios.get(`${API_BASE}/members/stats/districts?province=${nwProvince.province_code}`);
      const stats = statsRes.data.data || statsRes.data;
      
      if (!stats || stats.length === 0) {
        console.log('   ❌ NO district stats returned for North West!');
        console.log('   This is the endpoint used by Ward Audit System!');
        console.log('   Response:', JSON.stringify(statsRes.data, null, 2));
      } else {
        console.log(`   ✅ Found ${stats.length} districts with member stats:`);
        stats.forEach(d => {
          console.log(`      - ${d.district_name} (${d.district_code}): ${d.member_count} members`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error fetching district stats:', error.response?.data || error.message);
    }
    console.log('');

    // 5. Compare with another province (Gauteng)
    console.log('5️⃣  Comparing with Gauteng (GP)...');
    try {
      const gpDistrictsRes = await axios.get(`${API_BASE}/geographic/districts?province=GP`);
      const gpDistricts = gpDistrictsRes.data.data || gpDistrictsRes.data;
      
      console.log(`   Gauteng has ${gpDistricts.length} districts`);
      
      const gpStatsRes = await axios.get(`${API_BASE}/members/stats/districts?province=GP`);
      const gpStats = gpStatsRes.data.data || gpStatsRes.data;
      
      console.log(`   Gauteng stats endpoint returns ${gpStats.length} districts`);
    } catch (error) {
      console.log('   ⚠️  Could not fetch Gauteng data for comparison');
    }
    console.log('');

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY:');
    console.log('═'.repeat(60));
    console.log('If district stats endpoint returns 0 results for North West,');
    console.log('but other endpoints return data, the issue is in the SQL query');
    console.log('used by /members/stats/districts endpoint.');
    console.log('');
    console.log('Check backend/src/routes/members.ts around line 996-1034');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend server is not running!');
      console.error('   Start the backend with: cd backend && npm run dev');
    }
  }
}

// Run the test
testNorthWestAPI().catch(console.error);

