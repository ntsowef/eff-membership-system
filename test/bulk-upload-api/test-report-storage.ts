/**
 * Test Script for Bulk Upload Report Storage System
 * 
 * Tests all report storage functionality:
 * - Get storage statistics
 * - Get report metadata
 * - Delete reports
 * - Cleanup old reports
 * - Cleanup orphaned reports
 * - Get reports by date range
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const BASE_URL = 'http://localhost:5000/api/v1';
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Create axios instance with auth
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

/**
 * Test: Get report storage statistics
 */
async function testGetStorageStats() {
  console.log('\n📊 TEST: Get Report Storage Statistics');
  console.log('='.repeat(60));

  try {
    const response = await api.get('/bulk-upload/reports/stats');
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Get all report metadata
 */
async function testGetAllReportMetadata() {
  console.log('\n📋 TEST: Get All Report Metadata');
  console.log('='.repeat(60));

  try {
    const response = await api.get('/bulk-upload/reports/metadata?limit=10');
    console.log('✅ Success!');
    console.log(`Found ${response.data.data.count} reports`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Get report metadata for specific job
 */
async function testGetReportMetadata(jobId: string) {
  console.log('\n🔍 TEST: Get Report Metadata for Specific Job');
  console.log('='.repeat(60));
  console.log(`Job ID: ${jobId}`);

  try {
    const response = await api.get(`/bulk-upload/reports/${jobId}/metadata`);
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Delete report
 */
async function testDeleteReport(jobId: string) {
  console.log('\n🗑️  TEST: Delete Report');
  console.log('='.repeat(60));
  console.log(`Job ID: ${jobId}`);

  try {
    const response = await api.delete(`/bulk-upload/reports/${jobId}`);
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Cleanup old reports
 */
async function testCleanupOldReports(retentionDays: number = 90) {
  console.log('\n🧹 TEST: Cleanup Old Reports');
  console.log('='.repeat(60));
  console.log(`Retention Days: ${retentionDays}`);

  try {
    const response = await api.post('/bulk-upload/reports/cleanup', {
      retention_days: retentionDays
    });
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Cleanup orphaned reports
 */
async function testCleanupOrphanedReports() {
  console.log('\n🧹 TEST: Cleanup Orphaned Reports');
  console.log('='.repeat(60));

  try {
    const response = await api.post('/bulk-upload/reports/cleanup-orphaned', {
      reports_dir: 'reports'
    });
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test: Get reports by date range
 */
async function testGetReportsByDateRange() {
  console.log('\n📅 TEST: Get Reports by Date Range');
  console.log('='.repeat(60));

  // Last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  console.log(`Start Date: ${startDate.toISOString()}`);
  console.log(`End Date: ${endDate.toISOString()}`);

  try {
    const response = await api.get('/bulk-upload/reports/date-range', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }
    });
    console.log('✅ Success!');
    console.log(`Found ${response.data.data.count} reports`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 BULK UPLOAD REPORT STORAGE SYSTEM - TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log('='.repeat(60));

  // Test 1: Get storage statistics
  await testGetStorageStats();

  // Test 2: Get all report metadata
  await testGetAllReportMetadata();

  // Test 3: Get reports by date range
  await testGetReportsByDateRange();

  // Test 4: Get report metadata for specific job (replace with actual job ID)
  // await testGetReportMetadata('job-1234567890-1234');

  // Test 5: Cleanup old reports (90 days retention)
  // await testCleanupOldReports(90);

  // Test 6: Cleanup orphaned reports
  // await testCleanupOrphanedReports();

  // Test 7: Delete specific report (replace with actual job ID)
  // await testDeleteReport('job-1234567890-1234');

  console.log('\n✅ All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);

