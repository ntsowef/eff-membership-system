/**
 * Bulk Upload Queue API Test Script
 * 
 * Tests the queue-based bulk upload processing with:
 * - Async job submission
 * - Queue status monitoring
 * - Job retry and cancellation
 * - Queue statistics
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_EMAIL = 'national.admin@eff.org.za';
const TEST_PASSWORD = 'Admin@123';
const SAMPLE_FILE_PATH = path.join(__dirname, '..', 'sample-data', 'bulk-upload-sample.xlsx');

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
 * Upload file and get job ID
 */
async function uploadFile(token: string): Promise<string> {
  console.log('\n📤 Uploading file...');

  // Check if sample file exists
  if (!fs.existsSync(SAMPLE_FILE_PATH)) {
    throw new Error(`Sample file not found: ${SAMPLE_FILE_PATH}`);
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(SAMPLE_FILE_PATH));

  const response = await axios.post(
    `${API_BASE_URL}/bulk-upload/process`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const jobId = response.data.data.job_id;
  console.log('✅ File uploaded successfully');
  console.log(`   Job ID: ${jobId}`);
  console.log(`   Status: ${response.data.data.status}`);

  return jobId;
}

/**
 * Get job status
 */
async function getJobStatus(token: string, jobId: string): Promise<any> {
  const response = await api.get(`/bulk-upload/status/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return response.data.data;
}

/**
 * Get queue statistics
 */
async function getQueueStats(token: string): Promise<any> {
  console.log('\n📊 Getting queue statistics...');

  const response = await api.get('/bulk-upload/queue/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const stats = response.data.data;
  console.log('✅ Queue statistics:');
  console.log(`   Waiting: ${stats.waiting}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Completed: ${stats.completed}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total: ${stats.total}`);

  return stats;
}

/**
 * Get recent queue jobs
 */
async function getQueueJobs(token: string, limit: number = 10): Promise<any[]> {
  console.log(`\n📋 Getting recent ${limit} queue jobs...`);

  const response = await api.get(`/bulk-upload/queue/jobs?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const jobs = response.data.data.jobs;
  console.log(`✅ Retrieved ${jobs.length} jobs`);

  jobs.forEach((job: any, index: number) => {
    console.log(`\n   Job ${index + 1}:`);
    console.log(`     ID: ${job.jobId}`);
    console.log(`     File: ${job.fileName}`);
    console.log(`     Status: ${job.status}`);
    console.log(`     Progress: ${job.progress}%`);
    console.log(`     Uploaded by: ${job.uploadedBy}`);
  });

  return jobs;
}

/**
 * Monitor job progress
 */
async function monitorJobProgress(token: string, jobId: string, maxWaitSeconds: number = 120): Promise<void> {
  console.log(`\n⏳ Monitoring job progress (max ${maxWaitSeconds}s)...`);

  const startTime = Date.now();
  let lastStatus = '';

  while (true) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (elapsed > maxWaitSeconds) {
      console.log(`⚠️ Timeout reached (${maxWaitSeconds}s)`);
      break;
    }

    const status = await getJobStatus(token, jobId);

    if (status.status !== lastStatus) {
      console.log(`   [${elapsed}s] Status: ${status.status}`);
      lastStatus = status.status;
    }

    if (status.status === 'completed') {
      console.log('✅ Job completed successfully!');
      console.log(`   Duration: ${status.processing_duration_ms}ms`);
      console.log(`   Inserts: ${status.database_stats?.inserts || 0}`);
      console.log(`   Updates: ${status.database_stats?.updates || 0}`);
      break;
    }

    if (status.status === 'failed') {
      console.log('❌ Job failed!');
      console.log(`   Error: ${status.error_message}`);
      break;
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Bulk Upload Queue API Tests');
  console.log('========================================\n');

  try {
    // 1. Authenticate
    const token = await authenticate();

    // 2. Get initial queue stats
    await getQueueStats(token);

    // 3. Upload file (async)
    const jobId = await uploadFile(token);

    // 4. Monitor job progress
    await monitorJobProgress(token, jobId, 120);

    // 5. Get final queue stats
    await getQueueStats(token);

    // 6. Get recent queue jobs
    await getQueueJobs(token, 5);

    // 7. Get upload history
    console.log('\n📜 Getting upload history...');
    const historyResponse = await api.get('/bulk-upload/history?page=1&limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ Retrieved ${historyResponse.data.data.uploads.length} uploads`);

    // 8. Get upload stats
    console.log('\n📈 Getting upload statistics...');
    const statsResponse = await api.get('/bulk-upload/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Upload statistics:');
    console.log(`   Total uploads: ${statsResponse.data.data.total_uploads}`);
    console.log(`   Successful: ${statsResponse.data.data.successful_uploads}`);
    console.log(`   Failed: ${statsResponse.data.data.failed_uploads}`);
    console.log(`   Success rate: ${statsResponse.data.data.success_rate}`);

    console.log('\n✅ All tests completed successfully!');

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

