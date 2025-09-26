/**
 * Comprehensive Backend API Integration Test Suite
 * Tests all Enhanced Financial Oversight System API endpoints
 * Validates authentication, authorization, data flow, and business logic
 */

const axios = require('axios');
const mysql = require('mysql2/promise');

// Import individual test suites
const TwoTierApprovalApiTest = require('./test-two-tier-approval-api');
const UnifiedDashboardApiTest = require('./test-unified-dashboard-api');
const FinancialTransactionApiTest = require('./test-financial-transaction-api');
const ComprehensiveFinancialApiTest = require('./test-comprehensive-financial-api');
const AuthenticationApiTest = require('./test-authentication-api');

class ComprehensiveApiTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:5000/api/v1';
    this.connection = null;
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      errors: []
    };
    this.testUsers = {
      financial_reviewer: null,
      membership_approver: null,
      super_admin: null
    };
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
    }
  }

  async validateServerConnection() {
    console.log('🔍 **VALIDATING SERVER CONNECTION**\n');

    try {
      // Test server health endpoint
      const healthResponse = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });

      if (healthResponse.status !== 200) {
        throw new Error(`Server health check failed: ${healthResponse.status}`);
      }

      console.log('✅ Server is running and responding');
      console.log(`✅ Base URL: ${this.baseURL}`);
      console.log(`✅ Health Status: ${healthResponse.data.status || 'OK'}`);

      return true;

    } catch (error) {
      console.error('❌ Server connection failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('   💡 Make sure the backend server is running on port 5000');
      }
      return false;
    }
  }

  async setupTestUsers() {
    console.log('\n🔧 **SETTING UP TEST USERS**\n');

    try {
      await this.connect();

      // Get or create test users for different roles
      const roles = ['financial_reviewer', 'membership_approver', 'super_admin'];
      
      for (const roleName of roles) {
        // Check if test user exists
        const [existingUsers] = await this.connection.execute(`
          SELECT u.id, u.email, u.firstname, u.surname, r.name as role_name
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE r.name = ? AND u.email LIKE 'test_%'
          LIMIT 1
        `, [roleName]);

        if (existingUsers.length > 0) {
          this.testUsers[roleName] = existingUsers[0];
          console.log(`✅ Found existing test user for ${roleName}: ${existingUsers[0].email}`);
        } else {
          // Create test user
          const [roleResult] = await this.connection.execute(`
            SELECT id FROM roles WHERE name = ?
          `, [roleName]);

          if (roleResult.length === 0) {
            throw new Error(`Role ${roleName} not found in database`);
          }

          const roleId = roleResult[0].id;
          const testEmail = `test_${roleName}@example.com`;

          const [insertResult] = await this.connection.execute(`
            INSERT INTO users (email, password, firstname, surname, role_id, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW())
          `, [
            testEmail,
            '$2b$10$test.hash.for.testing.purposes.only', // Test password hash
            'Test',
            roleName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            roleId
          ]);

          this.testUsers[roleName] = {
            id: insertResult.insertId,
            email: testEmail,
            firstname: 'Test',
            surname: roleName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            role_name: roleName
          };

          console.log(`✅ Created test user for ${roleName}: ${testEmail}`);
        }
      }

      await this.disconnect();
      return true;

    } catch (error) {
      console.error('❌ Test user setup failed:', error.message);
      if (this.connection) {
        await this.disconnect();
      }
      return false;
    }
  }

  async authenticateTestUser(roleName) {
    try {
      const user = this.testUsers[roleName];
      if (!user) {
        throw new Error(`Test user for role ${roleName} not found`);
      }

      // For testing purposes, we'll create a mock JWT token
      // In a real scenario, you would authenticate through the login endpoint
      const mockToken = `test_token_${roleName}_${Date.now()}`;
      
      return {
        token: mockToken,
        user: user,
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      };

    } catch (error) {
      throw new Error(`Failed to authenticate test user ${roleName}: ${error.message}`);
    }
  }

  async runTestSuite(suiteName, TestClass, authRole = 'financial_reviewer') {
    console.log(`\n🧪 **RUNNING ${suiteName.toUpperCase()} TEST SUITE**`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    let success = false;
    let testInstance = null;

    try {
      // Authenticate test user
      const auth = await this.authenticateTestUser(authRole);
      
      testInstance = new TestClass(this.baseURL, auth);
      success = await testInstance.runAllTests();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.testResults.testSuites.push({
        name: suiteName,
        success: success,
        duration: duration,
        passed: testInstance.testResults ? testInstance.testResults.passed : 0,
        failed: testInstance.testResults ? testInstance.testResults.failed : 0,
        errors: testInstance.testResults ? testInstance.testResults.errors : []
      });

      if (testInstance.testResults) {
        this.testResults.passedTests += testInstance.testResults.passed;
        this.testResults.failedTests += testInstance.testResults.failed;
        this.testResults.totalTests += testInstance.testResults.passed + testInstance.testResults.failed;
      }

      console.log(`\n⏱️  ${suiteName} completed in ${duration}ms`);
      console.log(success ? '✅ SUITE PASSED' : '❌ SUITE FAILED');

    } catch (error) {
      console.error(`❌ ${suiteName} suite failed to execute:`, error.message);
      this.testResults.errors.push({
        suite: suiteName,
        error: error.message
      });
      this.testResults.failedTests++;
      this.testResults.totalTests++;
    }

    return success;
  }

  async testEndpointAccessibility() {
    console.log('\n🔍 **TESTING ENDPOINT ACCESSIBILITY**\n');

    const criticalEndpoints = [
      '/health',
      '/two-tier-approval/statistics',
      '/financial-dashboard/health',
      '/financial-transactions/health'
    ];

    let accessibleEndpoints = 0;

    for (const endpoint of criticalEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 3000,
          validateStatus: (status) => status < 500 // Accept 4xx as accessible
        });

        console.log(`✅ ${endpoint} - Status: ${response.status}`);
        accessibleEndpoints++;

      } catch (error) {
        if (error.response && error.response.status < 500) {
          console.log(`✅ ${endpoint} - Status: ${error.response.status} (accessible)`);
          accessibleEndpoints++;
        } else {
          console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
      }
    }

    const accessibilityRate = (accessibleEndpoints / criticalEndpoints.length) * 100;
    console.log(`\n📊 Endpoint Accessibility: ${accessibilityRate.toFixed(1)}% (${accessibleEndpoints}/${criticalEndpoints.length})`);

    return accessibilityRate >= 75; // 75% accessibility threshold
  }

  generateTestReport() {
    console.log('\n📊 **COMPREHENSIVE API TEST REPORT**');
    console.log('='.repeat(60));

    console.log(`\n📈 **OVERALL RESULTS:**`);
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(`   Passed: ${this.testResults.passedTests}`);
    console.log(`   Failed: ${this.testResults.failedTests}`);
    console.log(`   Success Rate: ${this.testResults.totalTests > 0 ? ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1) : 0}%`);

    console.log(`\n🧪 **TEST SUITE BREAKDOWN:**`);
    this.testResults.testSuites.forEach(suite => {
      const status = suite.success ? '✅' : '❌';
      console.log(`   ${status} ${suite.name}: ${suite.passed} passed, ${suite.failed} failed (${suite.duration}ms)`);
    });

    if (this.testResults.errors.length > 0) {
      console.log(`\n❌ **ERRORS:**`);
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error.suite || 'General'}: ${error.error}`);
      });
    }

    const allTestsPassed = this.testResults.failedTests === 0 && this.testResults.errors.length === 0;
    
    console.log(`\n🎯 **FINAL RESULT:**`);
    if (allTestsPassed) {
      console.log('🎉 **ALL API INTEGRATION TESTS PASSED!**');
      console.log('✅ Enhanced Financial Oversight System APIs are ready for production');
    } else {
      console.log('❌ **SOME TESTS FAILED**');
      console.log('⚠️  API issues need to be resolved before production deployment');
    }

    return allTestsPassed;
  }

  async runAllTests() {
    console.log('🚀 **ENHANCED FINANCIAL OVERSIGHT SYSTEM - API INTEGRATION TESTS**');
    console.log('='.repeat(80));
    console.log('Testing all Phase 2 backend API endpoints with comprehensive validation\n');

    const overallStartTime = Date.now();

    // Step 1: Validate server connection
    const serverOnline = await this.validateServerConnection();
    if (!serverOnline) {
      console.log('\n❌ **TESTS ABORTED** - Server connection validation failed');
      return false;
    }

    // Step 2: Setup test users
    const usersReady = await this.setupTestUsers();
    if (!usersReady) {
      console.log('\n❌ **TESTS ABORTED** - Test user setup failed');
      return false;
    }

    // Step 3: Test endpoint accessibility
    const endpointsAccessible = await this.testEndpointAccessibility();
    if (!endpointsAccessible) {
      console.log('\n⚠️  **WARNING** - Some endpoints may not be accessible');
    }

    // Step 4: Run all test suites
    const testSuites = [
      { name: 'Authentication API', class: AuthenticationApiTest, role: 'financial_reviewer' },
      { name: 'Two-Tier Approval API', class: TwoTierApprovalApiTest, role: 'financial_reviewer' },
      { name: 'Unified Dashboard API', class: UnifiedDashboardApiTest, role: 'financial_reviewer' },
      { name: 'Financial Transaction API', class: FinancialTransactionApiTest, role: 'financial_reviewer' },
      { name: 'Comprehensive Financial API', class: ComprehensiveFinancialApiTest, role: 'membership_approver' }
    ];

    let allSuitesPassed = true;
    for (const suite of testSuites) {
      const suiteResult = await this.runTestSuite(suite.name, suite.class, suite.role);
      if (!suiteResult) {
        allSuitesPassed = false;
      }
    }

    // Step 5: Generate final report
    const overallEndTime = Date.now();
    const totalDuration = overallEndTime - overallStartTime;

    console.log(`\n⏱️  **TOTAL EXECUTION TIME:** ${totalDuration}ms`);
    
    const finalResult = this.generateTestReport();
    
    return finalResult && allSuitesPassed;
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ComprehensiveApiTestSuite();
  testSuite.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ API test suite execution failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveApiTestSuite;
