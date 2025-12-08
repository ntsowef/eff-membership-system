const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { authenticate, getAuthHeaders, API_URL } = require('../helpers/auth-helper');

/**
 * Test 5 Concurrent Uploads
 *
 * Tests the system with 5 simultaneous file uploads
 * Measures upload time, processing time, and system performance
 */

const CONCURRENT_UPLOADS = 5;
let authToken = null;

// Test configuration
const config = {
  apiUrl: `${API_URL}/api/v1/member-application-bulk-upload`,
  testFiles: [
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-100.xlsx'
  ]
};

// Metrics tracking
const metrics = {
  uploads: [],
  startTime: null,
  endTime: null,
  errors: []
};

/**
 * Upload a single file
 */
async function uploadFile(filePath, uploadNumber, userToken) {
  const startTime = Date.now();

  try {
    console.log(`📤 [Upload ${uploadNumber}] Starting upload: ${path.basename(filePath)}`);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    // Upload file
    const uploadResponse = await axios.post(`${config.apiUrl}/upload`, form, {
      headers: {
        ...form.getHeaders(),
        ...getAuthHeaders(userToken)
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const uploadTime = Date.now() - startTime;
    const uploadUuid = uploadResponse.data.data.upload_uuid;
    
    console.log(`✅ [Upload ${uploadNumber}] File uploaded in ${uploadTime}ms - UUID: ${uploadUuid}`);
    
    // Poll for completion
    const processingStartTime = Date.now();
    let status = 'Pending';
    let pollCount = 0;
    
    while (status !== 'Completed' && status !== 'Failed' && pollCount < 120) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await axios.get(`${config.apiUrl}/status/${uploadUuid}`, {
        headers: getAuthHeaders(userToken)
      });
      status = statusResponse.data.data.status;
      pollCount++;
      
      if (pollCount % 5 === 0) {
        console.log(`⏳ [Upload ${uploadNumber}] Status: ${status} (${pollCount * 2}s elapsed)`);
      }
    }
    
    const processingTime = Date.now() - processingStartTime;
    const totalTime = Date.now() - startTime;

    // Get final status
    const finalResponse = await axios.get(`${config.apiUrl}/status/${uploadUuid}`, {
      headers: getAuthHeaders(userToken)
    });
    const finalStatus = finalResponse.data.data;
    
    console.log(`✅ [Upload ${uploadNumber}] Processing completed in ${processingTime}ms`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Records: ${finalStatus.total_records} total, ${finalStatus.successful_records} success, ${finalStatus.failed_records} failed`);
    
    return {
      uploadNumber,
      fileName: path.basename(filePath),
      uploadUuid,
      uploadTime,
      processingTime,
      totalTime,
      status: finalStatus.status,
      totalRecords: finalStatus.total_records,
      successfulRecords: finalStatus.successful_records,
      failedRecords: finalStatus.failed_records,
      duplicateRecords: finalStatus.duplicate_records || 0
    };
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ [Upload ${uploadNumber}] Error after ${errorTime}ms:`, error.message);

    // Log detailed error information
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }

    return {
      uploadNumber,
      fileName: path.basename(filePath),
      error: error.message,
      errorDetails: error.response?.data,
      errorTime
    };
  }
}

/**
 * Run the test
 */
async function runTest() {
  console.log('🚀 Starting 5 Concurrent Upload Test\n');
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Concurrent uploads: ${CONCURRENT_UPLOADS}\n`);

  // Authenticate test users
  console.log(`🔐 Authenticating ${CONCURRENT_UPLOADS} test users...\n`);
  const userTokens = [];

  for (let i = 1; i <= CONCURRENT_UPLOADS; i++) {
    try {
      const token = await authenticate(i); // Authenticate as test user 1, 2, 3, etc.
      userTokens.push(token);
    } catch (error) {
      console.error(`❌ Failed to authenticate test user ${i}`);
      console.error(`   Make sure test users are created. Run: node test/setup/create-test-users.js`);
      process.exit(1);
    }
  }

  console.log(`✅ All ${CONCURRENT_UPLOADS} users authenticated\n`);

  // Check if test files exist
  const sampleDataDir = path.join(__dirname, '..', 'sample-data', 'output');
  const missingFiles = [];

  for (const fileName of config.testFiles) {
    const filePath = path.join(sampleDataDir, fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileName);
    }
  }

  if (missingFiles.length > 0) {
    console.error('❌ Missing test files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease run: npm run generate:applications');
    process.exit(1);
  }

  // Start test
  metrics.startTime = Date.now();

  // Upload all files concurrently with different user tokens
  const uploadPromises = config.testFiles.map((fileName, index) => {
    const filePath = path.join(sampleDataDir, fileName);
    return uploadFile(filePath, index + 1, userTokens[index]);
  });
  
  const results = await Promise.all(uploadPromises);
  
  metrics.endTime = Date.now();
  metrics.uploads = results.filter(r => !r.error);
  metrics.errors = results.filter(r => r.error);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total test duration: ${(metrics.endTime - metrics.startTime) / 1000}s`);
  console.log(`Successful uploads: ${metrics.uploads.length}/${CONCURRENT_UPLOADS}`);
  console.log(`Failed uploads: ${metrics.errors.length}/${CONCURRENT_UPLOADS}`);
  
  if (metrics.uploads.length > 0) {
    const avgUploadTime = metrics.uploads.reduce((sum, u) => sum + u.uploadTime, 0) / metrics.uploads.length;
    const avgProcessingTime = metrics.uploads.reduce((sum, u) => sum + u.processingTime, 0) / metrics.uploads.length;
    const avgTotalTime = metrics.uploads.reduce((sum, u) => sum + u.totalTime, 0) / metrics.uploads.length;
    const totalRecords = metrics.uploads.reduce((sum, u) => sum + u.totalRecords, 0);
    const successfulRecords = metrics.uploads.reduce((sum, u) => sum + u.successfulRecords, 0);
    
    console.log(`\nAverage upload time: ${avgUploadTime.toFixed(0)}ms`);
    console.log(`Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
    console.log(`Average total time: ${avgTotalTime.toFixed(0)}ms`);
    console.log(`\nTotal records processed: ${totalRecords}`);
    console.log(`Successful records: ${successfulRecords}`);
    console.log(`Processing rate: ${(successfulRecords / ((metrics.endTime - metrics.startTime) / 1000)).toFixed(2)} records/second`);
  }
  
  if (metrics.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    metrics.errors.forEach(error => {
      console.log(`   [Upload ${error.uploadNumber}] ${error.fileName}: ${error.error}`);
    });
  }
  
  console.log('='.repeat(80));
}

// Run the test
runTest().catch(console.error);

