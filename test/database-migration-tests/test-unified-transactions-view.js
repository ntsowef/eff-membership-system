/**
 * Database Migration Test: Unified Financial Transactions View
 * Tests migration 021_unified_financial_transactions_view.sql
 * Validates views creation, data accuracy, and performance indexes
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class UnifiedTransactionsViewTest {
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
    const migrationPath = path.join(__dirname, '..', '..', 'backend', 'migrations', '021_unified_financial_transactions_view.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file does not exist');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split and execute statements individually to handle potential issues
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    for (const statement of statements) {
      if (statement.includes('SELECT \'Unified Financial Transactions View Migration Completed\'')) {
        continue; // Skip status messages
      }
      await this.connection.execute(statement);
    }
  }

  async testViewsCreated() {
    // Test that all expected views were created
    const expectedViews = [
      'unified_financial_transactions',
      'financial_transactions_summary',
      'pending_financial_reviews',
      'financial_audit_trail_view'
    ];

    for (const viewName of expectedViews) {
      const [views] = await this.connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = 'membership_new' 
          AND TABLE_NAME = ?
      `, [viewName]);

      if (views.length === 0) {
        throw new Error(`View ${viewName} not created`);
      }
    }
  }

  async testUnifiedTransactionsViewStructure() {
    // Test that unified_financial_transactions view has expected columns
    const [columns] = await this.connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'unified_financial_transactions'
      ORDER BY ORDINAL_POSITION
    `);

    const expectedColumns = [
      'transaction_id', 'transaction_type', 'source_id', 'application_id', 'renewal_id',
      'member_id', 'first_name', 'last_name', 'email', 'phone', 'id_number',
      'amount', 'payment_method', 'payment_reference', 'payment_date', 'currency',
      'payment_status', 'financial_status', 'reviewed_by', 'reviewed_at',
      'province', 'district', 'municipality', 'ward', 'created_at', 'updated_at'
    ];

    const actualColumns = columns.map(c => c.COLUMN_NAME);
    
    for (const expectedCol of expectedColumns) {
      if (!actualColumns.includes(expectedCol)) {
        throw new Error(`Missing expected column: ${expectedCol}`);
      }
    }
  }

  async testUnifiedTransactionsViewData() {
    // Test that the view returns data from both applications and renewals
    const [applicationTransactions] = await this.connection.execute(`
      SELECT COUNT(*) as count 
      FROM unified_financial_transactions 
      WHERE transaction_type = 'Application'
    `);

    const [renewalTransactions] = await this.connection.execute(`
      SELECT COUNT(*) as count 
      FROM unified_financial_transactions 
      WHERE transaction_type = 'Renewal'
    `);

    const [totalTransactions] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM unified_financial_transactions
    `);

    // Verify that total equals sum of applications and renewals
    const expectedTotal = applicationTransactions[0].count + renewalTransactions[0].count;
    if (totalTransactions[0].count !== expectedTotal) {
      throw new Error(`Data integrity issue: expected ${expectedTotal} total transactions, got ${totalTransactions[0].count}`);
    }

    // Test that transaction_id format is correct
    const [sampleTransactions] = await this.connection.execute(`
      SELECT transaction_id, transaction_type 
      FROM unified_financial_transactions 
      LIMIT 10
    `);

    for (const transaction of sampleTransactions) {
      if (transaction.transaction_type === 'Application' && !transaction.transaction_id.startsWith('APP_')) {
        throw new Error(`Invalid transaction_id format for Application: ${transaction.transaction_id}`);
      }
      if (transaction.transaction_type === 'Renewal' && !transaction.transaction_id.startsWith('REN_')) {
        throw new Error(`Invalid transaction_id format for Renewal: ${transaction.transaction_id}`);
      }
    }
  }

  async testFinancialTransactionsSummaryView() {
    // Test that financial_transactions_summary view provides correct aggregations
    const [summary] = await this.connection.execute(`
      SELECT * FROM financial_transactions_summary LIMIT 1
    `);

    if (summary.length === 0) {
      console.log('   ⚠️  No data in financial_transactions_summary view (this may be normal for empty database)');
      return;
    }

    const summaryRow = summary[0];
    const expectedSummaryColumns = [
      'total_transactions', 'total_amount', 'application_transactions', 'application_amount',
      'renewal_transactions', 'renewal_amount', 'pending_reviews', 'completed_transactions'
    ];

    for (const col of expectedSummaryColumns) {
      if (!(col in summaryRow)) {
        throw new Error(`Summary view missing column: ${col}`);
      }
      if (summaryRow[col] < 0) {
        throw new Error(`Invalid negative value in summary for ${col}: ${summaryRow[col]}`);
      }
    }
  }

  async testPendingFinancialReviewsView() {
    // Test that pending_financial_reviews view shows only pending items
    const [pendingReviews] = await this.connection.execute(`
      SELECT financial_status, COUNT(*) as count 
      FROM pending_financial_reviews 
      GROUP BY financial_status
    `);

    for (const review of pendingReviews) {
      if (!['Pending', 'Under Review'].includes(review.financial_status)) {
        throw new Error(`Pending reviews view contains non-pending status: ${review.financial_status}`);
      }
    }
  }

  async testFinancialAuditTrailView() {
    // Test that financial_audit_trail_view combines audit data correctly
    const [auditColumns] = await this.connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'financial_audit_trail_view'
    `);

    const expectedAuditColumns = [
      'audit_id', 'entity_type', 'entity_id', 'user_id', 'user_role',
      'action_type', 'previous_status', 'new_status', 'notes', 'created_at'
    ];

    const actualAuditColumns = auditColumns.map(c => c.COLUMN_NAME);
    
    for (const expectedCol of expectedAuditColumns) {
      if (!actualAuditColumns.includes(expectedCol)) {
        throw new Error(`Audit trail view missing column: ${expectedCol}`);
      }
    }
  }

  async testPerformanceIndexes() {
    // Test that performance indexes were created
    const expectedIndexes = [
      { table: 'membership_applications', index: 'idx_applications_payment_status' },
      { table: 'membership_renewals', index: 'idx_renewals_payment_status' },
      { table: 'approval_audit_trail', index: 'idx_audit_entity_lookup' }
    ];

    for (const { table, index } of expectedIndexes) {
      const [indexes] = await this.connection.execute(`
        SHOW INDEX FROM ${table} WHERE Key_name = ?
      `, [index]);

      if (indexes.length === 0) {
        throw new Error(`Performance index ${index} not found on table ${table}`);
      }
    }
  }

  async testViewPerformance() {
    // Test that views perform reasonably well
    const startTime = Date.now();
    
    await this.connection.execute(`
      SELECT COUNT(*) FROM unified_financial_transactions
    `);
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    if (queryTime > 5000) { // 5 seconds
      throw new Error(`View query too slow: ${queryTime}ms`);
    }
  }

  async testDataConsistency() {
    // Test that view data is consistent with source tables
    const [appCount] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM membership_applications
    `);

    const [viewAppCount] = await this.connection.execute(`
      SELECT COUNT(*) as count 
      FROM unified_financial_transactions 
      WHERE transaction_type = 'Application'
    `);

    if (appCount[0].count !== viewAppCount[0].count) {
      throw new Error(`Application count mismatch: source ${appCount[0].count}, view ${viewAppCount[0].count}`);
    }

    // Test amount consistency for a sample
    const [sampleApp] = await this.connection.execute(`
      SELECT id, payment_amount 
      FROM membership_applications 
      WHERE payment_amount IS NOT NULL 
      LIMIT 1
    `);

    if (sampleApp.length > 0) {
      const [viewAmount] = await this.connection.execute(`
        SELECT amount 
        FROM unified_financial_transactions 
        WHERE transaction_type = 'Application' AND source_id = ?
      `, [sampleApp[0].id]);

      if (viewAmount.length > 0 && viewAmount[0].amount !== sampleApp[0].payment_amount) {
        throw new Error(`Amount mismatch for application ${sampleApp[0].id}`);
      }
    }
  }

  async runAllTests() {
    console.log('🧪 **UNIFIED FINANCIAL TRANSACTIONS VIEW MIGRATION TESTS**\n');

    await this.connect();

    try {
      await this.runTest('Migration Execution', () => this.testMigrationExecution());
      await this.runTest('Views Created', () => this.testViewsCreated());
      await this.runTest('Unified Transactions View Structure', () => this.testUnifiedTransactionsViewStructure());
      await this.runTest('Unified Transactions View Data', () => this.testUnifiedTransactionsViewData());
      await this.runTest('Financial Transactions Summary View', () => this.testFinancialTransactionsSummaryView());
      await this.runTest('Pending Financial Reviews View', () => this.testPendingFinancialReviewsView());
      await this.runTest('Financial Audit Trail View', () => this.testFinancialAuditTrailView());
      await this.runTest('Performance Indexes', () => this.testPerformanceIndexes());
      await this.runTest('View Performance', () => this.testViewPerformance());
      await this.runTest('Data Consistency', () => this.testDataConsistency());

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
        console.log('✅ Unified Financial Transactions View Migration is working correctly');
      }

    } finally {
      await this.disconnect();
    }

    return this.testResults.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new UnifiedTransactionsViewTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = UnifiedTransactionsViewTest;
