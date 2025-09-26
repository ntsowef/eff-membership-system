#!/usr/bin/env node

// War Council Test Runner
// Runs all War Council tests in sequence and provides comprehensive reporting

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class WarCouncilTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪',
      'section': '📋'
    };
    
    console.log(`${icons[type] || ''} [${timestamp}] ${message}`);
  }

  async runNodeTest(testFile, testName) {
    return new Promise((resolve) => {
      this.log(`Running ${testName}...`, 'test');
      
      const testPath = path.join(__dirname, testFile);
      const child = spawn('node', [testPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const result = {
          name: testName,
          file: testFile,
          exitCode: code,
          stdout,
          stderr,
          success: code === 0,
          duration: Date.now() - this.startTime
        };

        this.testResults.push(result);

        if (code === 0) {
          this.log(`✅ ${testName} completed successfully`, 'success');
        } else {
          this.log(`❌ ${testName} failed with exit code ${code}`, 'error');
        }

        resolve(result);
      });

      child.on('error', (error) => {
        this.log(`❌ Failed to run ${testName}: ${error.message}`, 'error');
        
        const result = {
          name: testName,
          file: testFile,
          exitCode: -1,
          stdout: '',
          stderr: error.message,
          success: false,
          duration: Date.now() - this.startTime
        };

        this.testResults.push(result);
        resolve(result);
      });
    });
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'section');

    // Check if Node.js modules are available
    const requiredModules = ['mysql2', 'axios'];
    const missingModules = [];

    for (const module of requiredModules) {
      try {
        require.resolve(module);
        this.log(`✅ ${module} is available`, 'success');
      } catch (error) {
        missingModules.push(module);
        this.log(`❌ ${module} is missing`, 'error');
      }
    }

    if (missingModules.length > 0) {
      this.log(`Missing required modules: ${missingModules.join(', ')}`, 'error');
      this.log('Please install missing modules with: npm install ' + missingModules.join(' '), 'info');
      return false;
    }

    // Check if test files exist
    const testFiles = [
      'test-war-council-database.js',
      'test-war-council-api.js',
      'test-war-council-integration.js'
    ];

    for (const file of testFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        this.log(`✅ ${file} found`, 'success');
      } else {
        this.log(`❌ ${file} not found`, 'error');
        return false;
      }
    }

    // Check database connection
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'membership_new'
      });
      await connection.end();
      this.log('✅ Database connection successful', 'success');
    } catch (error) {
      this.log(`❌ Database connection failed: ${error.message}`, 'error');
      this.log('Please ensure MySQL is running and membership_new database exists', 'warning');
      return false;
    }

    // Check API availability (optional)
    try {
      const axios = require('axios');
      await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
      this.log('✅ Backend API is accessible', 'success');
    } catch (error) {
      this.log('⚠️  Backend API is not accessible - API tests will be skipped', 'warning');
    }

    return true;
  }

  async runAllTests() {
    this.log('🚀 Starting War Council Test Suite', 'section');
    
    // Check prerequisites
    const prerequisitesOk = await this.checkPrerequisites();
    if (!prerequisitesOk) {
      this.log('❌ Prerequisites check failed. Aborting test run.', 'error');
      return;
    }

    this.log('Prerequisites check passed. Starting tests...', 'success');

    // Define test sequence
    const tests = [
      {
        file: 'test-war-council-database.js',
        name: 'Database Schema & Structure Test',
        description: 'Validates database tables, constraints, and data integrity'
      },
      {
        file: 'test-war-council-api.js',
        name: 'API Endpoints Test',
        description: 'Tests all War Council API endpoints for functionality'
      },
      {
        file: 'test-war-council-integration.js',
        name: 'Integration Test',
        description: 'Comprehensive test of database-API integration and consistency'
      }
    ];

    // Run tests sequentially
    for (const test of tests) {
      this.log(`\n📋 ${test.name}`, 'section');
      this.log(`Description: ${test.description}`, 'info');
      
      await this.runNodeTest(test.file, test.name);
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate report
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📊 WAR COUNCIL TEST SUITE REPORT');
    console.log('='.repeat(80));

    // Summary
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`   📊 Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

    // Detailed results
    console.log(`\n📋 DETAILED RESULTS:`);
    this.testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   File: ${result.file}`);
      console.log(`   Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Exit Code: ${result.exitCode}`);
      
      if (result.stderr && result.stderr.trim()) {
        console.log(`   Errors: ${result.stderr.trim()}`);
      }
    });

    // Failed tests details
    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS DETAILS:`);
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`\n• ${result.name}:`);
          console.log(`  Exit Code: ${result.exitCode}`);
          if (result.stderr) {
            console.log(`  Error Output:`);
            console.log(`  ${result.stderr.split('\n').join('\n  ')}`);
          }
          if (result.stdout) {
            console.log(`  Standard Output:`);
            console.log(`  ${result.stdout.split('\n').slice(-10).join('\n  ')}`); // Last 10 lines
          }
        });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (failedTests === 0) {
      console.log(`   🎉 All tests passed! War Council system is ready for production.`);
      console.log(`   ✅ Database schema is properly configured`);
      console.log(`   ✅ API endpoints are functioning correctly`);
      console.log(`   ✅ Integration between components is working`);
    } else {
      console.log(`   ⚠️  ${failedTests} test(s) failed. Please review and fix issues before deployment.`);
      console.log(`   🔍 Check database configuration and ensure all migrations have run`);
      console.log(`   🔍 Verify backend server is running on port 5000`);
      console.log(`   🔍 Review error messages above for specific issues`);
    }

    // Next steps
    console.log(`\n🚀 NEXT STEPS:`);
    if (failedTests === 0) {
      console.log(`   1. Run frontend tests using: open test-war-council-frontend.html`);
      console.log(`   2. Perform manual testing of War Council features`);
      console.log(`   3. Deploy to staging environment for further testing`);
    } else {
      console.log(`   1. Fix failing tests based on error messages above`);
      console.log(`   2. Re-run test suite: node run-all-tests.js`);
      console.log(`   3. Once all tests pass, proceed with frontend testing`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 Test suite completed');
    console.log('='.repeat(80));

    // Save report to file
    this.saveReportToFile();
  }

  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.success).length,
        failedTests: this.testResults.filter(r => !r.success).length,
        duration: Date.now() - this.startTime
      },
      results: this.testResults
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    this.log(`📄 Test report saved to: ${reportPath}`, 'info');
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new WarCouncilTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = { WarCouncilTestRunner };
