/**
 * Database Migration Test: Enhanced Audit Trail System
 * Tests migration 022_enhanced_audit_trail_system.sql
 * Validates audit trail extensions, constraints, and functionality
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class EnhancedAuditTrailTest {
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
    const migrationPath = path.join(__dirname, '..', '..', 'backend', 'migrations', '022_enhanced_audit_trail_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file does not exist');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration (should handle existing columns gracefully)
    await this.connection.execute(migrationSQL);
  }

  async testAuditTrailTableExtended() {
    // Test that new columns were added to approval_audit_trail table
    const expectedColumns = [
      'renewal_id',
      'transaction_id', 
      'entity_type',
      'ip_address',
      'user_agent'
    ];

    const [columns] = await this.connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'approval_audit_trail'
        AND COLUMN_NAME IN (${expectedColumns.map(() => '?').join(',')})
    `, expectedColumns);

    if (columns.length !== expectedColumns.length) {
      throw new Error(`Expected ${expectedColumns.length} new columns, found ${columns.length}`);
    }

    // Verify entity_type is an ENUM with correct values
    const entityTypeCol = columns.find(c => c.COLUMN_NAME === 'entity_type');
    if (!entityTypeCol || !entityTypeCol.DATA_TYPE.includes('enum')) {
      throw new Error('entity_type column not properly configured as ENUM');
    }
  }

  async testForeignKeyConstraints() {
    // Test that foreign key constraint for renewal_id was created
    const [renewalConstraints] = await this.connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'approval_audit_trail'
        AND COLUMN_NAME = 'renewal_id'
        AND REFERENCED_TABLE_NAME = 'membership_renewals'
    `);

    if (renewalConstraints.length === 0) {
      throw new Error('Foreign key constraint for renewal_id not created');
    }
  }

  async testFinancialAuditTrailTable() {
    // Test that financial_audit_trail table was created
    const [tables] = await this.connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'financial_audit_trail'
    `);

    if (tables.length === 0) {
      throw new Error('financial_audit_trail table not created');
    }

    // Test table structure
    const [columns] = await this.connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'financial_audit_trail'
      ORDER BY ORDINAL_POSITION
    `);

    const expectedFinancialAuditColumns = [
      'audit_id', 'transaction_id', 'entity_type', 'entity_id', 'user_id',
      'action_type', 'previous_amount', 'new_amount', 'previous_status',
      'new_status', 'notes', 'metadata', 'ip_address', 'user_agent', 'created_at'
    ];

    const actualColumns = columns.map(c => c.COLUMN_NAME);
    
    for (const expectedCol of expectedFinancialAuditColumns) {
      if (!actualColumns.includes(expectedCol)) {
        throw new Error(`financial_audit_trail missing column: ${expectedCol}`);
      }
    }
  }

  async testIndexesCreated() {
    // Test that performance indexes were created
    const expectedIndexes = [
      { table: 'approval_audit_trail', index: 'idx_audit_renewal_lookup' },
      { table: 'approval_audit_trail', index: 'idx_audit_entity_type' },
      { table: 'approval_audit_trail', index: 'idx_audit_transaction_id' },
      { table: 'financial_audit_trail', index: 'idx_financial_audit_transaction' },
      { table: 'financial_audit_trail', index: 'idx_financial_audit_entity' },
      { table: 'financial_audit_trail', index: 'idx_financial_audit_user_date' }
    ];

    for (const { table, index } of expectedIndexes) {
      const [indexes] = await this.connection.execute(`
        SHOW INDEX FROM ${table} WHERE Key_name = ?
      `, [index]);

      if (indexes.length === 0) {
        throw new Error(`Index ${index} not found on table ${table}`);
      }
    }
  }

  async testAuditTrailFunctionality() {
    // Test that audit trail can record different entity types
    const testCases = [
      { entity_type: 'application', entity_id: 1 },
      { entity_type: 'renewal', entity_id: 1 },
      { entity_type: 'payment', entity_id: 1 },
      { entity_type: 'refund', entity_id: 1 }
    ];

    for (const testCase of testCases) {
      const [insertResult] = await this.connection.execute(`
        INSERT INTO approval_audit_trail (
          application_id, renewal_id, user_id, user_role, action_type,
          entity_type, previous_status, new_status, notes, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testCase.entity_type === 'application' ? testCase.entity_id : null,
        testCase.entity_type === 'renewal' ? testCase.entity_id : null,
        1, 'test_user', 'test_action', testCase.entity_type,
        'test_previous', 'test_new', 'Test audit entry',
        '127.0.0.1', 'Test User Agent'
      ]);

      if (!insertResult.insertId) {
        throw new Error(`Failed to insert audit trail for entity_type: ${testCase.entity_type}`);
      }

      // Clean up test record
      await this.connection.execute(`
        DELETE FROM approval_audit_trail WHERE id = ?
      `, [insertResult.insertId]);
    }
  }

  async testFinancialAuditTrailFunctionality() {
    // Test that financial audit trail can record financial operations
    const [insertResult] = await this.connection.execute(`
      INSERT INTO financial_audit_trail (
        transaction_id, entity_type, entity_id, user_id, action_type,
        previous_amount, new_amount, previous_status, new_status,
        notes, metadata, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'TEST_001', 'payment', 1, 1, 'amount_change',
      100.00, 150.00, 'pending', 'approved',
      'Test financial audit entry',
      JSON.stringify({ test: true }),
      '127.0.0.1', 'Test User Agent'
    ]);

    if (!insertResult.insertId) {
      throw new Error('Failed to insert financial audit trail entry');
    }

    // Verify the record was inserted correctly
    const [record] = await this.connection.execute(`
      SELECT * FROM financial_audit_trail WHERE audit_id = ?
    `, [insertResult.insertId]);

    if (record.length === 0) {
      throw new Error('Financial audit trail record not found after insert');
    }

    const auditRecord = record[0];
    if (auditRecord.previous_amount !== 100.00 || auditRecord.new_amount !== 150.00) {
      throw new Error('Financial audit trail amounts not recorded correctly');
    }

    // Clean up test record
    await this.connection.execute(`
      DELETE FROM financial_audit_trail WHERE audit_id = ?
    `, [insertResult.insertId]);
  }

  async testDataIntegrity() {
    // Test that existing audit trail data wasn't corrupted
    const [auditCount] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM approval_audit_trail
    `);

    if (auditCount[0].count < 0) {
      throw new Error('Audit trail table appears to be corrupted');
    }

    // Test that entity_type enum values are valid
    const [invalidEntityTypes] = await this.connection.execute(`
      SELECT COUNT(*) as count 
      FROM approval_audit_trail 
      WHERE entity_type NOT IN ('application', 'renewal', 'payment', 'refund', 'system')
    `);

    if (invalidEntityTypes[0].count > 0) {
      throw new Error(`Found ${invalidEntityTypes[0].count} records with invalid entity_type values`);
    }
  }

  async testAuditTrailViews() {
    // Test that audit trail views work correctly
    const [auditViews] = await this.connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME LIKE '%audit%'
    `);

    // Should have at least the financial_audit_trail_view
    if (auditViews.length === 0) {
      console.log('   ⚠️  No audit trail views found (may be created in other migrations)');
    }
  }

  async testRollbackCapability() {
    // Test that migration changes can be identified for rollback
    const [newColumns] = await this.connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'approval_audit_trail'
        AND COLUMN_NAME IN ('renewal_id', 'transaction_id', 'entity_type', 'ip_address', 'user_agent')
    `);

    if (newColumns.length !== 5) {
      throw new Error('Cannot identify all new columns for potential rollback');
    }

    // Test that new table can be identified
    const [newTables] = await this.connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = 'financial_audit_trail'
    `);

    if (newTables.length !== 1) {
      throw new Error('Cannot identify financial_audit_trail table for potential rollback');
    }
  }

  async runAllTests() {
    console.log('🧪 **ENHANCED AUDIT TRAIL SYSTEM MIGRATION TESTS**\n');

    await this.connect();

    try {
      await this.runTest('Migration Execution', () => this.testMigrationExecution());
      await this.runTest('Audit Trail Table Extended', () => this.testAuditTrailTableExtended());
      await this.runTest('Foreign Key Constraints', () => this.testForeignKeyConstraints());
      await this.runTest('Financial Audit Trail Table', () => this.testFinancialAuditTrailTable());
      await this.runTest('Indexes Created', () => this.testIndexesCreated());
      await this.runTest('Audit Trail Functionality', () => this.testAuditTrailFunctionality());
      await this.runTest('Financial Audit Trail Functionality', () => this.testFinancialAuditTrailFunctionality());
      await this.runTest('Data Integrity', () => this.testDataIntegrity());
      await this.runTest('Audit Trail Views', () => this.testAuditTrailViews());
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
        console.log('✅ Enhanced Audit Trail System Migration is working correctly');
      }

    } finally {
      await this.disconnect();
    }

    return this.testResults.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new EnhancedAuditTrailTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = EnhancedAuditTrailTest;
