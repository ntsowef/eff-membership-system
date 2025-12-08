const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { authenticate, getAuthHeaders, API_URL } = require('../helpers/auth-helper');

/**
 * Scenario 4: Mixed Files Test
 *
 * 20 users uploading mixed file sizes
 * Expected: Priority system should work, smaller files should complete faster
 */

const CONCURRENT_USERS = 20;

const config = {
  apiUrl: `${API_URL}/api/v1/member-application-bulk-upload`,
  testFiles: [
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-5000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-10000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-5000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-5000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-10000.xlsx',
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx',
    'member-applications-100.xlsx'
  ]
};

const metrics = { uploads: [], startTime: null, endTime: null, errors: [] };

async function uploadFile(filePath, userNumber, userToken) {
  const startTime = Date.now();

  try {
    console.log(`📤 [User ${userNumber}] Starting upload: ${path.basename(filePath)}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${config.apiUrl}/upload`, form, {
      headers: { ...form.getHeaders(), ...getAuthHeaders(userToken) },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000
    });

    const uploadTime = Date.now() - startTime;
    const uploadUuid = uploadResponse.data.data.upload_uuid;

    console.log(`✅ [User ${userNumber}] File uploaded in ${uploadTime}ms - UUID: ${uploadUuid}`);

    const processingStartTime = Date.now();
    let status = 'Pending';
    let pollCount = 0;

    while (status !== 'Completed' && status !== 'Failed' && pollCount < 300) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await axios.get(`${config.apiUrl}/status/${uploadUuid}`, {
        headers: getAuthHeaders(userToken)
      });
      status = statusResponse.data.data.status;
      pollCount++;

      if (pollCount % 10 === 0) {
        console.log(`⏳ [User ${userNumber}] Status: ${status} (${pollCount * 2}s elapsed)`);
      }
    }

    const processingTime = Date.now() - processingStartTime;
    const totalTime = Date.now() - startTime;

    // Get final status
    const finalResponse = await axios.get(`${config.apiUrl}/status/${uploadUuid}`, {
      headers: getAuthHeaders(userToken)
    });
    const finalStatus = finalResponse.data.data;

    console.log(`✅ [User ${userNumber}] Completed - Status: ${finalStatus.status}`);
    console.log(`   Records: ${finalStatus.total_records} total, ${finalStatus.successful_records} success, ${finalStatus.failed_records} failed`);

    metrics.uploads.push({
      userNumber,
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
    console.error(`❌ [User ${userNumber}] Failed after ${errorTime}ms:`, error.message);
    
    metrics.errors.push({
      userNumber,
      fileName: path.basename(filePath),
      error: error.message,
      time: errorTime
    });
  }
}

async function runTest() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 SCENARIO 4: MIXED FILES TEST`);
  console.log(`   ${CONCURRENT_USERS} users uploading mixed file sizes`);
  console.log(`${'='.repeat(80)}\n`);
  
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
  console.log(`🔐 Authenticating ${CONCURRENT_USERS} test users...\n`);
  const userTokens = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const token = await authenticate(i);
    userTokens.push(token);
  }
  console.log(`✅ All ${CONCURRENT_USERS} users authenticated\n`);

  metrics.startTime = Date.now();

  const uploadPromises = filePaths.map((filePath, index) =>
    uploadFile(filePath, index + 1, userTokens[index])
  );
  
  await Promise.all(uploadPromises);
  
  metrics.endTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SCENARIO 4 RESULTS`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Total users: ${CONCURRENT_USERS}`);
  console.log(`Successful uploads: ${metrics.uploads.length}`);
  console.log(`Failed uploads: ${metrics.errors.length}`);
  console.log(`Total test time: ${((metrics.endTime - metrics.startTime) / 1000 / 60).toFixed(2)} minutes\n`);
  
  if (metrics.uploads.length > 0) {
    const avgUploadTime = metrics.uploads.reduce((sum, u) => sum + u.uploadTime, 0) / metrics.uploads.length;
    const avgProcessingTime = metrics.uploads.reduce((sum, u) => sum + u.processingTime, 0) / metrics.uploads.length;
    const avgTotalTime = metrics.uploads.reduce((sum, u) => sum + u.totalTime, 0) / metrics.uploads.length;
    
    console.log(`Average upload time: ${(avgUploadTime / 1000).toFixed(2)}s`);
    console.log(`Average processing time: ${(avgProcessingTime / 1000).toFixed(2)}s`);
    console.log(`Average total time: ${(avgTotalTime / 1000).toFixed(2)}s`);
  }
  
  console.log(`\n✅ Expected: Priority system works, smaller files complete faster`);
  console.log(`${'='.repeat(80)}\n`);
}

runTest().catch(console.error);

