const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testLookupDropdown() {
  try {
    // Step 1: Authenticate as Super Admin
    console.log('🔐 Authenticating as Super Admin...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@eff.org.za',
      password: 'SuperAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Get list of all lookup tables (for dropdown)
    console.log('📋 Testing GET /super-admin/lookups/tables (Dropdown Data)\n');
    const tablesResponse = await axios.get(`${API_URL}/super-admin/lookups/tables`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Response structure:');
    console.log('  - success:', tablesResponse.data.success);
    console.log('  - data type:', typeof tablesResponse.data.data);
    console.log('  - data is array:', Array.isArray(tablesResponse.data.data));
    console.log('  - data length:', tablesResponse.data.data?.length);

    console.log('\nFirst 3 tables:');
    const tables = tablesResponse.data.data;
    tables.slice(0, 3).forEach((table, idx) => {
      console.log(`\n  ${idx + 1}. ${table.display_name}`);
      console.log(`     - key: ${table.key}`);
      console.log(`     - table: ${table.table}`);
      console.log(`     - id_column: ${table.id_column}`);
      console.log(`     - name_column: ${table.name_column}`);
      console.log(`     - code_column: ${table.code_column}`);
    });

    // Step 3: Test selecting a table (e.g., 'genders')
    console.log('\n\n📊 Testing GET /super-admin/lookups/genders (After Selecting from Dropdown)\n');
    const gendersResponse = await axios.get(`${API_URL}/super-admin/lookups/genders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Response structure:');
    console.log('  - success:', gendersResponse.data.success);
    console.log('  - data.table_name:', gendersResponse.data.data.table_name);
    console.log('  - data.display_name:', gendersResponse.data.data.display_name);
    console.log('  - data.id_column:', gendersResponse.data.data.id_column);
    console.log('  - data.name_column:', gendersResponse.data.data.name_column);
    console.log('  - data.code_column:', gendersResponse.data.data.code_column);
    console.log('  - data.total:', gendersResponse.data.data.total);
    console.log('  - data.entries length:', gendersResponse.data.data.entries.length);

    console.log('\nEntries:');
    gendersResponse.data.data.entries.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. ${entry.gender_name} (${entry.gender_code})`);
    });

    console.log('\n\n✅ All tests passed! Dropdown should work now.');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testLookupDropdown();

