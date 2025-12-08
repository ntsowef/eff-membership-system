const axios = require('axios');

async function testSearch() {
  try {
    console.log('🔍 Testing various search queries...\n');

    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');

    const headers = { 'Authorization': `Bearer ${token}` };

    // Test searches
    const searches = [
      'Leigh-Anne',
      'Lee',
      'LEE-ANNE',
      'Leigh',
      'Anne'
    ];

    for (const searchTerm of searches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Searching for: "${searchTerm}"`);
      console.log('='.repeat(60));
      
      try {
        const response = await axios.get('http://localhost:5000/api/v1/members', {
          params: {
            page: 1,
            limit: 10,
            q: searchTerm
          },
          headers
        });

        console.log(`✅ Total Found: ${response.data.pagination.total}`);
        
        if (response.data.data.length > 0) {
          console.log('\n📋 Top Results:');
          response.data.data.slice(0, 5).forEach((member, index) => {
            console.log(`\n${index + 1}. ${member.firstname} ${member.surname || '(no surname)'}`);
            console.log(`   Member ID: ${member.member_id}`);
            console.log(`   Province: ${member.province_name || 'N/A'}`);
          });
        } else {
          console.log('⚠️  No results found');
        }
      } catch (error) {
        console.error(`❌ Error searching for "${searchTerm}":`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All search tests complete!');

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

