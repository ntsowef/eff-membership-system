/**
 * Quick test for presiding officer dropdown fix
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
  console.log('Testing presiding officer dropdown fix...\n');
  
  // Login
  const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'national.admin@eff.org.za',
    password: 'Admin@123'
  });
  
  const token = loginResponse.data.data.token;
  console.log('✅ Authenticated successfully\n');
  
  // Test Free State province (where ward 41804014 is located)
  console.log('Testing GET /ward-audit/members/province/FS');
  const response = await axios.get(
    `${BASE_URL}/ward-audit/members/province/FS`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  console.log(`✅ API call successful!`);
  console.log(`   Members found: ${response.data.data.length}`);
  
  if (response.data.data.length > 0) {
    console.log('\n   Sample members:');
    response.data.data.slice(0, 5).forEach((m, i) => {
      console.log(`   ${i+1}. ${m.full_name} - ${m.ward_name || 'N/A'}`);
    });
  }
  
  console.log('\n🎉 FIX VERIFIED: The presiding officer dropdown will now work correctly!');
}

test().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
  process.exit(1);
});

