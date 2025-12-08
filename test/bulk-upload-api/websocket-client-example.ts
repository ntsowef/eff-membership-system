/**
 * WebSocket Client Example for Bulk Upload Progress
 * 
 * This example demonstrates how to connect to the WebSocket server
 * and receive real-time progress updates for bulk upload jobs.
 * 
 * Usage:
 * 1. Start the backend server
 * 2. Get a JWT token by logging in
 * 3. Run this script: npx ts-node test/bulk-upload-api/websocket-client-example.ts
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = 'http://localhost:5000';
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token from login

let socket: Socket;

/**
 * Connect to WebSocket server
 */
function connectWebSocket(): void {
  console.log('🔌 Connecting to WebSocket server...');

  socket = io(WS_URL, {
    auth: {
      token: AUTH_TOKEN
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server');
    console.log('   Socket ID:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });

  // Bulk upload progress events
  socket.on('bulk_upload_progress', (data) => {
    console.log('\n📊 PROGRESS UPDATE:');
    console.log('   Job ID:', data.job_id);
    console.log('   Stage:', data.stage);
    console.log('   Progress:', data.progress + '%');
    console.log('   Message:', data.message);
    console.log('   Status:', data.status);
    console.log('   Timestamp:', data.timestamp);
  });

  socket.on('bulk_upload_complete', (data) => {
    console.log('\n✅ UPLOAD COMPLETE:');
    console.log('   Job ID:', data.job_id);
    console.log('   Status:', data.status);
    console.log('   Processing Time:', data.processing_duration_ms, 'ms');
    console.log('   Validation Stats:', JSON.stringify(data.validation_stats, null, 2));
    console.log('   Database Stats:', JSON.stringify(data.database_stats, null, 2));
    console.log('   Report Path:', data.report_path);
    console.log('   Timestamp:', data.timestamp);
  });

  socket.on('bulk_upload_failed', (data) => {
    console.log('\n❌ UPLOAD FAILED:');
    console.log('   Job ID:', data.job_id);
    console.log('   Error:', data.error);
    console.log('   Stage:', data.stage);
    console.log('   Status:', data.status);
    console.log('   Timestamp:', data.timestamp);
  });
}

/**
 * Subscribe to a specific bulk upload job
 */
function subscribeToJob(jobId: string): void {
  console.log(`\n📡 Subscribing to job: ${jobId}`);
  socket.emit('subscribe_bulk_upload_job', { job_id: jobId });
}

/**
 * Unsubscribe from a specific bulk upload job
 */
function unsubscribeFromJob(jobId: string): void {
  console.log(`\n📡 Unsubscribing from job: ${jobId}`);
  socket.emit('unsubscribe_bulk_upload_job', { job_id: jobId });
}

/**
 * Main function
 */
function main(): void {
  console.log('='.repeat(80));
  console.log('WEBSOCKET CLIENT EXAMPLE - BULK UPLOAD PROGRESS');
  console.log('='.repeat(80));

  // Check if token is provided
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('\n❌ ERROR: Please replace AUTH_TOKEN with a valid JWT token');
    console.log('\nTo get a token:');
    console.log('1. Login via POST /api/v1/auth/login');
    console.log('2. Copy the token from the response');
    console.log('3. Replace AUTH_TOKEN in this file');
    process.exit(1);
  }

  // Connect to WebSocket
  connectWebSocket();

  // Example: Subscribe to a specific job (replace with actual job ID)
  // setTimeout(() => {
  //   subscribeToJob('job-1732531200000-1234');
  // }, 1000);

  // Keep the script running
  console.log('\n⏳ Listening for bulk upload events...');
  console.log('   Press Ctrl+C to exit\n');
}

// Run the example
main();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting...');
  if (socket) {
    socket.disconnect();
  }
  process.exit(0);
});

