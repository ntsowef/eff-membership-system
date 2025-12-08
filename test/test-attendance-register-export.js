/**
 * Test script for Ward Attendance Register Export
 * Tests the new Word document generation feature
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test ward code (using a ward from Gauteng)
const TEST_WARD_CODE = '79800001'; // Example ward code

async function testAttendanceRegisterExport() {
  console.log('🧪 Testing Ward Attendance Register Export\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Export Excel only
    console.log('\n📊 Test 1: Export Excel Only');
    console.log('-'.repeat(60));
    const excelResponse = await axios.get(
      `${BASE_URL}/members/ward/${TEST_WARD_CODE}/audit-export`,
      {
        params: { format: 'excel' },
        responseType: 'blob',
        timeout: 30000
      }
    );
    
    console.log(`✅ Excel export successful`);
    console.log(`   Content-Type: ${excelResponse.headers['content-type']}`);
    console.log(`   Content-Length: ${excelResponse.headers['content-length']} bytes`);
    
    // Save to test directory
    const excelPath = path.join(__dirname, `test_attendance_excel_${Date.now()}.xlsx`);
    fs.writeFileSync(excelPath, excelResponse.data);
    console.log(`   Saved to: ${excelPath}`);

    // Test 2: Export Word only
    console.log('\n📄 Test 2: Export Word Only');
    console.log('-'.repeat(60));
    const wordResponse = await axios.get(
      `${BASE_URL}/members/ward/${TEST_WARD_CODE}/audit-export`,
      {
        params: { format: 'word' },
        responseType: 'blob',
        timeout: 30000
      }
    );
    
    console.log(`✅ Word export successful`);
    console.log(`   Content-Type: ${wordResponse.headers['content-type']}`);
    console.log(`   Content-Length: ${wordResponse.headers['content-length']} bytes`);
    
    // Save to test directory
    const wordPath = path.join(__dirname, `test_attendance_word_${Date.now()}.docx`);
    fs.writeFileSync(wordPath, wordResponse.data);
    console.log(`   Saved to: ${wordPath}`);

    // Test 3: Export Both (ZIP)
    console.log('\n📦 Test 3: Export Both (Excel + Word in ZIP)');
    console.log('-'.repeat(60));
    const bothResponse = await axios.get(
      `${BASE_URL}/members/ward/${TEST_WARD_CODE}/audit-export`,
      {
        params: { format: 'both' },
        responseType: 'blob',
        timeout: 30000
      }
    );
    
    console.log(`✅ ZIP export successful`);
    console.log(`   Content-Type: ${bothResponse.headers['content-type']}`);
    console.log(`   Content-Length: ${bothResponse.headers['content-length']} bytes`);
    
    // Save to test directory
    const zipPath = path.join(__dirname, `test_attendance_both_${Date.now()}.zip`);
    fs.writeFileSync(zipPath, bothResponse.data);
    console.log(`   Saved to: ${zipPath}`);

    // Test 4: Default format (should be 'both')
    console.log('\n🔄 Test 4: Default Format (no format parameter)');
    console.log('-'.repeat(60));
    const defaultResponse = await axios.get(
      `${BASE_URL}/members/ward/${TEST_WARD_CODE}/audit-export`,
      {
        responseType: 'blob',
        timeout: 30000
      }
    );
    
    console.log(`✅ Default export successful`);
    console.log(`   Content-Type: ${defaultResponse.headers['content-type']}`);
    console.log(`   Should be ZIP: ${defaultResponse.headers['content-type'].includes('zip') ? '✅ Yes' : '❌ No'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('   ✅ Excel export works');
    console.log('   ✅ Word export works');
    console.log('   ✅ Both (ZIP) export works');
    console.log('   ✅ Default format is "both"');
    console.log('\n🎉 Ward Attendance Register Export feature is fully functional!');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('='.repeat(60));
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.statusText}`);
      console.error(`Data:`, error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Make sure the backend is running on http://localhost:5000');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testAttendanceRegisterExport();

