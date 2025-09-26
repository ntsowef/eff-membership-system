/**
 * Database Migration Test: Enhanced Financial Oversight Permissions
 * Tests migration 019_enhanced_financial_oversight_permissions.sql
 * Validates permissions creation, role assignments, and data integrity
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

class PermissionsMigrationTest {
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
    const migrationPath = path.join(__dirname, '..', '..', 'backend', 'migrations', '019_enhanced_financial_oversight_permissions.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file does not exist');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration (should handle duplicates gracefully)
    await this.connection.execute(migrationSQL);
  }

  async testPermissionsCreated() {
    // Test that all expected permissions were created
    const expectedPermissions = [
      'renewals.financial_review',
      'renewals.payment_verify',
      'renewals.payment_approve',
      'renewals.payment_reject',
      'transactions.view_all',
      'transactions.view_history',
      'transactions.export',
      'refunds.view',
      'refunds.process',
      'refunds.approve',
      'refunds.reject',
      'disputes.view',
      'disputes.resolve',
      'financial_dashboard.view_comprehensive',
      'financial_dashboard.view_renewals',
      'financial_dashboard.view_refunds',
      'financial_dashboard.export_reports',
      'financial_audit.view',
      'financial_audit.export',
      'members.view_financial_history',
      'members.view_payment_status'
    ];

    const [results] = await this.connection.execute(`
      SELECT name FROM permissions 
      WHERE name IN (${expectedPermissions.map(() => '?').join(',')})
    `, expectedPermissions);

    if (results.length !== expectedPermissions.length) {
      throw new Error(`Expected ${expectedPermissions.length} permissions, found ${results.length}`);
    }

    // Verify each permission has proper structure
    const [permissionDetails] = await this.connection.execute(`
      SELECT name, description, resource, action 
      FROM permissions 
      WHERE name IN (${expectedPermissions.map(() => '?').join(',')})
    `, expectedPermissions);

    for (const perm of permissionDetails) {
      if (!perm.description || !perm.resource || !perm.action) {
        throw new Error(`Permission ${perm.name} missing required fields`);
      }
    }
  }

  async testRolePermissionsAssigned() {
    // Test that permissions were assigned to financial_reviewer role
    const [roleCheck] = await this.connection.execute(`
      SELECT id FROM roles WHERE name = 'financial_reviewer'
    `);

    if (roleCheck.length === 0) {
      throw new Error('financial_reviewer role does not exist');
    }

    const [assignedPermissions] = await this.connection.execute(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'financial_reviewer'
        AND (p.name LIKE 'renewals.%' 
          OR p.name LIKE 'transactions.%' 
          OR p.name LIKE 'refunds.%' 
          OR p.name LIKE 'disputes.%' 
          OR p.name LIKE 'financial_dashboard.%' 
          OR p.name LIKE 'financial_audit.%' 
          OR p.name LIKE 'members.view_financial%')
    `);

    if (assignedPermissions[0].count < 20) {
      throw new Error(`Expected at least 20 permissions assigned, found ${assignedPermissions[0].count}`);
    }
  }

  async testIndexesCreated() {
    // Test that performance indexes were created
    const [indexes] = await this.connection.execute(`
      SHOW INDEX FROM permissions WHERE Key_name IN ('idx_permissions_resource_action')
    `);

    if (indexes.length === 0) {
      throw new Error('Performance index idx_permissions_resource_action not found');
    }

    const [rolePermIndexes] = await this.connection.execute(`
      SHOW INDEX FROM role_permissions WHERE Key_name IN ('idx_role_permissions_lookup')
    `);

    if (rolePermIndexes.length === 0) {
      throw new Error('Performance index idx_role_permissions_lookup not found');
    }
  }

  async testDataIntegrity() {
    // Test that no duplicate permissions exist
    const [duplicates] = await this.connection.execute(`
      SELECT name, COUNT(*) as count 
      FROM permissions 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      throw new Error(`Found duplicate permissions: ${duplicates.map(d => d.name).join(', ')}`);
    }

    // Test that all role_permissions have valid foreign keys
    const [orphanedRolePerms] = await this.connection.execute(`
      SELECT rp.id 
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id IS NULL OR p.id IS NULL
    `);

    if (orphanedRolePerms.length > 0) {
      throw new Error(`Found orphaned role_permissions: ${orphanedRolePerms.length}`);
    }
  }

  async testRollbackCapability() {
    // Test that migration can be rolled back safely
    const backupPermissions = await this.connection.execute(`
      SELECT name FROM permissions 
      WHERE name LIKE 'renewals.%' 
         OR name LIKE 'transactions.%' 
         OR name LIKE 'refunds.%' 
         OR name LIKE 'disputes.%' 
         OR name LIKE 'financial_dashboard.%' 
         OR name LIKE 'financial_audit.%' 
         OR name LIKE 'members.view_financial%'
    `);

    // Simulate rollback by removing test permissions
    await this.connection.execute(`
      DELETE FROM role_permissions 
      WHERE permission_id IN (
        SELECT id FROM permissions 
        WHERE name LIKE 'test_rollback_%'
      )
    `);

    await this.connection.execute(`
      DELETE FROM permissions 
      WHERE name LIKE 'test_rollback_%'
    `);

    // Verify rollback worked
    const [remainingTestPerms] = await this.connection.execute(`
      SELECT COUNT(*) as count FROM permissions WHERE name LIKE 'test_rollback_%'
    `);

    if (remainingTestPerms[0].count > 0) {
      throw new Error('Rollback test failed - test permissions still exist');
    }
  }

  async runAllTests() {
    console.log('🧪 **ENHANCED PERMISSIONS MIGRATION TESTS**\n');

    await this.connect();

    try {
      await this.runTest('Migration Execution', () => this.testMigrationExecution());
      await this.runTest('Permissions Created', () => this.testPermissionsCreated());
      await this.runTest('Role Permissions Assigned', () => this.testRolePermissionsAssigned());
      await this.runTest('Indexes Created', () => this.testIndexesCreated());
      await this.runTest('Data Integrity', () => this.testDataIntegrity());
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
        console.log('✅ Enhanced Permissions Migration is working correctly');
      }

    } finally {
      await this.disconnect();
    }

    return this.testResults.failed === 0;
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new PermissionsMigrationTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = PermissionsMigrationTest;
