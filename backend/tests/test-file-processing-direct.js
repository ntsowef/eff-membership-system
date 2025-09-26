const path = require('path');
const fs = require('fs');

// Test the file processing services directly
async function testFileProcessingServices() {
  console.log('🧪 Testing File Processing Services Directly\n');

  try {
    // Import the services (using require for CommonJS compatibility)
    const { FileWatcherService } = require('../dist/services/fileWatcherService');
    const { FileProcessingQueueManager } = require('../dist/services/fileProcessingQueueManager');
    const { VoterVerificationService } = require('../dist/services/voterVerificationService');
    const { redisService } = require('../dist/services/redisService');

    console.log('✅ Services imported successfully');

    // Test Redis connection
    console.log('\n📊 Testing Redis Connection...');
    const redisHealth = await redisService.healthCheck();
    console.log('Redis Health:', redisHealth);

    // Test file watcher
    console.log('\n📁 Testing File Watcher...');
    const fileWatcher = FileWatcherService.getInstance();
    console.log('File Watcher Active:', fileWatcher.isActive());
    console.log('Upload Directory:', fileWatcher.getUploadDirectory());

    // Check if files exist in the directory
    const uploadDir = path.join(__dirname, 'uploads', 'excel-processing');
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    console.log('Excel files found:', files);

    // Test queue manager
    console.log('\n🔄 Testing Queue Manager...');
    const queueManager = FileProcessingQueueManager.getInstance();
    console.log('Queue Manager Processing:', queueManager.isCurrentlyProcessing());

    // Get queue status
    const queueStatus = await queueManager.getQueueStatus();
    console.log('Queue Status:', queueStatus);

    // Get job history
    const jobHistory = await queueManager.getJobHistory(5);
    console.log('Recent Jobs:', jobHistory.length);

    // Test voter verification service (just the token part)
    console.log('\n⚡ Testing Voter Verification Service...');
    try {
      // This will test the IEC API connection
      const token = await VoterVerificationService.getAccessToken();
      console.log('✅ IEC API Token obtained successfully');
    } catch (error) {
      console.log('❌ IEC API Token failed:', error.message);
    }

    console.log('\n🎉 Direct service testing completed!');

  } catch (error) {
    console.error('❌ Service testing failed:', error);
  }
}

// Test file processing on existing file
async function testFileProcessingOnExistingFile() {
  console.log('\n📄 Testing File Processing on Existing File...');

  try {
    const { VoterVerificationService } = require('../dist/services/voterVerificationService');
    
    const testFile = path.join(__dirname, 'uploads', 'excel-processing', 'WARD_73_Test_Processing.xlsx');
    
    if (fs.existsSync(testFile)) {
      console.log('✅ Test file found:', testFile);
      console.log('File size:', fs.statSync(testFile).size, 'bytes');
      
      // Test processing (this will take time due to API calls)
      console.log('🔄 Starting file processing...');
      console.log('⚠️  This may take several minutes due to IEC API calls...');
      
      const result = await VoterVerificationService.processExcelFile(
        testFile,
        73, // Ward number extracted from filename
        (progress, message) => {
          console.log(`📊 Progress: ${progress}% - ${message}`);
        }
      );
      
      console.log('🎉 Processing completed!');
      console.log('Result:', JSON.stringify(result, null, 2));
      
    } else {
      console.log('❌ Test file not found');
    }
    
  } catch (error) {
    console.error('❌ File processing test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await testFileProcessingServices();
  
  // Ask user if they want to run the full file processing test
  console.log('\n❓ Do you want to test actual file processing with IEC API calls?');
  console.log('   This will take several minutes and make real API calls.');
  console.log('   Press Ctrl+C to skip, or wait 10 seconds to continue...');
  
  // Wait 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await testFileProcessingOnExistingFile();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
