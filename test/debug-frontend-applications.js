const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function debugFrontendApplications() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Fetch applications with default pagination (what frontend does)
    console.log('📋 Fetching applications (default pagination)...\n');
    const appsResponse = await axios.get(`${API_URL}/membership-applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = appsResponse.data.data;
    console.log('API Response Structure:');
    console.log(`  - Total count: ${data.pagination.total_count}`);
    console.log(`  - Current page: ${data.pagination.current_page}`);
    console.log(`  - Total pages: ${data.pagination.total_pages}`);
    console.log(`  - Limit: ${data.pagination.limit}`);
    console.log(`  - Applications returned: ${data.applications.length}\n`);

    // Check status distribution
    const statusCounts = {};
    data.applications.forEach(app => {
      const status = app.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('Status distribution in returned applications:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nSample applications:');
    data.applications.slice(0, 5).forEach((app, i) => {
      console.log(`  ${i+1}. ${app.application_number} - ${app.first_name} ${app.last_name} (${app.status})`);
    });

    // Step 3: Fetch with higher limit
    console.log('\n\n📋 Fetching applications with limit=100...\n');
    const appsResponse2 = await axios.get(`${API_URL}/membership-applications?limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data2 = appsResponse2.data.data;
    console.log(`  - Applications returned: ${data2.applications.length}`);
    console.log(`  - Total count: ${data2.pagination.total_count}`);

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

debugFrontendApplications();

