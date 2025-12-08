const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { authenticate, getAuthHeaders, API_URL } = require('../helpers/auth-helper');

/**
 * Scenario 5: Stress Test
 *
 * Continuous uploads for 10 minutes
 * Expected: System should remain stable, no memory leaks, consistent performance
 */

const TEST_DURATION_MINUTES = 10;
const CONCURRENT_UPLOADS = 5;

const config = {
  apiUrl: `${API_URL}/api/v1/member-application-bulk-upload`,
  testFiles: [
    'member-applications-100.xlsx',
    'member-applications-1000.xlsx'
  ]
};

const metrics = {
  uploads: [],
  errors: [],
  startTime: null,
  endTime: null,
  totalUploads: 0
};

async function uploadFile(filePath, uploadNumber, userToken) {
  const startTime = Date.now();

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${config.apiUrl}/upload`, form, {
      headers: { ...form.getHeaders(), ...getAuthHeaders(userToken) },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const uploadTime = Date.now() - startTime;
    const uploadUuid = uploadResponse.data.data.upload_uuid;

    console.log(`✅ [Upload ${uploadNumber}] Uploaded in ${uploadTime}ms - UUID: ${uploadUuid}`);

    metrics.uploads.push({
      uploadNumber,
      fileName: path.basename(filePath),
      uploadTime,
      uploadUuid,
      timestamp: new Date()
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ [Upload ${uploadNumber}] Failed after ${errorTime}ms:`, error.message);

    metrics.errors.push({
      uploadNumber,
      fileName: path.basename(filePath),
      error: error.message,
      time: errorTime,
      timestamp: new Date()
    });
  }
}

async function runStressTest() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 SCENARIO 5: STRESS TEST`);
  console.log(`   Continuous uploads for ${TEST_DURATION_MINUTES} minutes`);
  console.log(`   ${CONCURRENT_UPLOADS} concurrent uploads at a time`);
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
  console.log(`🔐 Authenticating ${CONCURRENT_UPLOADS} test users...\n`);
  const userTokens = [];
  for (let i = 1; i <= CONCURRENT_UPLOADS; i++) {
    const token = await authenticate(i);
    userTokens.push(token);
  }
  console.log(`✅ All ${CONCURRENT_UPLOADS} users authenticated\n`);

  console.log(`🚀 Starting stress test...\n`);

  metrics.startTime = Date.now();
  const endTime = metrics.startTime + (TEST_DURATION_MINUTES * 60 * 1000);

  let uploadNumber = 0;
  let activeUploads = [];

  // Progress reporting interval
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - metrics.startTime) / 1000 / 60).toFixed(2);
    const successRate = metrics.uploads.length / (metrics.uploads.length + metrics.errors.length) * 100;
    console.log(`\n📊 Progress: ${elapsed}/${TEST_DURATION_MINUTES} minutes`);
    console.log(`   Total uploads: ${metrics.uploads.length + metrics.errors.length}`);
    console.log(`   Successful: ${metrics.uploads.length}`);
    console.log(`   Failed: ${metrics.errors.length}`);
    console.log(`   Success rate: ${successRate.toFixed(2)}%`);
    console.log(`   Active uploads: ${activeUploads.length}\n`);
  }, 30000); // Every 30 seconds

  // Main upload loop
  while (Date.now() < endTime) {
    // Maintain concurrent uploads
    while (activeUploads.length < CONCURRENT_UPLOADS && Date.now() < endTime) {
      uploadNumber++;
      const filePath = filePaths[uploadNumber % filePaths.length];
      const userToken = userTokens[uploadNumber % CONCURRENT_UPLOADS];

      const uploadPromise = uploadFile(filePath, uploadNumber, userToken)
        .finally(() => {
          // Remove from active uploads when done
          const index = activeUploads.indexOf(uploadPromise);
          if (index > -1) {
            activeUploads.splice(index, 1);
          }
        });
      
      activeUploads.push(uploadPromise);
      
      // Small delay between starting uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Wait for remaining uploads to complete
  console.log(`\n⏳ Waiting for remaining uploads to complete...`);
  await Promise.all(activeUploads);
  
  clearInterval(progressInterval);
  metrics.endTime = Date.now();
  
  // Print final results
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 SCENARIO 5 FINAL RESULTS`);
  console.log(`${'='.repeat(80)}\n`);
  
  const totalTime = (metrics.endTime - metrics.startTime) / 1000 / 60;
  const successRate = metrics.uploads.length / (metrics.uploads.length + metrics.errors.length) * 100;
  const uploadsPerMinute = (metrics.uploads.length + metrics.errors.length) / totalTime;
  
  console.log(`Test duration: ${totalTime.toFixed(2)} minutes`);
  console.log(`Total uploads attempted: ${metrics.uploads.length + metrics.errors.length}`);
  console.log(`Successful uploads: ${metrics.uploads.length}`);
  console.log(`Failed uploads: ${metrics.errors.length}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  console.log(`Uploads per minute: ${uploadsPerMinute.toFixed(2)}`);
  
  if (metrics.uploads.length > 0) {
    const avgUploadTime = metrics.uploads.reduce((sum, u) => sum + u.uploadTime, 0) / metrics.uploads.length;
    console.log(`Average upload time: ${(avgUploadTime / 1000).toFixed(2)}s`);
  }
  
  console.log(`\n✅ Expected: System stable, no memory leaks, consistent performance`);
  console.log(`${'='.repeat(80)}\n`);
}

runStressTest().catch(console.error);

