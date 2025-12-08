/**
 * Test Script: Triple Upload Fix Verification
 * 
 * This script tests that the triple upload issue has been fixed.
 * It verifies that only ONE database entry is created per upload attempt.
 * 
 * Prerequisites:
 * - Backend server running on localhost:5000
 * - Database accessible
 * - Valid authentication token
 * 
 * Usage:
 *   node test/test-triple-upload-fix.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'eff_membership',
  user: 'postgres',
  password: 'postgres'
};

// Create database pool
const pool = new Pool(DB_CONFIG);

// Test credentials (update with valid credentials)
const TEST_CREDENTIALS = {
  email: 'superadmin@eff.org.za',
  password: 'Admin@123'
};

let authToken = '';

/**
 * Login and get authentication token
 */
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get count of upload records before test
 */
async function getUploadCountBefore() {
  const result = await pool.query('SELECT COUNT(*) as count FROM uploaded_files');
  return parseInt(result.rows[0].count);
}

/**
 * Get count of upload records after test
 */
async function getUploadCountAfter() {
  const result = await pool.query('SELECT COUNT(*) as count FROM uploaded_files');
  return parseInt(result.rows[0].count);
}

/**
 * Get the most recent upload records
 */
async function getRecentUploads(limit = 5) {
  const result = await pool.query(
    'SELECT file_id, original_filename, status, created_at FROM uploaded_files ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

/**
 * Create a test Excel file
 */
function createTestFile() {
  const testFilePath = path.join(__dirname, 'test-upload-file.xlsx');
  
  // Create a simple test file (you can replace this with actual Excel file creation)
  const content = 'Test file content for upload verification';
  fs.writeFileSync(testFilePath, content);
  
  return testFilePath;
}

/**
 * Upload a file and verify only one entry is created
 */
async function testUpload() {
  console.log('\n📤 Testing file upload...');
  
  // Get count before upload
  const countBefore = await getUploadCountBefore();
  console.log(`📊 Upload records before test: ${countBefore}`);
  
  // Create test file
  const testFilePath = createTestFile();
  console.log(`📄 Created test file: ${testFilePath}`);
  
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    
    // Upload file
    console.log('⏳ Uploading file...');
    const response = await axios.post(
      `${API_BASE_URL}/self-data-management/bulk-upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✅ Upload response:', response.data);
    
    // Wait a moment for any potential retries
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get count after upload
    const countAfter = await getUploadCountAfter();
    console.log(`📊 Upload records after test: ${countAfter}`);
    
    // Calculate difference
    const difference = countAfter - countBefore;
    console.log(`📈 New records created: ${difference}`);
    
    // Verify only one entry was created
    if (difference === 1) {
      console.log('✅ SUCCESS: Only ONE upload entry was created!');
      return true;
    } else {
      console.error(`❌ FAILURE: Expected 1 entry, but ${difference} entries were created!`);
      
      // Show recent uploads for debugging
      console.log('\n📋 Recent uploads:');
      const recentUploads = await getRecentUploads(5);
      console.table(recentUploads);
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    
    // Check if multiple entries were created despite the error
    const countAfter = await getUploadCountAfter();
    const difference = countAfter - countBefore;
    
    if (difference > 1) {
      console.error(`❌ CRITICAL: Upload failed but ${difference} entries were created!`);
      
      // Show recent uploads for debugging
      console.log('\n📋 Recent uploads:');
      const recentUploads = await getRecentUploads(5);
      console.table(recentUploads);
    }
    
    throw error;
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🗑️  Cleaned up test file');
    }
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Starting Triple Upload Fix Verification Test\n');
  
  try {
    // Login
    await login();
    
    // Run upload test
    const success = await testUpload();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ TEST PASSED: Triple upload issue is FIXED!');
    } else {
      console.log('❌ TEST FAILED: Triple upload issue still exists!');
    }
    console.log('='.repeat(50));
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the test
runTest();

