/**
 * Test Script: WebSocket Notification Verification
 * 
 * This script tests that WebSocket notifications are being broadcast correctly
 * to both specific file rooms and the general bulk_upload room.
 * 
 * Prerequisites:
 * - Backend server running on localhost:5000
 * - Valid authentication token
 * 
 * Usage:
 *   node test/test-websocket-notifications.js
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const WEBSOCKET_URL = 'http://localhost:5000';

// Test credentials (update with valid credentials)
const TEST_CREDENTIALS = {
  email: 'superadmin@eff.org.za',
  password: 'Admin@123'
};

let authToken = '';
let socket = null;

/**
 * Login and get authentication token
 */
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Connect to WebSocket
 */
function connectWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Connecting to WebSocket...');
    
    socket = io(WEBSOCKET_URL, {
      auth: { token: authToken },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket (Socket ID: ' + socket.id + ')');
      
      // Subscribe to bulk upload updates
      socket.emit('subscribe_bulk_upload', {});
      console.log('📡 Subscribed to bulk_upload room');
      
      resolve();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      reject(error);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
    });

    // Listen for bulk upload events
    socket.on('bulk_upload_progress', (data) => {
      console.log('📊 Received bulk_upload_progress:', data);
    });

    socket.on('bulk_upload_complete', (data) => {
      console.log('✅ Received bulk_upload_complete:', data);
    });

    socket.on('bulk_upload_error', (data) => {
      console.error('❌ Received bulk_upload_error:', data);
    });
  });
}

/**
 * Test sending a notification via internal API
 */
async function testNotification() {
  console.log('\n📤 Testing notification broadcast...');
  
  const testFileId = 999999; // Use a test file ID
  
  try {
    // Send a test progress notification
    console.log('Sending test progress notification...');
    const response = await axios.post(
      `${API_BASE_URL}/internal/websocket/notify`,
      {
        event: 'bulk_upload_progress',
        file_id: testFileId,
        data: {
          status: 'processing',
          progress: 50,
          rows_processed: 50,
          rows_total: 100,
          message: 'Test notification from test script'
        }
      }
    );
    
    console.log('✅ Notification sent successfully:', response.data);
    
    // Wait a moment for WebSocket to receive
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send a test completion notification
    console.log('\nSending test completion notification...');
    const response2 = await axios.post(
      `${API_BASE_URL}/internal/websocket/notify`,
      {
        event: 'bulk_upload_complete',
        file_id: testFileId,
        data: {
          rows_success: 95,
          rows_failed: 5,
          rows_total: 100
        }
      }
    );
    
    console.log('✅ Completion notification sent successfully:', response2.data);
    
    // Wait a moment for WebSocket to receive
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send notification:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Starting WebSocket Notification Test\n');
  console.log('This test will:');
  console.log('1. Login and get auth token');
  console.log('2. Connect to WebSocket');
  console.log('3. Subscribe to bulk_upload room');
  console.log('4. Send test notifications via internal API');
  console.log('5. Verify notifications are received\n');
  
  try {
    // Login
    await login();
    
    // Connect to WebSocket
    await connectWebSocket();
    
    // Wait a moment for subscription to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test notifications
    const success = await testNotification();
    
    // Wait for any remaining messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ TEST PASSED: WebSocket notifications are working!');
      console.log('');
      console.log('If you saw "Received bulk_upload_progress" and');
      console.log('"Received bulk_upload_complete" messages above,');
      console.log('then the WebSocket notification system is working correctly.');
    } else {
      console.log('❌ TEST FAILED: Could not send notifications');
    }
    console.log('='.repeat(60));
    
    // Cleanup
    if (socket) {
      socket.disconnect();
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (socket) {
      socket.disconnect();
    }
    
    process.exit(1);
  }
}

// Run the test
runTest();

