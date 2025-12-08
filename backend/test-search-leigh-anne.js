const axios = require('axios');

async function testSearch() {
  try {
    console.log('🔍 Testing search for "Leigh-Anne"...\n');

    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    const headers = { 'Authorization': `Bearer ${token}` };

    // Test the search
    console.log('📊 Searching for "Leigh-Anne"...\n');
    const response = await axios.get('http://localhost:5000/api/v1/members', {
      params: {
        page: 1,
        limit: 50,
        q: 'Leigh-Anne'
      },
      headers
    });

    console.log('✅ Search Results:\n');
    console.log('Total Members Found:', response.data.pagination.total);
    console.log('Page:', response.data.pagination.page);
    console.log('Limit:', response.data.pagination.limit);
    console.log('Total Pages:', response.data.pagination.totalPages);
    console.log('');

    if (response.data.data.length > 0) {
      console.log('📋 Members Found:\n');
      response.data.data.forEach((member, index) => {
        console.log(`${index + 1}. ${member.firstname} ${member.surname || ''}`);
        console.log(`   ID: ${member.member_id}`);
        console.log(`   ID Number: ${member.id_number || 'N/A'}`);
        console.log(`   Province: ${member.province_name || 'N/A'} (${member.province_code || 'N/A'})`);
        console.log(`   District: ${member.district_name || 'N/A'} (${member.district_code || 'N/A'})`);
        console.log(`   Cell: ${member.cell_number || 'N/A'}`);
        console.log(`   Email: ${member.email || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No members found matching "Leigh-Anne"');
      
      // Try searching in the database directly
      console.log('\n🔍 Checking database directly...\n');
      const { Pool } = require('pg');
      const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'eff_membership_database',
        user: 'eff_admin',
        password: 'Frames!123'
      });

      const dbQuery = `
        SELECT member_id, firstname, surname, province_code, district_code
        FROM members_consolidated
        WHERE firstname ILIKE '%Leigh-Anne%' OR surname ILIKE '%Leigh-Anne%'
        LIMIT 10;
      `;
      const dbResult = await pool.query(dbQuery);
      
      if (dbResult.rows.length > 0) {
        console.log('📊 Found in members_consolidated:');
        console.table(dbResult.rows);
      } else {
        console.log('⚠️  Not found in members_consolidated either');
      }

      await pool.end();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testSearch();

