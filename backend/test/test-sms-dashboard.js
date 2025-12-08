const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test credentials
const credentials = {
  email: 'national.admin@eff.org.za',
  password: 'Admin@123'
};

async function testSMSDashboard() {
  try {
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, credentials);
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('📝 Token:', token.substring(0, 20) + '...');
    
    // Test SMS dashboard stats endpoint
    console.log('\n📊 Step 2: Testing SMS Dashboard Stats endpoint...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/sms/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ SMS Dashboard Stats Response:');
      console.log(JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.error('❌ SMS Dashboard Stats Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Test birthday SMS statistics endpoint
    console.log('\n🎂 Step 3: Testing Birthday SMS Statistics endpoint...');
    try {
      const birthdayStatsResponse = await axios.get(`${BASE_URL}/birthday-sms/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Birthday SMS Statistics Response:');
      console.log(JSON.stringify(birthdayStatsResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Birthday SMS Statistics Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Test birthday SMS history endpoint
    console.log('\n📜 Step 4: Testing Birthday SMS History endpoint...');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/birthday-sms/history?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Birthday SMS History Response:');
      console.log(JSON.stringify(historyResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Birthday SMS History Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Test today's birthdays endpoint
    console.log('\n🎉 Step 5: Testing Today\'s Birthdays endpoint...');
    try {
      const todaysResponse = await axios.get(`${BASE_URL}/birthday-sms/todays-birthdays`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Today\'s Birthdays Response:');
      console.log(JSON.stringify(todaysResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Today\'s Birthdays Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Test upcoming birthdays endpoint
    console.log('\n📅 Step 6: Testing Upcoming Birthdays endpoint...');
    try {
      const upcomingResponse = await axios.get(`${BASE_URL}/birthday-sms/upcoming-birthdays?days=7`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Upcoming Birthdays Response:');
      console.log(JSON.stringify(upcomingResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Upcoming Birthdays Error:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testSMSDashboard();

