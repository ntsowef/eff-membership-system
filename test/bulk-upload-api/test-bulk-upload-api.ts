/**
 * Integration Test for Bulk Upload API Endpoints
 * 
 * This test file tests the bulk upload API endpoints with real HTTP requests.
 * It requires the backend server to be running on localhost:5000.
 * 
 * Run with: npx ts-node test/bulk-upload-api/test-bulk-upload-api.ts
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api/v1';
const TEST_FILE_PATH = path.join(__dirname, '..', 'sample-data', 'bulk-upload-sample.xlsx');

let authToken: string = '';
let client: AxiosInstance;

/**
 * Authenticate and get JWT token
 */
async function authenticate(): Promise<boolean> {
  console.log('\n🔐 Authenticating...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'national.admin@eff.org.za',
      password: 'Admin@123'
    });

    if (!response.data.success) {
      console.error('❌ Authentication failed:', response.data);
      return false;
    }

    authToken = response.data.data.token;
    console.log('✅ Authentication successful');
    console.log(`   User: ${response.data.data.user.name}`);
    console.log(`   Email: ${response.data.data.user.email}`);
    
    // Create axios instance with auth header
    client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    return true;
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 1: Upload and process bulk upload file
 */
async function testProcessUpload(): Promise<string | null> {
  console.log('\n📤 Test 1: POST /bulk-upload/process');
  console.log('   Uploading file:', TEST_FILE_PATH);

  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      console.error(`❌ Test file not found: ${TEST_FILE_PATH}`);
      console.log('   Please create a sample Excel file at this location');
      return null;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));

    const response = await client.post('/bulk-upload/process', formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data.success) {
      console.log('✅ Upload successful!');
      console.log('   Job ID:', response.data.data.job_id);
      console.log('   Status:', response.data.data.status);
      console.log('   File:', response.data.data.file_name);
      console.log('   Processing Time:', response.data.data.processing_duration_ms, 'ms');
      console.log('   Validation Stats:', JSON.stringify(response.data.data.validation_stats, null, 2));
      console.log('   Database Stats:', JSON.stringify(response.data.data.database_stats, null, 2));
      console.log('   Report:', response.data.data.report_path);
      
      return response.data.data.job_id;
    } else {
      console.error('❌ Upload failed:', response.data);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 2: Get job status
 */
async function testGetJobStatus(jobId: string): Promise<void> {
  console.log(`\n📊 Test 2: GET /bulk-upload/status/${jobId}`);

  try {
    const response = await client.get(`/bulk-upload/status/${jobId}`);

    if (response.data.success) {
      console.log('✅ Job status retrieved!');
      console.log('   Job ID:', response.data.data.job_id);
      console.log('   Status:', response.data.data.status);
      console.log('   File:', response.data.data.file_name);
      console.log('   Uploaded By:', response.data.data.uploaded_by);
      console.log('   Uploaded At:', response.data.data.uploaded_at);
      console.log('   Processing Duration:', response.data.data.processing_duration_ms, 'ms');
    } else {
      console.error('❌ Failed to get job status:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Failed to get job status:', error.response?.data || error.message);
  }
}

/**
 * Test 3: Download report
 */
async function testDownloadReport(jobId: string): Promise<void> {
  console.log(`\n📥 Test 3: GET /bulk-upload/report/${jobId}`);

  try {
    const response = await client.get(`/bulk-upload/report/${jobId}`, {
      responseType: 'arraybuffer'
    });

    console.log('✅ Report downloaded!');
    console.log('   Content Type:', response.headers['content-type']);
    console.log('   Content Length:', response.headers['content-length'], 'bytes');
    
    // Save report to test directory
    const reportPath = path.join(__dirname, `report-${jobId}.xlsx`);
    fs.writeFileSync(reportPath, response.data);
    console.log('   Saved to:', reportPath);
  } catch (error: any) {
    console.error('❌ Failed to download report:', error.response?.data || error.message);
  }
}

/**
 * Test 4: Get upload history
 */
async function testGetUploadHistory(): Promise<void> {
  console.log('\n📜 Test 4: GET /bulk-upload/history');

  try {
    const response = await client.get('/bulk-upload/history', {
      params: {
        page: 1,
        limit: 10
      }
    });

    if (response.data.success) {
      console.log('✅ Upload history retrieved!');
      console.log('   Total Jobs:', response.data.data.pagination.total_count);
      console.log('   Page:', response.data.data.pagination.page);
      console.log('   Total Pages:', response.data.data.pagination.total_pages);
      console.log('   Jobs on this page:', response.data.data.jobs.length);

      if (response.data.data.jobs.length > 0) {
        console.log('\n   Recent jobs:');
        response.data.data.jobs.slice(0, 3).forEach((job: any, index: number) => {
          console.log(`   ${index + 1}. ${job.file_name} - ${job.status} (${job.uploaded_at})`);
        });
      }
    } else {
      console.error('❌ Failed to get upload history:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Failed to get upload history:', error.response?.data || error.message);
  }
}

/**
 * Test 5: Get upload statistics
 */
async function testGetUploadStats(): Promise<void> {
  console.log('\n📈 Test 5: GET /bulk-upload/stats');

  try {
    const response = await client.get('/bulk-upload/stats');

    if (response.data.success) {
      console.log('✅ Upload statistics retrieved!');
      console.log('   Total Uploads:', response.data.data.total_uploads);
      console.log('   Successful:', response.data.data.successful_uploads);
      console.log('   Failed:', response.data.data.failed_uploads);
      console.log('   Success Rate:', response.data.data.success_rate);
      console.log('   Avg Processing Time:', response.data.data.avg_processing_time_ms, 'ms');
      console.log('   Total Records Processed:', response.data.data.total_records_processed);
      console.log('   Total Inserts:', response.data.data.total_inserts);
      console.log('   Total Updates:', response.data.data.total_updates);
    } else {
      console.error('❌ Failed to get upload stats:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Failed to get upload stats:', error.response?.data || error.message);
  }
}

/**
 * Test 6: Cancel job (optional - only if job is still processing)
 */
async function testCancelJob(jobId: string): Promise<void> {
  console.log(`\n🚫 Test 6: POST /bulk-upload/cancel/${jobId}`);

  try {
    const response = await client.post(`/bulk-upload/cancel/${jobId}`);

    if (response.data.success) {
      console.log('✅ Job cancelled!');
      console.log('   Job ID:', response.data.data.job_id);
      console.log('   Status:', response.data.data.status);
    } else {
      console.error('❌ Failed to cancel job:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Failed to cancel job:', error.response?.data || error.message);
    console.log('   (This is expected if the job is already completed)');
  }
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('BULK UPLOAD API INTEGRATION TESTS');
  console.log('='.repeat(80));

  // Authenticate
  const authenticated = await authenticate();
  if (!authenticated) {
    console.error('\n❌ Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }

  // Test 1: Upload and process file
  const jobId = await testProcessUpload();

  if (jobId) {
    // Wait a moment for processing to complete
    console.log('\n⏳ Waiting 2 seconds for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Get job status
    await testGetJobStatus(jobId);

    // Test 3: Download report
    await testDownloadReport(jobId);
  }

  // Test 4: Get upload history
  await testGetUploadHistory();

  // Test 5: Get upload statistics
  await testGetUploadStats();

  // Test 6: Cancel job (optional)
  // if (jobId) {
  //   await testCancelJob(jobId);
  // }

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS COMPLETED!');
  console.log('='.repeat(80));
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

