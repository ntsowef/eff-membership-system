const http = require('http');

async function testMembersDirectoryAPI() {
  try {
    console.log('🧪 Testing Members Directory API with voting_district_code filter...\n');

    const votingDistrictCode = '97110299';
    const url = `http://localhost:5000/api/v1/views/members-with-voting-districts?voting_district_code=${votingDistrictCode}`;

    console.log(`📡 Making request to: ${url}\n`);

    const response = await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        });
      }).on('error', reject);
    });

    console.log('📊 Response Status:', response.success ? '✅ Success' : '❌ Failed');
    console.log('📈 Total members:', response.data?.total || 0);
    
    const members = response.data?.members || [];
    
    if (members.length > 0) {
      console.log('\n👥 First 5 members:');
      members.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.firstname} ${m.surname || ''}`);
        console.log(`     Voting District: ${m.voting_district_name || 'N/A'}`);
        console.log(`     Ward: ${m.ward_name || 'N/A'}`);
        console.log(`     Municipality: ${m.municipality_name || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No members found for this voting district');
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testMembersDirectoryAPI();

