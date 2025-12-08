/**
 * Simple Performance Benchmark
 * Tests one file at a time
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_USER = {
  email: 'national.admin@eff.org.za',
  password: 'Admin@123'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
  authToken = response.data.data.token;
  console.log('✅ Login successful\n');
  return authToken;
}

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`📤 Uploading: ${fileName}`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post(
    `${API_BASE_URL}/bulk-upload/process`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  const jobId = response.data.data.job_id;
  console.log(`✅ Upload successful - Job ID: ${jobId}\n`);
  return jobId;
}

async function monitorJob(jobId) {
  console.log('⏳ Monitoring job...');
  
  let attempts = 0;
  const maxAttempts = 600; // 10 minutes
  
  while (attempts < maxAttempts) {
    const response = await axios.get(
      `${API_BASE_URL}/bulk-upload/status/${jobId}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );
    
    const status = response.data.data.status;
    const progress = response.data.data.progress || 0;
    
    if (status === 'completed') {
      console.log('✅ Job completed!\n');
      return response.data.data;
    } else if (status === 'failed') {
      throw new Error(response.data.data.error || 'Job failed');
    }
    
    // Show progress every 10 attempts
    if (attempts % 10 === 0) {
      console.log(`   Progress: ${progress}% - Status: ${status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('Job timeout');
}

async function runBenchmark(fileName) {
  const filePath = path.join(__dirname, fileName);
  const recordCount = parseInt(fileName.match(/(\d+)-records/)?.[1] || '0');
  
  console.log('='.repeat(80));
  console.log(`📊 BENCHMARK: ${recordCount} records`);
  console.log('='.repeat(80));
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const jobId = await uploadFile(filePath);
    const result = await monitorJob(jobId);
    
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;
    const processingTimeSec = processingTimeMs / 1000;
    const recordsPerSecond = result.records_processed / processingTimeSec;
    const avgTimePerRecordMs = processingTimeMs / result.records_processed;
    
    console.log('📊 RESULTS:');
    console.log(`   Total Records:        ${result.total_records || recordCount}`);
    console.log(`   Valid Records:        ${result.valid_records || 0}`);
    console.log(`   Invalid Records:      ${result.invalid_records || 0}`);
    console.log(`   New Members:          ${result.new_members || 0}`);
    console.log(`   Existing Members:     ${result.existing_members || 0}`);
    console.log(`   Processing Time:      ${processingTimeSec.toFixed(2)}s`);
    console.log(`   Records/Second:       ${recordsPerSecond.toFixed(2)}`);
    console.log(`   Avg Time/Record:      ${avgTimePerRecordMs.toFixed(2)}ms`);
    console.log(`   Status:               ✅ SUCCESS`);
    console.log('');
    
    return {
      fileSize: recordCount,
      totalRecords: result.total_records || recordCount,
      validRecords: result.valid_records || 0,
      processingTimeSec,
      recordsPerSecond,
      avgTimePerRecordMs,
      success: true
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      fileSize: recordCount,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Bulk Upload Performance Benchmark');
  console.log('='.repeat(80));
  console.log('Target: 500 records in <60 seconds');
  console.log('');
  
  try {
    await login();
    
    // Get file name from command line or use default
    const fileName = process.argv[2] || 'benchmark-100-records.xlsx';
    
    const result = await runBenchmark(fileName);
    
    // Check target if 500 records
    if (result.fileSize === 500 && result.success) {
      console.log('🎯 TARGET CHECK: 500 records in <60 seconds');
      if (result.processingTimeSec < 60) {
        console.log(`   ✅ PASSED: ${result.processingTimeSec.toFixed(2)}s`);
      } else {
        console.log(`   ❌ FAILED: ${result.processingTimeSec.toFixed(2)}s`);
      }
    }
    
    console.log('');
    console.log('✅ Benchmark complete!');
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

main();

