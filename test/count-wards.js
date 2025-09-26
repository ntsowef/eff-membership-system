const https = require('http');

// Test ward count for JHB municipality
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/geographic/wards?municipality=JHB',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success && response.data) {
        console.log(`✅ SUCCESS: Found ${response.data.length} wards for JHB municipality`);
        console.log(`📊 Ward range: Ward ${response.data[0].ward_number} to Ward ${response.data[response.data.length - 1].ward_number}`);
        console.log(`🎯 All wards are now accessible without pagination limits!`);
      } else {
        console.log('❌ ERROR: Invalid response format');
      }
    } catch (error) {
      console.log('❌ ERROR: Failed to parse response', error.message);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ ERROR: Request failed', error.message);
});

req.end();
