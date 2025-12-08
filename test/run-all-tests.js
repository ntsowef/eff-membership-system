const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Master Test Runner
 * 
 * Runs all test scripts sequentially and generates a comprehensive report
 */

const TEST_SCRIPTS = [
  // Concurrent upload tests
  { name: 'Test 5 Concurrent Uploads', path: 'test/concurrent-uploads/test-5-concurrent.js' },
  { name: 'Test 10 Concurrent Uploads', path: 'test/concurrent-uploads/test-10-concurrent.js' },
  { name: 'Test 15 Concurrent Uploads', path: 'test/concurrent-uploads/test-15-concurrent.js' },
  { name: 'Test 20 Concurrent Uploads', path: 'test/concurrent-uploads/test-20-concurrent.js' },
  
  // Scenario tests
  { name: 'Scenario 1: Small Files', path: 'test/scenarios/scenario-1-small-files.js' },
  { name: 'Scenario 2: Medium Files', path: 'test/scenarios/scenario-2-medium-files.js' },
  { name: 'Scenario 3: Large Files', path: 'test/scenarios/scenario-3-large-files.js' },
  { name: 'Scenario 4: Mixed Files', path: 'test/scenarios/scenario-4-mixed-files.js' },
  { name: 'Scenario 5: Stress Test', path: 'test/scenarios/scenario-5-stress-test.js' }
];

const results = {
  tests: [],
  summary: {
    totalTests: TEST_SCRIPTS.length,
    passedTests: 0,
    failedTests: 0,
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    totalDuration: 0
  }
};

/**
 * Run a single test script
 */
async function runTest(testScript) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`🧪 Running: ${testScript.name}`);
    console.log(`   Script: ${testScript.path}`);
    console.log(`${'='.repeat(100)}\n`);
    
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';
    
    const child = spawn('node', [testScript.path], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
    });
    
    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      errorOutput += text;
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      // Parse metrics from output
      const metrics = parseMetrics(output);
      
      const result = {
        name: testScript.name,
        path: testScript.path,
        success,
        duration,
        exitCode: code,
        ...metrics
      };
      
      results.tests.push(result);
      
      if (success) {
        results.summary.passedTests++;
        console.log(`\n✅ ${testScript.name} PASSED (${(duration / 1000).toFixed(2)}s)\n`);
      } else {
        results.summary.failedTests++;
        console.log(`\n❌ ${testScript.name} FAILED (${(duration / 1000).toFixed(2)}s)\n`);
      }
      
      // Update summary
      results.summary.totalUploads += metrics.totalUploads || 0;
      results.summary.successfulUploads += metrics.successfulUploads || 0;
      results.summary.failedUploads += metrics.failedUploads || 0;
      results.summary.totalRecords += metrics.totalRecords || 0;
      results.summary.successfulRecords += metrics.successfulRecords || 0;
      results.summary.failedRecords += metrics.failedRecords || 0;
      results.summary.totalDuration += duration;
      
      resolve(result);
    });
  });
}

/**
 * Parse metrics from test output
 */
