const mysql = require('mysql2/promise');

async function runTwoTierMigration() {
  let connection;
  
  try {
    console.log('🚀 Running Two-Tier Approval System Migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Connected to database');
    
    // 1. Add new roles
    console.log('📝 Adding new roles...');
    await connection.execute(`
      INSERT IGNORE INTO roles (name, description) VALUES
      ('financial_reviewer', 'Financial Reviewer - Can verify payments and approve applications financially'),
      ('membership_approver', 'Membership Approver - Can make final membership decisions on financially approved applications')
    `);
    
    // 2. Add new permissions
    console.log('📝 Adding new permissions...');
    await connection.execute(`
      INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
      ('applications.financial_review', 'Review application payment information', 'applications', 'financial_review'),
      ('payments.verify', 'Verify payment transactions', 'payments', 'verify'),
      ('payments.approve', 'Approve payment verification', 'payments', 'approve'),
      ('payments.reject', 'Reject payment verification', 'payments', 'reject'),
      ('financial_dashboard.read', 'Access financial monitoring dashboard', 'financial_dashboard', 'read'),
      ('applications.final_review', 'Perform final review of applications', 'applications', 'final_review'),
      ('applications.approve', 'Approve membership applications', 'applications', 'approve'),
      ('applications.reject', 'Reject membership applications', 'applications', 'reject'),
      ('memberships.create', 'Create new memberships from approved applications', 'memberships', 'create'),
      ('applications.view_all', 'View all application details', 'applications', 'view_all')
    `);
    
    // 3. Get role IDs
    const [financialRole] = await connection.execute(`SELECT id FROM roles WHERE name = 'financial_reviewer'`);
    const [membershipRole] = await connection.execute(`SELECT id FROM roles WHERE name = 'membership_approver'`);
    
    if (financialRole.length === 0 || membershipRole.length === 0) {
      throw new Error('Failed to create roles');
    }
    
    const financialRoleId = financialRole[0].id;
    const membershipRoleId = membershipRole[0].id;
    
    // 4. Assign permissions to Financial Reviewer
    console.log('📝 Assigning permissions to Financial Reviewer...');
    const financialPermissions = ['applications.financial_review', 'payments.verify', 'payments.approve', 'payments.reject', 'financial_dashboard.read', 'applications.read'];
    
    for (const permName of financialPermissions) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          SELECT ?, id FROM permissions WHERE name = ?
        `, [financialRoleId, permName]);
      } catch (error) {
        console.log(`⚠️  Permission ${permName} may not exist, skipping...`);
      }
    }
    
    // 5. Assign permissions to Membership Approver
    console.log('📝 Assigning permissions to Membership Approver...');
    const membershipPermissions = ['applications.final_review', 'applications.approve', 'applications.reject', 'memberships.create', 'applications.view_all', 'applications.read'];
    
    for (const permName of membershipPermissions) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          SELECT ?, id FROM permissions WHERE name = ?
        `, [membershipRoleId, permName]);
      } catch (error) {
        console.log(`⚠️  Permission ${permName} may not exist, skipping...`);
      }
    }
    
    // 6. Add new columns to membership_applications
    console.log('📝 Adding new columns to membership_applications...');
    
    const newColumns = [
      "ADD COLUMN financial_status ENUM('Pending', 'Under Review', 'Approved', 'Rejected') DEFAULT 'Pending'",
      "ADD COLUMN financial_reviewed_at TIMESTAMP NULL",
      "ADD COLUMN financial_reviewed_by INT NULL",
      "ADD COLUMN financial_rejection_reason TEXT NULL",
      "ADD COLUMN financial_admin_notes TEXT NULL",
      "ADD COLUMN final_reviewed_at TIMESTAMP NULL",
      "ADD COLUMN final_reviewed_by INT NULL",
      "ADD COLUMN workflow_stage ENUM('Submitted', 'Financial Review', 'Payment Approved', 'Final Review', 'Approved', 'Rejected') DEFAULT 'Submitted'"
    ];
    
    for (const column of newColumns) {
      try {
        await connection.execute(`ALTER TABLE membership_applications ${column}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists, skipping...`);
        } else {
          console.log(`⚠️  Error adding column: ${error.message}`);
        }
      }
    }
    
    // 7. Add foreign key constraints
    console.log('📝 Adding foreign key constraints...');
    try {
      await connection.execute(`
        ALTER TABLE membership_applications 
        ADD CONSTRAINT fk_financial_reviewer FOREIGN KEY (financial_reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      `);
    } catch (error) {
      console.log(`⚠️  Financial reviewer constraint: ${error.message}`);
    }
    
    try {
      await connection.execute(`
        ALTER TABLE membership_applications 
        ADD CONSTRAINT fk_final_reviewer FOREIGN KEY (final_reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      `);
    } catch (error) {
      console.log(`⚠️  Final reviewer constraint: ${error.message}`);
    }
    
    // 8. Update existing applications
    console.log('📝 Updating existing applications workflow stage...');
    await connection.execute(`
      UPDATE membership_applications 
      SET workflow_stage = CASE 
        WHEN status = 'Submitted' THEN 'Submitted'
        WHEN status = 'Under Review' THEN 'Final Review'
        WHEN status = 'Approved' THEN 'Approved'
        WHEN status = 'Rejected' THEN 'Rejected'
        ELSE 'Submitted'
      END
      WHERE workflow_stage IS NULL OR workflow_stage = 'Submitted'
    `);
    
    // 9. Create audit trail table
    console.log('📝 Creating approval_audit_trail table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approval_audit_trail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        user_id INT NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        action_type ENUM('financial_review_start', 'financial_approve', 'financial_reject', 'final_review_start', 'final_approve', 'final_reject', 'status_change') NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        previous_workflow_stage VARCHAR(50),
        new_workflow_stage VARCHAR(50),
        notes TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_audit_application (application_id),
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_action (action_type),
        INDEX idx_audit_created (created_at)
      )
    `);
    
    // 10. Create workflow notifications table
    console.log('📝 Creating workflow_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workflow_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        from_user_id INT NOT NULL,
        to_role VARCHAR(50) NOT NULL,
        notification_type ENUM('financial_review_complete', 'ready_for_final_review', 'application_approved', 'application_rejected') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_notification_application (application_id),
        INDEX idx_notification_role (to_role),
        INDEX idx_notification_read (is_read),
        INDEX idx_notification_created (created_at)
      )
    `);
    
    // 11. Add performance indexes
    console.log('📝 Adding performance indexes...');
    const indexes = [
      'ADD INDEX idx_financial_status (financial_status)',
      'ADD INDEX idx_workflow_stage (workflow_stage)',
      'ADD INDEX idx_financial_reviewed_by (financial_reviewed_by)',
      'ADD INDEX idx_final_reviewed_by (final_reviewed_by)',
      'ADD INDEX idx_financial_reviewed_at (financial_reviewed_at)',
      'ADD INDEX idx_final_reviewed_at (final_reviewed_at)'
    ];
    
    for (const index of indexes) {
      try {
        await connection.execute(`ALTER TABLE membership_applications ${index}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Index already exists, skipping...`);
        } else {
          console.log(`⚠️  Error adding index: ${error.message}`);
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
    
    // Check new columns
    const [columns] = await connection.execute(`DESCRIBE membership_applications`);
    const newCols = columns.filter(col => 
      ['financial_status', 'financial_reviewed_at', 'financial_reviewed_by', 
       'financial_rejection_reason', 'financial_admin_notes', 'final_reviewed_at', 
       'final_reviewed_by', 'workflow_stage'].includes(col.Field)
    );
    console.log(`✅ New columns added: ${newCols.length} columns`);
    
    // Check new tables
    const [auditTable] = await connection.execute(`SHOW TABLES LIKE 'approval_audit_trail'`);
    const [notificationTable] = await connection.execute(`SHOW TABLES LIKE 'workflow_notifications'`);
    console.log(`✅ New tables created: ${auditTable.length + notificationTable.length} tables`);
    
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
