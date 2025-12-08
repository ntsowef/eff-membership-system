const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { authenticate, getAuthHeaders, API_URL } = require('../helpers/auth-helper');

/**
 * Test 15 Concurrent Uploads
 *
 * Tests the system with 15 simultaneous file uploads
 * Measures upload time, processing time, and system performance
 */

const CONCURRENT_UPLOADS = 15;

// Test configuration
const config = {
  apiUrl: `${API_URL}/api/v1/member-application-bulk-upload`,
  testFiles: Array(15).fill(null).map((_, i) => 
    i % 2 === 0 ? 'member-applications-100.xlsx' : 'member-applications-1000.xlsx'
  )
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

    console.log(`✅ [Upload ${uploadNumber}] Completed - Status: ${finalStatus.status}`);
    console.log(`   Upload time: ${uploadTime}ms`);
    console.log(`   Processing time: ${processingTime}ms`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Records: ${finalStatus.total_records} total, ${finalStatus.successful_records} success, ${finalStatus.failed_records} failed`);

    metrics.uploads.push({
      uploadNumber,
      fileName: path.basename(filePath),
      uploadTime,
      processingTime,
      totalTime,
      status: finalStatus.status,
      uploadUuid,
      totalRecords: finalStatus.total_records,
      successfulRecords: finalStatus.successful_records,
      failedRecords: finalStatus.failed_records
    });
    
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ [Upload ${uploadNumber}] Failed after ${errorTime}ms:`, error.message);
    
    metrics.errors.push({
      uploadNumber,
      fileName: path.basename(filePath),
      error: error.message,
      time: errorTime
    });
  }
}

/**
 * Run concurrent upload test
 */
async function runTest() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 CONCURRENT UPLOAD TEST - ${CONCURRENT_UPLOADS} UPLOADS`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Check if test files exist
  const sampleDataDir = path.join(__dirname, '..', 'sample-data', 'output');
  const filePaths = config.testFiles.map(file => path.join(sampleDataDir, file));
  
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Test file not found: ${filePath}`);
      console.log(`\n💡 Run: node test/sample-data/generate-member-applications.js`);
      process.exit(1);
    }
  }
  
  console.log(`✅ All test files found\n`);

  // Authenticate users
  console.log(`🔐 Authenticating ${CONCURRENT_UPLOADS} test users...\n`);
  const userTokens = [];
  for (let i = 1; i <= CONCURRENT_UPLOADS; i++) {
    const token = await authenticate(i);
    userTokens.push(token);
  }
  console.log(`✅ All ${CONCURRENT_UPLOADS} users authenticated\n`);

  // Start test
  metrics.startTime = Date.now();

  // Upload all files concurrently
  const uploadPromises = filePaths.map((filePath, index) =>
    uploadFile(filePath, index + 1, userTokens[index])
  );

  await Promise.all(uploadPromises);
  
  metrics.endTime = Date.now();
  
  // Print results
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 TEST RESULTS`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Total uploads: ${CONCURRENT_UPLOADS}`);
  console.log(`Successful: ${metrics.uploads.length}`);
  console.log(`Failed: ${metrics.errors.length}`);
  console.log(`Total test time: ${metrics.endTime - metrics.startTime}ms\n`);
  
  if (metrics.uploads.length > 0) {
    const avgUploadTime = metrics.uploads.reduce((sum, u) => sum + u.uploadTime, 0) / metrics.uploads.length;
    const avgProcessingTime = metrics.uploads.reduce((sum, u) => sum + u.processingTime, 0) / metrics.uploads.length;
    const avgTotalTime = metrics.uploads.reduce((sum, u) => sum + u.totalTime, 0) / metrics.uploads.length;
    
    console.log(`Average upload time: ${Math.round(avgUploadTime)}ms`);
    console.log(`Average processing time: ${Math.round(avgProcessingTime)}ms`);
    console.log(`Average total time: ${Math.round(avgTotalTime)}ms`);
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
}

runTest().catch(console.error);

