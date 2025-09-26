const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runEnhancedPermissionsMigration() {
  console.log('🔧 **RUNNING ENHANCED FINANCIAL OVERSIGHT PERMISSIONS MIGRATION**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new',
    multipleStatements: true
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'backend', 'migrations', '019_enhanced_financial_oversight_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 **Executing Enhanced Permissions Migration...**');
    
    // Execute the migration
    await connection.execute(migrationSQL);
    
    console.log('✅ **Migration executed successfully!**\n');

    // Verify the results
    console.log('🔍 **Verifying Migration Results:**\n');

    // 1. Check new permissions were created
    const [newPermissions] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM permissions 
      WHERE name LIKE 'renewals.%' 
         OR name LIKE 'transactions.%' 
         OR name LIKE 'refunds.%' 
         OR name LIKE 'disputes.%' 
         OR name LIKE 'financial_dashboard.%' 
         OR name LIKE 'financial_audit.%' 
         OR name LIKE 'members.view_financial%'
    `);

    console.log(`✅ **New Permissions Created**: ${newPermissions[0].count} permissions`);

    // 2. Check role permissions were assigned
    const [rolePermissions] = await connection.execute(`
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

    console.log(`✅ **Permissions Assigned to Financial Reviewer**: ${rolePermissions[0].count} permissions`);

    // 3. List the new permissions
    const [permissionsList] = await connection.execute(`
      SELECT name, description, resource, action
      FROM permissions 
      WHERE name LIKE 'renewals.%' 
         OR name LIKE 'transactions.%' 
         OR name LIKE 'refunds.%' 
         OR name LIKE 'disputes.%' 
         OR name LIKE 'financial_dashboard.%' 
         OR name LIKE 'financial_audit.%' 
         OR name LIKE 'members.view_financial%'
      ORDER BY resource, name
    `);

    console.log('\n📋 **New Permissions Added:**');
    permissionsList.forEach(perm => {
      console.log(`   • ${perm.name} - ${perm.description}`);
    });

    // 4. Verify Financial Reviewer role has the permissions
    const [financialReviewerPerms] = await connection.execute(`
      SELECT p.name, p.description
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
      ORDER BY p.name
    `);

    console.log('\n🔐 **Financial Reviewer Enhanced Permissions:**');
    financialReviewerPerms.forEach(perm => {
      console.log(`   ✅ ${perm.name} - ${perm.description}`);
    });

    // 5. Check audit trail entry
    const [auditEntry] = await connection.execute(`
      SELECT notes, metadata
      FROM approval_audit_trail 
      WHERE notes LIKE '%Enhanced financial oversight permissions%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (auditEntry.length > 0) {
      console.log('\n📝 **Audit Trail Entry Created:**');
      console.log(`   Notes: ${auditEntry[0].notes}`);
      console.log(`   Metadata: ${auditEntry[0].metadata}`);
    }

    console.log('\n🎉 **ENHANCED PERMISSIONS MIGRATION COMPLETED SUCCESSFULLY!**');
    console.log('\n📊 **Summary:**');
    console.log(`   • ${newPermissions[0].count} new permissions created`);
    console.log(`   • ${rolePermissions[0].count} permissions assigned to Financial Reviewer role`);
    console.log('   • Financial Reviewers can now handle:');
    console.log('     - Membership application payments ✅');
    console.log('     - Membership renewal payments ✅');
    console.log('     - Refund processing ✅');
    console.log('     - Payment dispute resolution ✅');
    console.log('     - Comprehensive financial dashboard ✅');
    console.log('     - Complete financial audit trails ✅');

    console.log('\n🚀 **Ready for Task 1.2: Extend Membership Renewals Table**');

  } catch (error) {
    console.error('❌ **Migration failed:**', error.message);
    
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('💡 Some permissions may already exist - this is normal for re-runs');
    }
  } finally {
    await connection.end();
  }
}

// Run the migration
runEnhancedPermissionsMigration();
