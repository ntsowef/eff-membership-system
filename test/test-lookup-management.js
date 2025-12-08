const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testLookupManagement() {
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

    console.log('Available Lookup Tables:');
    const tables = tablesResponse.data.data;
    tables.forEach(table => {
      console.log(`  - ${table.key}: ${table.display_name} (${table.table})`);
    });

    // Step 3: Test each new lookup table
    const newTables = ['genders', 'races', 'languages', 'qualifications', 'occupation_categories', 'occupations', 'meeting_types'];
    
    console.log('\n\n📊 Testing New Lookup Tables:\n');
    console.log('='.repeat(80));

    for (const tableName of newTables) {
      console.log(`\n\n📋 Table: ${tableName}`);
      console.log('-'.repeat(80));

      try {
        const response = await axios.get(`${API_URL}/super-admin/lookups/${tableName}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 5 }
        });

        const data = response.data.data;
        console.log(`✅ Success!`);
        console.log(`   Display Name: ${data.display_name}`);
        console.log(`   Total Entries: ${data.total}`);
        console.log(`   Showing: ${data.entries.length} entries`);
        
        if (data.entries.length > 0) {
          console.log(`\n   Sample entries:`);
          data.entries.slice(0, 3).forEach((entry, idx) => {
            const keys = Object.keys(entry).filter(k => !k.includes('created') && !k.includes('updated'));
            const summary = keys.map(k => `${k}: ${entry[k]}`).join(', ');
            console.log(`     ${idx + 1}. ${summary}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ All tests completed!');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testLookupManagement();

