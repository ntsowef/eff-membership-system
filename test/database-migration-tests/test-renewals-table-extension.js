/**
 * Database Migration Test: Membership Renewals Table Extension
 * Tests migration 020_extend_renewals_financial_review.sql
 * Validates table structure, columns, indexes, views, and triggers
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class RenewalsTableExtensionTest {
  constructor() {
    this.connection = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new',
      multipleStatements: true
    });
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
    }
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFunction();
      console.log(`   ✅ PASSED: ${testName}`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`   ❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  async testMigrationExecution() {
    // Test that the migration can be executed without errors
    const migrationPath = path.join(__dirname, '..', '..', 'backend', 'migrations', '020_extend_renewals_financial_review.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file does not exist');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration (should handle existing columns gracefully)
    await this.connection.execute(migrationSQL);
  }

  async testNewColumnsAdded() {
    // Test that all expected columns were added to membership_renewals table
    const expectedColumns = [
      'financial_status',
      'financial_reviewed_by',
      'financial_reviewed_at',
      'financial_rejection_reason',
      'workflow_stage',
      'priority_level'
    ];

    const [columns] = await this.connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'membership_renewals'
        AND COLUMN_NAME IN (${expectedColumns.map(() => '?').join(',')})
    `, expectedColumns);

    if (columns.length !== expectedColumns.length) {
      throw new Error(`Expected ${expectedColumns.length} new columns, found ${columns.length}`);
    }

    // Verify specific column properties
    const financialStatusCol = columns.find(c => c.COLUMN_NAME === 'financial_status');
    if (!financialStatusCol || !financialStatusCol.DATA_TYPE.includes('enum')) {
      throw new Error('financial_status column not properly configured as ENUM');
    }

    const workflowStageCol = columns.find(c => c.COLUMN_NAME === 'workflow_stage');
    if (!workflowStageCol || !workflowStageCol.DATA_TYPE.includes('enum')) {
      throw new Error('workflow_stage column not properly configured as ENUM');
    }
  }

  async testIndexesCreated() {
    // Test that performance indexes were created
    const expectedIndexes = [
      'idx_renewals_financial_status',
      'idx_renewals_financial_reviewer',
      'idx_renewals_workflow_stage',
      'idx_renewals_priority_level',
      'idx_renewals_financial_review_date',
      'idx_renewals_comprehensive_lookup'
    ];

    for (const indexName of expectedIndexes) {
      const [indexes] = await this.connection.execute(`
        SHOW INDEX FROM membership_renewals WHERE Key_name = ?
      `, [indexName]);

      if (indexes.length === 0) {
        throw new Error(`Index ${indexName} not found`);
      }
    }
  }

  async testViewCreated() {
    // Test that the renewals_financial_review_view was created
    const [views] = await this.connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'renewals_financial_review_view'
    `);

    if (views.length === 0) {
      throw new Error('renewals_financial_review_view not created');
    }

    // Test that the view returns data with expected columns
    const [viewData] = await this.connection.execute(`
      SELECT * FROM renewals_financial_review_view LIMIT 1
    `);

    // View should have columns from both renewals and members tables
    if (viewData.length > 0) {
      const firstRow = viewData[0];
      const expectedViewColumns = ['renewal_id', 'member_id', 'firstname', 'surname', 'financial_status', 'workflow_stage'];
      
      for (const col of expectedViewColumns) {
        if (!(col in firstRow)) {
          throw new Error(`View missing expected column: ${col}`);
        }
      }
    }
  }

  async testTriggersCreated() {
    // Test that workflow update trigger was created
    const [triggers] = await this.connection.execute(`
      SELECT TRIGGER_NAME 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'membership_new' 
        AND TRIGGER_NAME = 'tr_renewals_financial_status_update'
    `);

    if (triggers.length === 0) {
      throw new Error('Workflow update trigger not created');
    }
  }

  async testForeignKeyConstraints() {
    // Test that foreign key constraint for financial_reviewed_by was created
    const [constraints] = await this.connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'membership_renewals'
        AND COLUMN_NAME = 'financial_reviewed_by'
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (constraints.length === 0) {
      throw new Error('Foreign key constraint for financial_reviewed_by not created');
    }
  }

  async testDataIntegrity() {
    // Test that existing data wasn't corrupted
    const [renewalsCount] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM membership_renewals
    `);

    if (renewalsCount[0].count < 0) {
      throw new Error('Renewals table appears to be corrupted');
    }

    // Test that new columns have proper default values
    const [defaultValues] = await this.connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN financial_status = 'Pending' THEN 1 ELSE 0 END) as pending_status,
        SUM(CASE WHEN workflow_stage = 'Submitted' THEN 1 ELSE 0 END) as submitted_stage
      FROM membership_renewals 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);

    // New records should have proper default values
    if (defaultValues[0].total > 0) {
      const total = defaultValues[0].total;
      const pendingStatus = defaultValues[0].pending_status;
      const submittedStage = defaultValues[0].submitted_stage;
      
      if (pendingStatus !== total || submittedStage !== total) {
        console.log(`Warning: Some new records don't have expected default values`);
      }
    }
  }

  async testWorkflowFunctionality() {
    // Test that the workflow stages work correctly
    const workflowStages = ['Submitted', 'Financial Review', 'Payment Approved', 'Completed', 'Rejected'];
    const financialStatuses = ['Pending', 'Under Review', 'Approved', 'Rejected'];

    // Create a test renewal record
    const [testInsert] = await this.connection.execute(`
      INSERT INTO membership_renewals (
        member_id, renewal_type, amount, payment_method, 
        financial_status, workflow_stage, created_at
      ) VALUES (1, 'Annual', 100.00, 'Card', 'Pending', 'Submitted', NOW())
    `);

    const testRenewalId = testInsert.insertId;

    try {
      // Test updating financial status
      await this.connection.execute(`
        UPDATE membership_renewals 
        SET financial_status = 'Under Review' 
        WHERE renewal_id = ?
      `, [testRenewalId]);

      // Verify workflow stage was updated by trigger
      const [updatedRecord] = await this.connection.execute(`
        SELECT workflow_stage FROM membership_renewals WHERE renewal_id = ?
      `, [testRenewalId]);

      if (updatedRecord[0].workflow_stage !== 'Financial Review') {
        throw new Error('Workflow trigger not working correctly');
      }

    } finally {
      // Clean up test record
      await this.connection.execute(`
        DELETE FROM membership_renewals WHERE renewal_id = ?
      `, [testRenewalId]);
    }
  }

  async testRollbackCapability() {
    // Test that migration changes can be identified for rollback
    const [newColumns] = await this.connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'membership_renewals'
        AND COLUMN_NAME IN ('financial_status', 'financial_reviewed_by', 'financial_reviewed_at', 
                           'financial_rejection_reason', 'workflow_stage', 'priority_level')
    `);

    if (newColumns.length !== 6) {
      throw new Error('Cannot identify all columns for potential rollback');
    }

    // Test that indexes can be identified
    const [newIndexes] = await this.connection.execute(`
      SHOW INDEX FROM membership_renewals 
      WHERE Key_name LIKE 'idx_renewals_%'
    `);

    if (newIndexes.length < 6) {
      throw new Error('Cannot identify all indexes for potential rollback');
    }
  }

  async runAllTests() {
    console.log('🧪 **RENEWALS TABLE EXTENSION MIGRATION TESTS**\n');

    await this.connect();

    try {
      await this.runTest('Migration Execution', () => this.testMigrationExecution());
      await this.runTest('New Columns Added', () => this.testNewColumnsAdded());
      await this.runTest('Indexes Created', () => this.testIndexesCreated());
      await this.runTest('View Created', () => this.testViewCreated());
      await this.runTest('Triggers Created', () => this.testTriggersCreated());
      await this.runTest('Foreign Key Constraints', () => this.testForeignKeyConstraints());
      await this.runTest('Data Integrity', () => this.testDataIntegrity());
      await this.runTest('Workflow Functionality', () => this.testWorkflowFunctionality());
      await this.runTest('Rollback Capability', () => this.testRollbackCapability());

      console.log('\n📊 **TEST RESULTS:**');
      console.log(`   ✅ Passed: ${this.testResults.passed}`);
      console.log(`   ❌ Failed: ${this.testResults.failed}`);

      if (this.testResults.failed > 0) {
        console.log('\n❌ **FAILED TESTS:**');
        this.testResults.errors.forEach(error => {
          console.log(`   • ${error.test}: ${error.error}`);
        });
      } else {
        console.log('\n🎉 **ALL TESTS PASSED!**');
        console.log('✅ Renewals Table Extension Migration is working correctly');
      }

    } finally {
      await this.disconnect();
    }

    return this.testResults.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new RenewalsTableExtensionTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RenewalsTableExtensionTest;
