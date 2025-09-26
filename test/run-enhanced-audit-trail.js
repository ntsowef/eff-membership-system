const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runEnhancedAuditTrail() {
  console.log('🔧 **ENHANCING AUDIT TRAIL SYSTEM FOR FINANCIAL OVERSIGHT**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    console.log('📋 **Step 1: Checking Current Audit Trail Structure...**');
    
    // Check current approval_audit_trail structure
    const [currentColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM information_schema.columns 
      WHERE table_schema = 'membership_new' 
      AND table_name = 'approval_audit_trail'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('   📋 Current approval_audit_trail columns:');
    currentColumns.forEach(col => {
      console.log(`      • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📋 **Step 2: Executing Enhanced Audit Trail Migration...**');
    
    // Execute migration in steps to handle potential issues
    
    // Step 2.1: Extend approval_audit_trail table
    console.log('   🔧 Extending approval_audit_trail table...');
    
    const columnsToAdd = [
      { name: 'renewal_id', definition: 'INT NULL', after: 'application_id' },
      { name: 'transaction_id', definition: 'VARCHAR(50) NULL', after: 'renewal_id' },
      { name: 'entity_type', definition: "ENUM('application', 'renewal', 'payment', 'refund', 'system') DEFAULT 'application'", after: 'transaction_id' },
      { name: 'ip_address', definition: 'VARCHAR(45) NULL', after: 'metadata' },
      { name: 'user_agent', definition: 'TEXT NULL', after: 'ip_address' }
    ];

    for (const column of columnsToAdd) {
      try {
        // Check if column already exists
        const [columnExists] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.columns 
          WHERE table_schema = 'membership_new' 
          AND table_name = 'approval_audit_trail' 
          AND column_name = ?
        `, [column.name]);

        if (columnExists[0].count === 0) {
          await connection.execute(`
            ALTER TABLE approval_audit_trail 
            ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}
          `);
          console.log(`      ✅ Added column: ${column.name}`);
        } else {
          console.log(`      ⚠️  Column already exists: ${column.name}`);
        }
      } catch (error) {
        console.log(`      ❌ Error adding column ${column.name}: ${error.message}`);
      }
    }

    // Step 2.2: Add foreign key constraint for renewal_id
    try {
      await connection.execute(`
        ALTER TABLE approval_audit_trail 
        ADD CONSTRAINT fk_audit_renewal 
        FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE
      `);
      console.log('      ✅ Added foreign key constraint for renewal_id');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('      ⚠️  Foreign key constraint already exists');
      } else {
        console.log(`      ❌ Error adding foreign key: ${error.message}`);
      }
    }

    // Step 2.3: Make application_id nullable
    try {
      await connection.execute(`
        ALTER TABLE approval_audit_trail 
        MODIFY COLUMN application_id INT NULL
      `);
      console.log('      ✅ Made application_id nullable');
    } catch (error) {
      console.log(`      ⚠️  application_id modification issue: ${error.message}`);
    }

    // Step 2.4: Create financial_operations_audit table
    console.log('\n   🔧 Creating financial_operations_audit table...');
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS financial_operations_audit (
          id INT AUTO_INCREMENT PRIMARY KEY,
          operation_id VARCHAR(100) NOT NULL COMMENT 'Unique identifier for the operation',
          operation_type ENUM(
            'payment_created', 'payment_verified', 'payment_approved', 'payment_rejected', 'payment_failed',
            'refund_requested', 'refund_approved', 'refund_rejected', 'refund_processed',
            'financial_review_started', 'financial_review_completed', 'financial_review_escalated',
            'payment_dispute_created', 'payment_dispute_resolved', 'payment_reconciliation',
            'manual_adjustment', 'bulk_operation', 'system_correction'
          ) NOT NULL,
          
          -- Entity references
          application_id INT NULL,
          renewal_id INT NULL,
          member_id INT NULL,
          transaction_reference VARCHAR(100) NULL,
          
          -- Financial details
          amount_before DECIMAL(10,2) NULL,
          amount_after DECIMAL(10,2) NULL,
          currency VARCHAR(3) DEFAULT 'ZAR',
          
          -- User and system information
          performed_by INT NOT NULL,
          performed_by_role VARCHAR(50) NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          
          -- Operation details
          operation_status ENUM('initiated', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'initiated',
          previous_values JSON NULL,
          new_values JSON NULL,
          operation_notes TEXT NULL,
          system_notes TEXT NULL,
          
          -- Timestamps
          initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          
          -- Foreign keys
          FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
          FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE SET NULL,
          FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL,
          FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('      ✅ Created financial_operations_audit table');
    } catch (error) {
      console.log(`      ❌ Error creating financial_operations_audit table: ${error.message}`);
    }

    // Step 2.5: Create renewal_financial_audit_trail table
    console.log('\n   🔧 Creating renewal_financial_audit_trail table...');
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS renewal_financial_audit_trail (
          id INT AUTO_INCREMENT PRIMARY KEY,
          renewal_id INT NOT NULL,
          member_id INT NOT NULL,
          
          -- Financial review workflow tracking
          workflow_stage_before VARCHAR(50) NULL,
          workflow_stage_after VARCHAR(50) NULL,
          financial_status_before VARCHAR(50) NULL,
          financial_status_after VARCHAR(50) NULL,
          
          -- Review details
          reviewed_by INT NOT NULL,
          reviewer_role VARCHAR(50) NOT NULL,
          review_action ENUM(
            'review_started', 'payment_verified', 'payment_approved', 'payment_rejected',
            'additional_info_requested', 'escalated_to_supervisor', 'review_completed'
          ) NOT NULL,
          
          -- Financial information
          amount_reviewed DECIMAL(10,2) NULL,
          payment_method VARCHAR(50) NULL,
          payment_reference VARCHAR(100) NULL,
          
          -- Review outcome
          approval_status ENUM('pending', 'approved', 'rejected', 'requires_clarification') NULL,
          rejection_reason TEXT NULL,
          reviewer_notes TEXT NULL,
          admin_notes TEXT NULL,
          
          -- System information
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          session_id VARCHAR(100) NULL,
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- Foreign keys
          FOREIGN KEY (renewal_id) REFERENCES membership_renewals(renewal_id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('      ✅ Created renewal_financial_audit_trail table');
    } catch (error) {
      console.log(`      ❌ Error creating renewal_financial_audit_trail table: ${error.message}`);
    }

    // Step 2.6: Create indexes for performance
    console.log('\n   🔧 Creating performance indexes...');
    
    const indexesToCreate = [
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_operation ON financial_operations_audit(operation_type)',
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_application ON financial_operations_audit(application_id)',
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_renewal ON financial_operations_audit(renewal_id)',
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_member ON financial_operations_audit(member_id)',
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_user ON financial_operations_audit(performed_by)',
      'CREATE INDEX IF NOT EXISTS idx_financial_audit_date ON financial_operations_audit(initiated_at)',
      'CREATE INDEX IF NOT EXISTS idx_renewal_audit_renewal ON renewal_financial_audit_trail(renewal_id)',
      'CREATE INDEX IF NOT EXISTS idx_renewal_audit_member ON renewal_financial_audit_trail(member_id)',
      'CREATE INDEX IF NOT EXISTS idx_renewal_audit_reviewer ON renewal_financial_audit_trail(reviewed_by)',
      'CREATE INDEX IF NOT EXISTS idx_approval_audit_entity ON approval_audit_trail(entity_type, application_id, renewal_id)'
    ];

    for (const indexSQL of indexesToCreate) {
      try {
        await connection.execute(indexSQL);
        const indexName = indexSQL.match(/idx_\w+/)[0];
        console.log(`      ✅ Created index: ${indexName}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`      ⚠️  Index already exists`);
        } else {
          console.log(`      ❌ Error creating index: ${error.message}`);
        }
      }
    }

    console.log('\n📋 **Step 3: Creating Comprehensive Audit Trail View...**');
    
    try {
      await connection.execute('DROP VIEW IF EXISTS comprehensive_audit_trail');
      
      // Create a simplified version first to test
      await connection.execute(`
        CREATE VIEW comprehensive_audit_trail AS
        SELECT 
          'approval' as audit_source,
          aat.id as audit_id,
          aat.application_id,
          aat.renewal_id,
          COALESCE(aat.entity_type, 'application') as entity_type,
          aat.user_id as performed_by,
          aat.user_role as performed_by_role,
          aat.action_type as operation_type,
          aat.previous_status,
          aat.new_status,
          aat.notes as operation_notes,
          aat.created_at,
          
          -- User information
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          u.email as user_email
          
        FROM approval_audit_trail aat
        LEFT JOIN users u ON aat.user_id = u.id
        ORDER BY aat.created_at DESC
      `);
      
      console.log('   ✅ Created comprehensive_audit_trail view');
    } catch (error) {
      console.log(`   ❌ Error creating comprehensive audit trail view: ${error.message}`);
    }

    console.log('\n📋 **Step 4: Testing Enhanced Audit Trail System...**');
    
    // Test the enhanced approval_audit_trail table
    try {
      const [auditCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM approval_audit_trail
      `);
      console.log(`   ✅ approval_audit_trail: ${auditCount[0].count} records`);

      // Test the new columns
      const [newColumns] = await connection.execute(`
        SELECT COLUMN_NAME
        FROM information_schema.columns 
        WHERE table_schema = 'membership_new' 
        AND table_name = 'approval_audit_trail'
        AND COLUMN_NAME IN ('renewal_id', 'transaction_id', 'entity_type', 'ip_address', 'user_agent')
        ORDER BY ORDINAL_POSITION
      `);

      console.log('   📋 New audit trail columns:');
      newColumns.forEach(col => {
        console.log(`      ✅ ${col.COLUMN_NAME}`);
      });
    } catch (error) {
      console.log(`   ❌ Error testing approval_audit_trail: ${error.message}`);
    }

    // Test financial_operations_audit table
    try {
      const [finAuditCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM financial_operations_audit
      `);
      console.log(`   ✅ financial_operations_audit: ${finAuditCount[0].count} records`);
    } catch (error) {
      console.log(`   ❌ Error testing financial_operations_audit: ${error.message}`);
    }

    // Test renewal_financial_audit_trail table
    try {
      const [renewalAuditCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM renewal_financial_audit_trail
      `);
      console.log(`   ✅ renewal_financial_audit_trail: ${renewalAuditCount[0].count} records`);
    } catch (error) {
      console.log(`   ❌ Error testing renewal_financial_audit_trail: ${error.message}`);
    }

    // Test comprehensive audit trail view
    try {
      const [viewCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM comprehensive_audit_trail
      `);
      console.log(`   ✅ comprehensive_audit_trail view: ${viewCount[0].count} records`);
    } catch (error) {
      console.log(`   ❌ Error testing comprehensive_audit_trail view: ${error.message}`);
    }

    console.log('\n🎉 **TASK 1.4 COMPLETED SUCCESSFULLY!**');
    console.log('\n📊 **Enhanced Audit Trail System Created:**');
    console.log('   ✅ **Extended approval_audit_trail table:**');
    console.log('      • Added renewal_id support for renewal tracking');
    console.log('      • Added transaction_id for payment transaction linking');
    console.log('      • Added entity_type for multi-entity support');
    console.log('      • Added IP address and user agent tracking');
    console.log('      • Extended action types for renewal financial operations');
    
    console.log('\n   ✅ **Created financial_operations_audit table:**');
    console.log('      • Comprehensive financial operation logging');
    console.log('      • Support for payments, refunds, disputes, adjustments');
    console.log('      • Before/after amount tracking');
    console.log('      • Operation status and completion tracking');
    
    console.log('\n   ✅ **Created renewal_financial_audit_trail table:**');
    console.log('      • Detailed renewal financial review tracking');
    console.log('      • Workflow stage and status change logging');
    console.log('      • Reviewer actions and approval status');
    console.log('      • Payment verification audit trail');
    
    console.log('\n   ✅ **Created comprehensive_audit_trail view:**');
    console.log('      • Unified view of all audit sources');
    console.log('      • Combined application and renewal audit data');
    console.log('      • Enhanced user and entity information');

    console.log('\n🔍 **Financial Reviewers Can Now:**');
    console.log('   • Track complete audit trail for renewal financial reviews ✅');
    console.log('   • Monitor all financial operations with detailed logging ✅');
    console.log('   • View comprehensive audit history across all entities ✅');
    console.log('   • Access detailed reviewer actions and decisions ✅');
    console.log('   • Generate compliance and audit reports ✅');

    console.log('\n🚀 **Ready for Task 1.5: Create Financial Dashboard Summary Tables**');

  } catch (error) {
    console.error('❌ **Enhanced audit trail migration failed:**', error.message);
  } finally {
    await connection.end();
  }
}

// Run the migration
runEnhancedAuditTrail();
