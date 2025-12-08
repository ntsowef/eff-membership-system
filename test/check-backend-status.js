/**
 * Check Backend Server Status
 * Simple script to verify if the backend server is running
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function checkBackendStatus() {
  console.log('🔍 Checking backend server status...\n');

  try {
    // Try to hit the health endpoint
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });

    console.log('✅ Backend server is RUNNING');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Response:`, response.data);
    console.log('\n✨ You can now run the super admin API tests!');
    console.log('   Run: node test/super-admin-api-test.js\n');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is NOT RUNNING');
      console.log('\n📝 To start the backend server:');
      console.log('   1. Open a new terminal');
      console.log('   2. cd backend');
      console.log('   3. npm run dev');
      console.log('\n   Wait for the message: "Server is running on port 5000"');
      console.log('   Then run this script again.\n');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏱️  Backend server connection TIMED OUT');
      console.log('   The server might be starting up. Wait a moment and try again.\n');
    } else {
      console.log('❌ Error checking backend status:');
      console.log(`   ${error.message}\n`);
    }
    return false;
  }
}

// Run the check
checkBackendStatus().then((isRunning) => {
  process.exit(isRunning ? 0 : 1);
});

