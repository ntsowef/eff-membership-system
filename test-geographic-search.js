const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Create axios instance with auth
let authToken = null;
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Login function
async function login() {
  try {
    console.log('🔐 Attempting to login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (response.data?.data?.token) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed: No token received');
      return false;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test the geographic search functionality
async function testGeographicSearch() {
  console.log('🧪 Testing Geographic Search Functionality\n');

  try {
    // Test 1: Voting Districts Search
    console.log('1️⃣ Testing Voting Districts Search...');
    try {
      const response = await api.get('/search/lookup/voting_districts', {
        params: { search: 'ward', limit: 5 }
      });
      console.log('✅ Voting Districts Search:', response.data?.data?.results?.length || 0, 'results');
      if (response.data?.data?.results?.length > 0) {
        console.log('   Sample result:', response.data.data.results[0]);
      }
    } catch (error) {
      console.log('❌ Voting Districts Search failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Voting Stations Search
    console.log('\n2️⃣ Testing Voting Stations Search...');
    try {
      const response = await api.get('/search/lookup/voting_stations', {
        params: { search: 'station', limit: 5 }
      });
      console.log('✅ Voting Stations Search:', response.data?.data?.results?.length || 0, 'results');
      if (response.data?.data?.results?.length > 0) {
        console.log('   Sample result:', response.data.data.results[0]);
      }
    } catch (error) {
      console.log('❌ Voting Stations Search failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Wards Search
    console.log('\n3️⃣ Testing Wards Search...');
    try {
      const response = await api.get('/search/lookup/wards', {
        params: { search: 'ward', limit: 5 }
      });
      console.log('✅ Wards Search:', response.data?.data?.results?.length || 0, 'results');
      if (response.data?.data?.results?.length > 0) {
        console.log('   Sample result:', response.data.data.results[0]);
      }
    } catch (error) {
      console.log('❌ Wards Search failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Members with Voting Districts View
    console.log('\n4️⃣ Testing Members with Voting Districts View...');
    try {
      const response = await api.get('/views/members-with-voting-districts', {
        params: { limit: 5 }
      });
      console.log('✅ Members View:', response.data?.data?.members?.length || 0, 'members');
      if (response.data?.data?.members?.length > 0) {
        const member = response.data.data.members[0];
        console.log('   Sample member:', {
          name: member.full_name,
          voting_district: member.voting_district_name,
          ward: member.ward_name
        });
      }
    } catch (error) {
      console.log('❌ Members View failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Members filtered by voting district
    console.log('\n5️⃣ Testing Members filtered by voting district...');
    try {
      const response = await api.get('/views/members-with-voting-districts', {
        params: { voting_district_code: '123', limit: 5 }
      });
      console.log('✅ Filtered Members:', response.data?.data?.members?.length || 0, 'members');
    } catch (error) {
      console.log('❌ Filtered Members failed:', error.response?.data?.message || error.message);
    }

    // Test 6: Members filtered by voting station
    console.log('\n6️⃣ Testing Members filtered by voting station...');
    try {
      const response = await api.get('/views/members-with-voting-districts', {
        params: { voting_station_id: '1', limit: 5 }
      });
      console.log('✅ Station Filtered Members:', response.data?.data?.members?.length || 0, 'members');
    } catch (error) {
      console.log('❌ Station Filtered Members failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Geographic Search Testing Complete!');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Test server connectivity first
async function testServerConnectivity() {
  console.log('🔌 Testing server connectivity...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running:', response.data?.message || 'OK');
    return true;
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    console.log('   Make sure the backend server is running on port 5000');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Geographic Search API Test Suite\n');

  const serverOnline = await testServerConnectivity();
  if (serverOnline) {
    console.log('⚠️  Testing without authentication (expecting 401 errors)');
    console.log('   This will show the API structure and confirm endpoints exist\n');
    await testGeographicSearch();

    console.log('\n💡 To test with authentication:');
    console.log('   1. Create a test user in the database');
    console.log('   2. Update the login credentials in this script');
    console.log('   3. Uncomment the login section above');
  } else {
    console.log('\n💡 To start the backend server, run:');
    console.log('   cd backend && npm run dev');
  }
}

main().catch(console.error);