function parseMetrics(output) {
  const metrics = {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    avgUploadTime: 0,
    avgProcessingTime: 0,
    avgTotalTime: 0
  };
  
  // Extract metrics from output
  const uploadsMatch = output.match(/Total uploads:\s+(\d+)/);
  const successMatch = output.match(/Successful:\s+(\d+)/);
  const failedMatch = output.match(/Failed:\s+(\d+)/);
  const recordsMatch = output.match(/Total records:\s+(\d+)/);
  const successRecordsMatch = output.match(/Successful records:\s+(\d+)/);
  const failedRecordsMatch = output.match(/Failed records:\s+(\d+)/);
  const avgUploadMatch = output.match(/Average upload time:\s+([\d.]+)/);
  const avgProcessingMatch = output.match(/Average processing time:\s+([\d.]+)/);
  const avgTotalMatch = output.match(/Average total time:\s+([\d.]+)/);
  
  if (uploadsMatch) metrics.totalUploads = parseInt(uploadsMatch[1]);
  if (successMatch) metrics.successfulUploads = parseInt(successMatch[1]);
  if (failedMatch) metrics.failedUploads = parseInt(failedMatch[1]);
  if (recordsMatch) metrics.totalRecords = parseInt(recordsMatch[1]);
  if (successRecordsMatch) metrics.successfulRecords = parseInt(successRecordsMatch[1]);
  if (failedRecordsMatch) metrics.failedRecords = parseInt(failedRecordsMatch[1]);
  if (avgUploadMatch) metrics.avgUploadTime = parseFloat(avgUploadMatch[1]);
  if (avgProcessingMatch) metrics.avgProcessingTime = parseFloat(avgProcessingMatch[1]);
  if (avgTotalMatch) metrics.avgTotalTime = parseFloat(avgTotalMatch[1]);

  return metrics;
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  const report = [];

  report.push('');
  report.push('='.repeat(100));
  report.push('📊 COMPREHENSIVE TEST REPORT');
  report.push('='.repeat(100));
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');

  // Overall Summary
  report.push('━'.repeat(100));
  report.push('📈 OVERALL SUMMARY');
  report.push('━'.repeat(100));
  report.push('');
  report.push(`Total Tests:           ${results.summary.totalTests}`);
  report.push(`Passed Tests:          ${results.summary.passedTests} ✅`);
  report.push(`Failed Tests:          ${results.summary.failedTests} ${results.summary.failedTests > 0 ? '❌' : ''}`);
  report.push(`Success Rate:          ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(2)}%`);
  report.push('');
  report.push(`Total Duration:        ${(results.summary.totalDuration / 1000).toFixed(2)}s`);
  report.push(`Average Test Duration: ${(results.summary.totalDuration / results.summary.totalTests / 1000).toFixed(2)}s`);
  report.push('');

  // Upload Statistics
  report.push('━'.repeat(100));
  report.push('📤 UPLOAD STATISTICS');
  report.push('━'.repeat(100));
  report.push('');
  report.push(`Total Uploads:         ${results.summary.totalUploads}`);
  report.push(`Successful Uploads:    ${results.summary.successfulUploads} ✅`);
  report.push(`Failed Uploads:        ${results.summary.failedUploads} ${results.summary.failedUploads > 0 ? '❌' : ''}`);
  report.push(`Upload Success Rate:   ${results.summary.totalUploads > 0 ? ((results.summary.successfulUploads / results.summary.totalUploads) * 100).toFixed(2) : 0}%`);
  report.push('');

  // Record Statistics
  report.push('━'.repeat(100));
  report.push('📋 RECORD PROCESSING STATISTICS');
  report.push('━'.repeat(100));
  report.push('');
  report.push(`Total Records:         ${results.summary.totalRecords}`);
  report.push(`Successful Records:    ${results.summary.successfulRecords} ✅`);
  report.push(`Failed Records:        ${results.summary.failedRecords} ${results.summary.failedRecords > 0 ? '❌' : ''}`);
  report.push(`Record Success Rate:   ${results.summary.totalRecords > 0 ? ((results.summary.successfulRecords / results.summary.totalRecords) * 100).toFixed(2) : 0}%`);
  report.push('');

  // Individual Test Results
  report.push('━'.repeat(100));
  report.push('📝 INDIVIDUAL TEST RESULTS');
  report.push('━'.repeat(100));
  report.push('');

  results.tests.forEach((test, index) => {
    report.push(`${index + 1}. ${test.name} ${test.success ? '✅' : '❌'}`);
    report.push(`   Path:                ${test.path}`);
    report.push(`   Duration:            ${(test.duration / 1000).toFixed(2)}s`);
    report.push(`   Exit Code:           ${test.exitCode}`);
    report.push(`   Total Uploads:       ${test.totalUploads || 0}`);
    report.push(`   Successful Uploads:  ${test.successfulUploads || 0}`);
    report.push(`   Failed Uploads:      ${test.failedUploads || 0}`);
    report.push(`   Total Records:       ${test.totalRecords || 0}`);
    report.push(`   Successful Records:  ${test.successfulRecords || 0}`);
    report.push(`   Failed Records:      ${test.failedRecords || 0}`);

    if (test.avgUploadTime) {
      report.push(`   Avg Upload Time:     ${test.avgUploadTime.toFixed(2)}ms`);
    }
    if (test.avgProcessingTime) {
      report.push(`   Avg Processing Time: ${test.avgProcessingTime.toFixed(2)}ms`);
    }
    if (test.avgTotalTime) {
      report.push(`   Avg Total Time:      ${test.avgTotalTime.toFixed(2)}ms`);
    }

    report.push('');
  });

  report.push('='.repeat(100));
  report.push('');

  return report.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(98) + '╗');
  console.log('║' + ' '.repeat(30) + '🚀 MASTER TEST RUNNER' + ' '.repeat(47) + '║');
  console.log('╚' + '═'.repeat(98) + '╝');
  console.log('');
  console.log(`Running ${TEST_SCRIPTS.length} test scripts sequentially...`);
  console.log('');

  const startTime = Date.now();

  // Run all tests sequentially
  for (const testScript of TEST_SCRIPTS) {
    await runTest(testScript);

    // Wait 2 seconds between tests
    if (TEST_SCRIPTS.indexOf(testScript) < TEST_SCRIPTS.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Generate report
  const report = generateReport();

  // Display report
  console.log(report);

  // Save report to file
  const reportPath = path.join(__dirname, 'test-results.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: ${reportPath}\n`);

  // Exit with appropriate code
  const exitCode = results.summary.failedTests > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

