/**
 * Performance Benchmark Script
 * 
 * Tests bulk upload performance with varying file sizes:
 * - 100 records
 * - 500 records
 * - 1000 records
 * - 5000 records
 * 
 * Measures:
 * - Total processing time
 * - Records per second
 * - Average time per record
 * - Memory usage
 * 
 * Target: 500 records in <60 seconds
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'national.admin@eff.org.za',
  password: process.env.TEST_USER_PASSWORD || 'Admin@123'
};

interface BenchmarkResult {
  fileSize: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  newMembers: number;
  existingMembers: number;
  processingTimeMs: number;
  processingTimeSec: number;
  recordsPerSecond: number;
  avgTimePerRecordMs: number;
  memoryUsedMB: number;
  success: boolean;
  error?: string;
}

let authToken: string = '';

// Login
async function login(): Promise<string> {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    const token = response.data.data.token;
    console.log('✅ Login successful');
    return token;
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Upload file
async function uploadFile(filePath: string, token: string): Promise<string> {
  const fileName = path.basename(filePath);
  console.log(`📤 Uploading: ${fileName}`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  
  try {
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
    console.log(`✅ Upload successful - Job ID: ${jobId}`);
    return jobId;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// Monitor job status
async function monitorJob(jobId: string, token: string): Promise<any> {
  console.log('⏳ Monitoring job status...');
  
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes max (300 * 1 second)
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/bulk-upload/status/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const status = response.data.data.status;
      const progress = response.data.data.progress || 0;
      
      if (status === 'completed') {
        console.log('✅ Job completed!');
        return response.data.data;
      } else if (status === 'failed') {
        console.error('❌ Job failed:', response.data.data.error);
        throw new Error(response.data.data.error || 'Job failed');
      }
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error: any) {
      console.error('❌ Error checking status:', error.message);
      throw error;
    }
  }
  
  throw new Error('Job timeout - exceeded maximum wait time');
}

// Run benchmark for a single file
async function runBenchmark(filePath: string, token: string): Promise<BenchmarkResult> {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  const recordCount = parseInt(fileName.match(/(\d+)-records/)?.[1] || '0');
  
  console.log('');
  console.log('='.repeat(80));
  console.log(`📊 BENCHMARK: ${recordCount} records`);
  console.log('='.repeat(80));
  
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const startTime = Date.now();
  
  try {
    // Upload file
    const jobId = await uploadFile(filePath, token);
    
    // Monitor until completion
    const result = await monitorJob(jobId, token);
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    const processingTimeMs = endTime - startTime;
    const processingTimeSec = processingTimeMs / 1000;
    const recordsPerSecond = result.records_processed / processingTimeSec;
    const avgTimePerRecordMs = processingTimeMs / result.records_processed;
    const memoryUsedMB = endMemory - startMemory;
    
    return {
      fileSize: recordCount,
      totalRecords: result.total_records || recordCount,
      validRecords: result.valid_records || 0,
      invalidRecords: result.invalid_records || 0,
      newMembers: result.new_members || 0,
      existingMembers: result.existing_members || 0,
      processingTimeMs,
      processingTimeSec,
      recordsPerSecond,
      avgTimePerRecordMs,
      memoryUsedMB,
      success: true
    };
  } catch (error: any) {
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;
    
    return {
      fileSize: recordCount,
      totalRecords: recordCount,
      validRecords: 0,
      invalidRecords: 0,
      newMembers: 0,
      existingMembers: 0,
      processingTimeMs,
      processingTimeSec: processingTimeMs / 1000,
      recordsPerSecond: 0,
      avgTimePerRecordMs: 0,
      memoryUsedMB: 0,
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('🚀 Bulk Upload Performance Benchmark');
  console.log('='.repeat(80));
  console.log('');
  console.log('Target: 500 records in <60 seconds');
  console.log('');
  
  try {
    // Login
    authToken = await login();
    console.log('');
    
    // Test files
    const testFiles = [
      'benchmark-100-records.xlsx',
      'benchmark-500-records.xlsx',
      'benchmark-1000-records.xlsx',
      'benchmark-5000-records.xlsx'
    ];
    
    const results: BenchmarkResult[] = [];
    
    // Run benchmarks
    for (const fileName of testFiles) {
      const filePath = path.join(__dirname, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${fileName} - file not found`);
        continue;
      }
      
      const result = await runBenchmark(filePath, authToken);
      results.push(result);
      
      // Display result
      console.log('');
      console.log('📊 Results:');
      console.log(`   Total Records:        ${result.totalRecords}`);
      console.log(`   Valid Records:        ${result.validRecords}`);
      console.log(`   Invalid Records:      ${result.invalidRecords}`);
      console.log(`   New Members:          ${result.newMembers}`);
      console.log(`   Existing Members:     ${result.existingMembers}`);
      console.log(`   Processing Time:      ${result.processingTimeSec.toFixed(2)}s`);
      console.log(`   Records/Second:       ${result.recordsPerSecond.toFixed(2)}`);
      console.log(`   Avg Time/Record:      ${result.avgTimePerRecordMs.toFixed(2)}ms`);
      console.log(`   Memory Used:          ${result.memoryUsedMB.toFixed(2)}MB`);
      console.log(`   Status:               ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (result.error) {
        console.log(`   Error:                ${result.error}`);
      }
      
      // Wait 5 seconds between tests
      if (testFiles.indexOf(fileName) < testFiles.length - 1) {
        console.log('');
        console.log('⏳ Waiting 5 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Display summary
    console.log('');
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    // Table header
    console.log('| Records | Time (s) | Records/s | Avg/Record (ms) | Memory (MB) | Status |');
    console.log('|---------|----------|-----------|-----------------|-------------|--------|');

    // Table rows
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(
        `| ${String(result.fileSize).padEnd(7)} | ` +
        `${result.processingTimeSec.toFixed(2).padEnd(8)} | ` +
        `${result.recordsPerSecond.toFixed(2).padEnd(9)} | ` +
        `${result.avgTimePerRecordMs.toFixed(2).padEnd(15)} | ` +
        `${result.memoryUsedMB.toFixed(2).padEnd(11)} | ` +
        `${status} |`
      );
    });

    console.log('');

    // Check target
    const target500 = results.find(r => r.fileSize === 500);
    if (target500) {
      console.log('🎯 TARGET CHECK: 500 records in <60 seconds');
      if (target500.processingTimeSec < 60) {
        console.log(`   ✅ PASSED: ${target500.processingTimeSec.toFixed(2)}s (${(60 - target500.processingTimeSec).toFixed(2)}s under target)`);
      } else {
        console.log(`   ❌ FAILED: ${target500.processingTimeSec.toFixed(2)}s (${(target500.processingTimeSec - 60).toFixed(2)}s over target)`);
      }
    }

    console.log('');

    // Performance insights
    console.log('📈 PERFORMANCE INSIGHTS:');
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
      const avgRecordsPerSec = successfulResults.reduce((sum, r) => sum + r.recordsPerSecond, 0) / successfulResults.length;
      const avgTimePerRecord = successfulResults.reduce((sum, r) => sum + r.avgTimePerRecordMs, 0) / successfulResults.length;

      console.log(`   Average Records/Second:    ${avgRecordsPerSec.toFixed(2)}`);
      console.log(`   Average Time/Record:       ${avgTimePerRecord.toFixed(2)}ms`);

      // Estimate for larger datasets
      const estimate10k = (10000 / avgRecordsPerSec).toFixed(2);
      const estimate50k = (50000 / avgRecordsPerSec).toFixed(2);
      console.log('');
      console.log('📊 PROJECTIONS:');
      console.log(`   10,000 records:            ~${estimate10k}s (~${(parseFloat(estimate10k) / 60).toFixed(2)} minutes)`);
      console.log(`   50,000 records:            ~${estimate50k}s (~${(parseFloat(estimate50k) / 60).toFixed(2)} minutes)`);
    }

    console.log('');
    console.log('✅ Benchmark complete!');

    // Save results to JSON
    const resultsPath = path.join(__dirname, 'benchmark-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📁 Results saved to: ${resultsPath}`);

  } catch (error: any) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

main();

