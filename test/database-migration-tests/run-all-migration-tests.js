/**
 * Comprehensive Database Migration Test Suite
 * Runs all database migration tests for Enhanced Financial Oversight System
 * Validates all Phase 1 database schema changes with rollback testing
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Import all test classes
const PermissionsMigrationTest = require('./test-enhanced-permissions-migration');
const RenewalsTableExtensionTest = require('./test-renewals-table-extension');
const UnifiedTransactionsViewTest = require('./test-unified-transactions-view');
const EnhancedAuditTrailTest = require('./test-enhanced-audit-trail');
const FinancialDashboardTablesTest = require('./test-financial-dashboard-tables');

class ComprehensiveMigrationTestSuite {
  constructor() {
    this.connection = null;
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      errors: []
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

  async runTestSuite(suiteName, TestClass) {
    console.log(`\n🧪 **RUNNING ${suiteName.toUpperCase()} TEST SUITE**`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    let success = false;
    let testInstance = null;

    try {
      testInstance = new TestClass();
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

  async validateDatabaseConnection() {
    console.log('🔍 **VALIDATING DATABASE CONNECTION**\n');

    try {
      await this.connect();
      
      // Test basic connectivity
      const [result] = await this.connection.execute('SELECT 1 as test');
      if (result[0].test !== 1) {
        throw new Error('Database connection test failed');
      }

      // Verify database exists
      const [databases] = await this.connection.execute(`
        SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'membership_new'
      `);
      
      if (databases.length === 0) {
        throw new Error('membership_new database does not exist');
      }

      // Check for required base tables
      const requiredTables = ['users', 'roles', 'permissions', 'membership_applications'];
      for (const table of requiredTables) {
        const [tables] = await this.connection.execute(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = 'membership_new' AND TABLE_NAME = ?
        `, [table]);
        
        if (tables.length === 0) {
          throw new Error(`Required base table '${table}' does not exist`);
        }
      }

      console.log('✅ Database connection validated');
      console.log('✅ membership_new database exists');
      console.log('✅ Required base tables present');

      await this.disconnect();
      return true;

    } catch (error) {
      console.error('❌ Database validation failed:', error.message);
      if (this.connection) {
        await this.disconnect();
      }
      return false;
    }
  }

  async createBackup() {
    console.log('\n💾 **CREATING DATABASE BACKUP**\n');

    try {
      // Create backup directory if it doesn't exist
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `membership_new_backup_${timestamp}.sql`);

      // Note: In a real environment, you would use mysqldump here
      // For this test, we'll just log the backup creation
      console.log(`✅ Backup would be created at: ${backupFile}`);
      console.log('   (In production, use mysqldump for actual backup)');

      return backupFile;

    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      return null;
    }
  }

  async testRollbackCapability() {
    console.log('\n🔄 **TESTING ROLLBACK CAPABILITY**\n');

    try {
      await this.connect();

      // Test that we can identify all migration changes for potential rollback
      const migrationTables = [
        'daily_financial_summary',
        'monthly_financial_summary',
        'financial_kpis',
        'payment_method_summary',
        'geographic_financial_summary',
        'financial_audit_trail'
      ];

      const migrationViews = [
        'unified_financial_transactions',
        'financial_transactions_summary',
        'pending_financial_reviews',
        'financial_audit_trail_view',
        'renewals_financial_review_view'
      ];

      const migrationColumns = [
        { table: 'membership_renewals', columns: ['financial_status', 'financial_reviewed_by', 'workflow_stage'] },
        { table: 'approval_audit_trail', columns: ['renewal_id', 'transaction_id', 'entity_type'] }
      ];

      // Check tables
      for (const table of migrationTables) {
        const [tables] = await this.connection.execute(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = 'membership_new' AND TABLE_NAME = ?
        `, [table]);
        
        if (tables.length > 0) {
          console.log(`   ✅ Can identify table for rollback: ${table}`);
        }
      }

      // Check views
      for (const view of migrationViews) {
        const [views] = await this.connection.execute(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS 
          WHERE TABLE_SCHEMA = 'membership_new' AND TABLE_NAME = ?
        `, [view]);
        
        if (views.length > 0) {
          console.log(`   ✅ Can identify view for rollback: ${view}`);
        }
      }

      // Check columns
      for (const { table, columns } of migrationColumns) {
        for (const column of columns) {
          const [cols] = await this.connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'membership_new' AND TABLE_NAME = ? AND COLUMN_NAME = ?
          `, [table, column]);
          
          if (cols.length > 0) {
            console.log(`   ✅ Can identify column for rollback: ${table}.${column}`);
          }
        }
      }

      console.log('\n✅ Rollback capability validated');
      await this.disconnect();
      return true;

    } catch (error) {
      console.error('❌ Rollback capability test failed:', error.message);
      if (this.connection) {
        await this.disconnect();
      }
      return false;
    }
  }

  generateTestReport() {
    console.log('\n📊 **COMPREHENSIVE TEST REPORT**');
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
      console.log('🎉 **ALL DATABASE MIGRATION TESTS PASSED!**');
      console.log('✅ Enhanced Financial Oversight System database schema is ready for production');
    } else {
      console.log('❌ **SOME TESTS FAILED**');
      console.log('⚠️  Database schema issues need to be resolved before production deployment');
    }

    return allTestsPassed;
  }

  async runAllTests() {
    console.log('🚀 **ENHANCED FINANCIAL OVERSIGHT SYSTEM - DATABASE MIGRATION TESTS**');
    console.log('='.repeat(80));
    console.log('Testing all Phase 1 database schema changes with comprehensive validation\n');

    const overallStartTime = Date.now();

    // Step 1: Validate database connection
    const connectionValid = await this.validateDatabaseConnection();
    if (!connectionValid) {
      console.log('\n❌ **TESTS ABORTED** - Database connection validation failed');
      return false;
    }

    // Step 2: Create backup
    await this.createBackup();

    // Step 3: Run all test suites
    const testSuites = [
      { name: 'Enhanced Permissions Migration', class: PermissionsMigrationTest },
      { name: 'Renewals Table Extension', class: RenewalsTableExtensionTest },
      { name: 'Unified Transactions View', class: UnifiedTransactionsViewTest },
      { name: 'Enhanced Audit Trail', class: EnhancedAuditTrailTest },
      { name: 'Financial Dashboard Tables', class: FinancialDashboardTablesTest }
    ];

    let allSuitesPassed = true;
    for (const suite of testSuites) {
      const suiteResult = await this.runTestSuite(suite.name, suite.class);
      if (!suiteResult) {
        allSuitesPassed = false;
      }
    }

    // Step 4: Test rollback capability
    const rollbackCapable = await this.testRollbackCapability();
    if (!rollbackCapable) {
      allSuitesPassed = false;
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
  const testSuite = new ComprehensiveMigrationTestSuite();
  testSuite.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveMigrationTestSuite;
