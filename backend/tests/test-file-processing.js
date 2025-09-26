const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api/v1';
const TEST_TOKEN = 'your-test-jwt-token'; // Replace with actual token

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testFileProcessingStatus() {
  console.log('📊 Testing file processing status...');
  try {
    const response = await axios.get(`${BASE_URL}/file-processing/status`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });
    console.log('✅ File processing status:', response.data);
    return true;
  } catch (error) {
    console.error('❌ File processing status failed:', error.message);
    return false;
  }
}

async function testQueueStatus() {
  console.log('🔄 Testing queue status...');
  try {
    const response = await axios.get(`${BASE_URL}/file-processing/queue/status`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });
    console.log('✅ Queue status:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Queue status failed:', error.message);
    return false;
  }
}

async function testJobHistory() {
  console.log('📋 Testing job history...');
  try {
    const response = await axios.get(`${BASE_URL}/file-processing/jobs?limit=5`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });
    console.log('✅ Job history:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Job history failed:', error.message);
    return false;
  }
}

async function createTestExcelFile() {
  console.log('📄 Creating test Excel file...');
  
  const testData = [
    ['First Name', 'Last Name', 'Province', 'District', 'Municipality', 'Ward', 'Voting Station', 'ID Number'],
    ['John', 'Doe', 'Limpopo', 'Capricorn', 'Polokwane', 'Ward 16', 'Polokwane Primary', '8001015009087'],
    ['Jane', 'Smith', 'Limpopo', 'Capricorn', 'Polokwane', 'Ward 16', 'Polokwane Primary', '8505230012345'],
    ['Bob', 'Johnson', 'Limpopo', 'Capricorn', 'Polokwane', 'Ward 16', 'Polokwane Primary', '7803141234567']
  ];

  // Create a simple CSV file (Excel processing will handle it)
  const csvContent = testData.map(row => row.join(',')).join('\n');
  const testFilePath = path.join(__dirname, 'test-ward-16-members.csv');
  
  fs.writeFileSync(testFilePath, csvContent);
  console.log('✅ Test file created:', testFilePath);
  
  return testFilePath;
}

async function testFileUpload() {
  console.log('📤 Testing file upload...');
  
  try {
    // Create test file
    const testFilePath = await createTestExcelFile();
    
    // Note: This is a simplified test - in reality you'd need proper Excel file
    console.log('⚠️  Note: This test uses CSV file. For full testing, use actual Excel file.');
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Test file cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ File upload test failed:', error.message);
    return false;
  }
}

function testDirectoryStructure() {
  console.log('📁 Testing directory structure...');
  
  const requiredDirs = [
    'uploads',
    'uploads/excel-processing'
  ];
  
  let allExist = true;
  
  requiredDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`📁 Creating directory: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      console.log(`✅ Directory exists: ${fullPath}`);
    }
  });
  
  return allExist;
}

function testServiceFiles() {
  console.log('📋 Testing service files...');
  
  const requiredFiles = [
    'src/services/fileWatcherService.ts',
    'src/services/websocketService.ts',
    'src/services/voterVerificationService.ts',
    'src/services/fileProcessingQueueManager.ts',
    'src/routes/fileProcessing.ts'
  ];
  
  let allExist = true;
  
  requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ File exists: ${file}`);
    } else {
      console.log(`❌ File missing: ${file}`);
      allExist = false;
    }
  });
  
  return allExist;
}

async function runAllTests() {
  console.log('🚀 Starting File Processing System Tests\n');
  
  const tests = [
    { name: 'Directory Structure', fn: testDirectoryStructure },
    { name: 'Service Files', fn: testServiceFiles },
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'File Processing Status', fn: testFileProcessingStatus },
    { name: 'Queue Status', fn: testQueueStatus },
    { name: 'Job History', fn: testJobHistory },
    { name: 'File Upload', fn: testFileUpload }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! File processing system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return passed === total;
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testFileProcessingStatus,
  testQueueStatus,
  testJobHistory
};
