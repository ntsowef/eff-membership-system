const http = require('http');

function testAPI() {
  console.log('🧪 Testing Ward Membership Audit API...\n');

  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/audit/ward-membership/overview',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.success) {
            console.log('✅ API is working correctly!');
            const overview = jsonData.data.audit_overview;
            console.log(`📊 Total Wards: ${overview.total_wards}`);
            console.log(`📈 Overall Compliance: ${overview.overall_compliance_percentage}%`);
            console.log(`👥 Total Active Members: ${overview.total_active_members}`);
          }
        } catch (error) {
          console.log('❌ Failed to parse JSON response');
        }
      } else {
        console.log('❌ API returned error status');
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Connection failed:', error.message);
  });

  req.setTimeout(5000, () => {
    req.destroy();
    console.log('❌ Request timeout');
  });

  req.end();
}

testAPI();
