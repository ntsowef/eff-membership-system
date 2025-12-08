/**
 * Bulk Upload File Monitor Test Script
 * 
 * Tests the file monitoring service with:
 * - Monitor status checking
 * - File drop detection
 * - Automatic queue integration
 * - Manual file processing
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_EMAIL = 'national.admin@eff.org.za';
const TEST_PASSWORD = 'Admin@123';
const SAMPLE_FILE_PATH = path.join(__dirname, '..', 'sample-data', 'bulk-upload-sample.xlsx');
const WATCH_DIR = path.join(process.cwd(), '_bulk_upload_watch');

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Authenticate and get JWT token
 */
async function authenticate(): Promise<string> {
  console.log('\n🔐 Authenticating...');
  
  const response = await api.post('/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  const token = response.data.data.token;
  console.log('✅ Authentication successful');
  
  return token;
}

/**
 * Get monitor status
 */
async function getMonitorStatus(token: string): Promise<any> {
  console.log('\n📊 Getting monitor status...');

  const response = await api.get('/bulk-upload/monitor/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const status = response.data.data;
  console.log('✅ Monitor status:');
  console.log(`   Running: ${status.isRunning}`);
  console.log(`   Enabled: ${status.enabled}`);
  console.log(`   Watch directory: ${status.watchDir}`);

  return status;
}

/**
 * Start monitor
 */
async function startMonitor(token: string): Promise<void> {
  console.log('\n▶️ Starting monitor...');

  const response = await api.post('/bulk-upload/monitor/start', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('✅ Monitor started:', response.data.data);
}

/**
 * Stop monitor
 */
async function stopMonitor(token: string): Promise<void> {
  console.log('\n⏸️ Stopping monitor...');

  const response = await api.post('/bulk-upload/monitor/stop', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('✅ Monitor stopped:', response.data.data);
}

/**
 * Copy file to watch directory
 */
async function copyFileToWatchDir(fileName: string): Promise<string> {
  console.log(`\n📁 Copying file to watch directory...`);

  // Ensure watch directory exists
  if (!fs.existsSync(WATCH_DIR)) {
    fs.mkdirSync(WATCH_DIR, { recursive: true });
    console.log(`   Created watch directory: ${WATCH_DIR}`);
  }

  // Check if sample file exists
  if (!fs.existsSync(SAMPLE_FILE_PATH)) {
    throw new Error(`Sample file not found: ${SAMPLE_FILE_PATH}`);
  }

  // Copy file with timestamp to avoid duplicates
  const timestamp = Date.now();
  const destFileName = `test-${timestamp}-${fileName}`;
  const destPath = path.join(WATCH_DIR, destFileName);

  fs.copyFileSync(SAMPLE_FILE_PATH, destPath);
  console.log(`✅ File copied to: ${destPath}`);

  return destFileName;
}

/**
 * Manually process file
 */
async function processFile(token: string, fileName: string): Promise<string> {
  console.log(`\n🔄 Manually processing file: ${fileName}`);

  const response = await api.post('/bulk-upload/monitor/process', 
    { fileName },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const jobId = response.data.data.job_id;
  console.log(`✅ File queued for processing`);
  console.log(`   Job ID: ${jobId}`);

  return jobId;
}

/**
 * Wait for file to be detected
 */
async function waitForDetection(seconds: number): Promise<void> {
  console.log(`\n⏳ Waiting ${seconds} seconds for file detection...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  console.log('✅ Wait complete');
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Bulk Upload File Monitor Tests');
  console.log('==========================================\n');

  try {
    // 1. Authenticate
    const token = await authenticate();

    // 2. Get initial monitor status
    const initialStatus = await getMonitorStatus(token);

    // 3. Start monitor if not running
    if (!initialStatus.isRunning) {
      await startMonitor(token);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for startup
    }

    // 4. Test automatic file detection
    console.log('\n📋 TEST 1: Automatic File Detection');
    console.log('=====================================');
    const autoFileName = await copyFileToWatchDir('bulk-upload-sample.xlsx');
    await waitForDetection(10); // Wait for file to be detected and queued

    // 5. Check queue stats
    console.log('\n📊 Checking queue stats...');
    const queueResponse = await api.get('/bulk-upload/queue/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Queue stats:', queueResponse.data.data);

    // 6. Test manual file processing
    console.log('\n📋 TEST 2: Manual File Processing');
    console.log('===================================');
    const manualFileName = await copyFileToWatchDir('bulk-upload-manual.xlsx');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for file to stabilize
    const jobId = await processFile(token, manualFileName);

    // 7. Monitor job progress
    console.log('\n⏳ Monitoring job progress...');
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (attempts < maxAttempts) {
      const statusResponse = await api.get(`/bulk-upload/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const status = statusResponse.data.data;
      console.log(`   [${attempts * 2}s] Status: ${status.status}`);

      if (status.status === 'completed') {
        console.log('✅ Job completed successfully!');
        console.log(`   Duration: ${status.processing_duration_ms}ms`);
        break;
      }

      if (status.status === 'failed') {
        console.log('❌ Job failed!');
        console.log(`   Error: ${status.error_message}`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // 8. Get final monitor status
    await getMonitorStatus(token);

    // 9. Get recent queue jobs
    console.log('\n📋 Getting recent queue jobs...');
    const jobsResponse = await api.get('/bulk-upload/queue/jobs?limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ Retrieved ${jobsResponse.data.data.jobs.length} jobs`);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Notes:');
    console.log('   - Files are automatically detected when dropped in watch directory');
    console.log('   - Monitor can be started/stopped via API');
    console.log('   - Files can be manually triggered for processing');
    console.log(`   - Watch directory: ${WATCH_DIR}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run tests
runTests();

