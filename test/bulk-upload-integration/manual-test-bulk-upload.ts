/**
 * Manual Test Script for Bulk Upload Feature
 * 
 * This script tests the complete bulk upload workflow:
 * 1. Login to get authentication token
 * 2. Upload Excel file
 * 3. Monitor job status
 * 4. Download report
 * 
 * Usage: npx ts-node test/bulk-upload-integration/manual-test-bulk-upload.ts
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_FILE_NAME = process.argv[2] || 'test-members-complete.xlsx';
const TEST_FILE_PATH = TEST_FILE_NAME.includes('benchmark')
  ? path.resolve(process.cwd(), '../test/bulk-upload-integration', TEST_FILE_NAME)
  : path.resolve(process.cwd(), '../test/bulk-upload-poc/sample-data', TEST_FILE_NAME);

// Test credentials (from environment or default)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'national.admin@eff.org.za',
  password: process.env.TEST_USER_PASSWORD || 'Admin@123' // Update with actual password
};

console.log('⚙️  Configuration:');
console.log(`   API URL: ${API_BASE_URL}`);
console.log(`   Test User: ${TEST_USER.email}`);
console.log(`   Test File: ${TEST_FILE_PATH}`);
console.log('');

let authToken: string = '';

// ============================================================================
// Helper Functions
// ============================================================================

async function login(): Promise<string> {
  console.log('🔐 Step 1: Logging in...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    const token = response.data.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    return token;
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadFile(token: string): Promise<string> {
  console.log('\n📤 Step 2: Uploading file...');
  
  // Check if test file exists
  if (!fs.existsSync(TEST_FILE_PATH)) {
    throw new Error(`Test file not found: ${TEST_FILE_PATH}`);
  }

  const fileStats = fs.statSync(TEST_FILE_PATH);
  console.log(`   File: ${path.basename(TEST_FILE_PATH)}`);
  console.log(`   Size: ${(fileStats.size / 1024).toFixed(2)} KB`);

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));

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

    console.log('✅ File uploaded successfully');
    console.log('   Response:', JSON.stringify(response.data, null, 2));

    const jobId = response.data.data?.jobId || response.data.data?.job_id || response.data.jobId || response.data.job_id;
    console.log(`   Job ID: ${jobId}`);

    if (!jobId) {
      throw new Error('Job ID not found in response');
    }

    return jobId;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

async function monitorJobStatus(token: string, jobId: string): Promise<void> {
  console.log('\n⏳ Step 3: Monitoring job status...');
  
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/bulk-upload/status/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const job = response.data.data;
      const progress = job.progress || 0;
      console.log(`   [${attempts + 1}] Status: ${job.status} | Progress: ${progress}%`);

      if (job.status === 'completed') {
        console.log('✅ Job completed successfully!');

        // Parse validation_stats and database_stats
        const validationStats = typeof job.validation_stats === 'string'
          ? JSON.parse(job.validation_stats)
          : job.validation_stats || {};
        const databaseStats = typeof job.database_stats === 'string'
          ? JSON.parse(job.database_stats)
          : job.database_stats || {};

        console.log(`   Records processed: ${validationStats.total_records || 0}`);
        console.log(`   Valid records: ${validationStats.valid_records || 0}`);
        console.log(`   Invalid IDs: ${validationStats.invalid_ids || 0}`);
        console.log(`   Duplicates: ${validationStats.duplicates || 0}`);
        console.log(`   New members inserted: ${databaseStats.new_members_inserted || 0}`);
        console.log(`   Existing members updated: ${databaseStats.existing_members_updated || 0}`);
        console.log(`   Processing duration: ${job.processing_duration_ms || 0}ms`);
        return;
      }

      if (job.status === 'failed') {
        console.error('❌ Job failed!');
        console.error(`   Error: ${job.error || 'Unknown error'}`);
        throw new Error('Job processing failed');
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    } catch (error: any) {
      console.error('❌ Status check failed:', error.response?.data || error.message);
      throw error;
    }
  }

  console.error('❌ Job monitoring timed out after 5 minutes');
  throw new Error('Job monitoring timeout');
}

async function downloadReport(token: string, jobId: string): Promise<void> {
  console.log('\n📥 Step 4: Downloading report...');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bulk-upload/report/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      }
    );

    const reportPath = path.resolve(process.cwd(), `../test/bulk-upload-integration/report-${jobId}.xlsx`);
    fs.writeFileSync(reportPath, response.data);
    
    const fileSize = fs.statSync(reportPath).size;
    console.log('✅ Report downloaded successfully');
    console.log(`   Path: ${reportPath}`);
    console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);
  } catch (error: any) {
    console.error('❌ Report download failed:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

async function runTest() {
  console.log('🧪 Bulk Upload Feature - Manual Test');
  console.log('=====================================\n');

  try {
    // Step 1: Login
    authToken = await login();

    // Step 2: Upload file
    const jobId = await uploadFile(authToken);

    // Step 3: Monitor job status
    await monitorJobStatus(authToken, jobId);

    // Step 4: Download report
    await downloadReport(authToken, jobId);

    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed!');
    process.exit(1);
  }
}

// Run the test
runTest();

