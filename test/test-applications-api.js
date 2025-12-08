const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testApplicationsAPI() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Fetch applications
    console.log('📋 Fetching applications...\n');
    const appsResponse = await axios.get(`${API_URL}/membership-applications?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = appsResponse.data.data;
    console.log(`📊 Total applications: ${data.pagination.total_count}`);
    console.log(`📄 Current page: ${data.pagination.current_page}`);
    console.log(`📄 Total pages: ${data.pagination.total_pages}`);
    console.log(`📄 Applications returned: ${data.applications.length}\n`);

    // Display first 5 applications
    console.log('Sample applications:');
    data.applications.slice(0, 5).forEach((app, i) => {
      console.log(`  ${i+1}. ${app.application_number} - ${app.first_name} ${app.last_name} (${app.status})`);
    });

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testApplicationsAPI();

