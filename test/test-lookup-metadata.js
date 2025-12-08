const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testLookupMetadata() {
  try {
    // Step 1: Authenticate as Super Admin
    console.log('🔐 Authenticating as Super Admin...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@eff.org.za',
      password: 'SuperAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Get list of all lookup tables
    console.log('📋 Testing GET /super-admin/lookups/tables\n');
    const tablesResponse = await axios.get(`${API_URL}/super-admin/lookups/tables`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tables = tablesResponse.data.data;
    const occupationsTable = tables.find(t => t.key === 'occupations');
    
    console.log('Occupations table metadata from /tables endpoint:');
    console.log(JSON.stringify(occupationsTable, null, 2));

    // Step 3: Get occupations entries
    console.log('\n\n📊 Testing GET /super-admin/lookups/occupations\n');
    const occupationsResponse = await axios.get(`${API_URL}/super-admin/lookups/occupations`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 3 }
    });

    const occupationsData = occupationsResponse.data.data;
    
    console.log('Occupations data metadata from /occupations endpoint:');
    console.log('  - table_name:', occupationsData.table_name);
    console.log('  - display_name:', occupationsData.display_name);
    console.log('  - id_column:', occupationsData.id_column);
    console.log('  - name_column:', occupationsData.name_column);
    console.log('  - code_column:', occupationsData.code_column);
    console.log('  - total:', occupationsData.total);

    console.log('\nFirst entry:');
    const firstEntry = occupationsData.entries[0];
    console.log(JSON.stringify(firstEntry, null, 2));

    console.log('\nEntry keys:', Object.keys(firstEntry));
    console.log('ID column name:', occupationsData.id_column);
    console.log('ID value:', firstEntry[occupationsData.id_column]);

    // Step 4: Test what happens when we try to delete
    console.log('\n\n🗑️  Simulating delete operation:');
    console.log('  - Selected table key: occupations');
    console.log('  - ID column from metadata:', occupationsData.id_column);
    console.log('  - Entry ID:', firstEntry[occupationsData.id_column]);
    console.log('  - Would call: DELETE /super-admin/lookups/occupations/' + firstEntry[occupationsData.id_column]);

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testLookupMetadata();

