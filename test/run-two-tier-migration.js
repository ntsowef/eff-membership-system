const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runTwoTierMigration() {
  let connection;
  
  try {
    console.log('🚀 Running Two-Tier Approval System Migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'backend', 'migrations', '018_two_tier_approval_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Execute migration in parts
    console.log('⚡ Executing migration in parts...');

    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'START TRANSACTION' && stmt !== 'COMMIT');

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Skipping duplicate entry: ${error.message}`);
          } else {
            console.log(`Statement: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration executed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    // Check new roles
    const [roles] = await connection.execute(`
      SELECT name, description FROM roles 
      WHERE name IN ('financial_reviewer', 'membership_approver')
    `);
    console.log(`✅ New roles created: ${roles.length} roles`);
    roles.forEach(role => {
      console.log(`   - ${role.name}: ${role.description}`);
    });
    
    // Check new columns in membership_applications
    const [columns] = await connection.execute(`
      DESCRIBE membership_applications
    `);
    const newColumns = columns.filter(col => 
      ['financial_status', 'financial_reviewed_at', 'financial_reviewed_by', 
       'financial_rejection_reason', 'financial_admin_notes', 'final_reviewed_at', 
       'final_reviewed_by', 'workflow_stage'].includes(col.Field)
    );
    console.log(`✅ New columns added: ${newColumns.length} columns`);
    newColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });
    
    // Check new tables
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE '%audit_trail%' OR SHOW TABLES LIKE '%workflow_notifications%'
    `);
    console.log(`✅ New tables created: ${tables.length} tables`);
    
    // Check permissions
    const [permissions] = await connection.execute(`
      SELECT name, description FROM permissions 
      WHERE name LIKE '%financial%' OR name LIKE '%final%'
    `);
    console.log(`✅ New permissions created: ${permissions.length} permissions`);
    permissions.forEach(perm => {
      console.log(`   - ${perm.name}: ${perm.description}`);
    });
    
    // Check role permissions
    const [rolePermissions] = await connection.execute(`
      SELECT r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name IN ('financial_reviewer', 'membership_approver')
      ORDER BY r.name, p.name
    `);
    console.log(`✅ Role permissions assigned: ${rolePermissions.length} assignments`);
    
    console.log('\n🎉 Two-Tier Approval System Migration Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ New roles: financial_reviewer, membership_approver');
    console.log('✅ Enhanced workflow stages: Submitted → Financial Review → Payment Approved → Final Review → Approved/Rejected');
    console.log('✅ Audit trail system for tracking all approval actions');
    console.log('✅ Workflow notifications between roles');
    console.log('✅ Role-based permissions for separation of duties');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runTwoTierMigration();
