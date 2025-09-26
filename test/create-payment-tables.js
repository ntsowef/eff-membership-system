const mysql = require('mysql2/promise');

async function createPaymentTables() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Creating payment tables...\n');

    // 1. Payment transactions table
    console.log('📋 Creating payment_transactions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        transaction_id VARCHAR(100) NULL COMMENT 'Gateway transaction ID',
        payment_method ENUM('card', 'cash', 'bank_transfer', 'eft', 'mobile_payment') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ZAR',
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'verification_required') NOT NULL DEFAULT 'pending',
        gateway_response TEXT NULL COMMENT 'JSON response from payment gateway',
        receipt_number VARCHAR(50) NULL COMMENT 'Cash receipt number',
        receipt_image_path VARCHAR(255) NULL COMMENT 'Path to uploaded receipt image',
        verified_by INT NULL COMMENT 'Admin user who verified the payment',
        verified_at TIMESTAMP NULL,
        verification_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
        INDEX idx_payment_application (application_id),
        INDEX idx_payment_status (status),
        INDEX idx_payment_method (payment_method),
        INDEX idx_payment_created (created_at)
      )
    `);

    // 2. Cash payment verifications table
    console.log('📋 Creating cash_payment_verifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cash_payment_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        amount_verified DECIMAL(10,2) NOT NULL,
        verified_by INT NOT NULL,
        verification_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        verification_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
        INDEX idx_cash_verification_transaction (transaction_id),
        INDEX idx_cash_verification_status (verification_status)
      )
    `);

    // 3. Admin notifications table
    console.log('📋 Creating admin_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('payment_verification', 'approval_ready', 'system_alert', 'financial_report') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        application_id INT NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        is_read BOOLEAN DEFAULT FALSE,
        read_by INT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
        INDEX idx_notification_type (type),
        INDEX idx_notification_read (is_read, created_at)
      )
    `);

    // 4. Financial monitoring summary table
    console.log('📋 Creating financial_monitoring_summary table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS financial_monitoring_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        summary_date DATE NOT NULL UNIQUE,
        total_applications INT DEFAULT 0,
        total_revenue DECIMAL(12,2) DEFAULT 0.00,
        card_revenue DECIMAL(12,2) DEFAULT 0.00,
        cash_revenue DECIMAL(12,2) DEFAULT 0.00,
        pending_verifications INT DEFAULT 0,
        failed_transactions INT DEFAULT 0,
        approved_applications INT DEFAULT 0,
        rejected_applications INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_financial_summary_date (summary_date)
      )
    `);

    // 5. Payment gateway configurations table
    console.log('📋 Creating payment_gateway_configs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_gateway_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gateway_name VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NULL,
        access_token VARCHAR(255) NULL,
        secret_key VARCHAR(255) NULL,
        base_url VARCHAR(255) NULL,
        test_mode BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        configuration JSON NULL COMMENT 'Additional gateway-specific settings',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_gateway_name (gateway_name)
      )
    `);

    // 6. Application workflow status table
    console.log('📋 Creating application_workflow_status table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS application_workflow_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL UNIQUE,
        payment_status ENUM('none', 'pending', 'verified', 'failed') DEFAULT 'none',
        document_status ENUM('none', 'uploaded', 'verified', 'rejected') DEFAULT 'none',
        approval_status ENUM('pending', 'ready_for_approval', 'approved', 'rejected') DEFAULT 'pending',
        blocking_issues JSON NULL COMMENT 'Array of issues preventing approval',
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE CASCADE,
        INDEX idx_workflow_payment_status (payment_status),
        INDEX idx_workflow_approval_status (approval_status)
      )
    `);

    // 7. Receipt uploads table
    console.log('📋 Creating receipt_uploads table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS receipt_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_by INT NULL COMMENT 'User who uploaded',
        upload_source ENUM('application_form', 'admin_panel', 'mobile_app') DEFAULT 'application_form',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
        INDEX idx_receipt_transaction (transaction_id)
      )
    `);

    // 8. Financial audit trail table
    console.log('📋 Creating financial_audit_trail table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS financial_audit_trail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        operation_type ENUM('payment_created', 'payment_verified', 'payment_failed', 'refund_issued', 'manual_adjustment') NOT NULL,
        transaction_id INT NULL,
        application_id INT NULL,
        performed_by INT NOT NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        notes TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL,
        FOREIGN KEY (application_id) REFERENCES membership_applications(id) ON DELETE SET NULL,
        INDEX idx_audit_operation (operation_type),
        INDEX idx_audit_created (created_at)
      )
    `);

    // Insert default Peach Payment configuration
    console.log('📋 Inserting default payment gateway config...');
    await connection.execute(`
      INSERT INTO payment_gateway_configs (
        gateway_name, entity_id, base_url, test_mode, is_active, configuration
      ) VALUES (
        'peach_payments', 
        '', 
        'https://test.oppwa.com',
        TRUE,
        TRUE,
        '{"supported_cards": ["VISA", "MASTER", "AMEX"], "currency": "ZAR", "payment_types": ["DB", "PA"], "webhook_enabled": false}'
      ) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `);

    // Insert sample financial monitoring data
    console.log('📋 Inserting sample financial monitoring data...');
    await connection.execute(`
      INSERT INTO financial_monitoring_summary (summary_date, total_applications, total_revenue, card_revenue, cash_revenue)
      VALUES 
        (CURDATE(), 0, 0.00, 0.00, 0.00),
        (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0, 0.00, 0.00, 0.00)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `);

    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME IN (
        'payment_transactions',
        'cash_payment_verifications',
        'admin_notifications',
        'financial_monitoring_summary',
        'payment_gateway_configs',
        'application_workflow_status',
        'receipt_uploads',
        'financial_audit_trail'
      )
      ORDER BY TABLE_NAME
    `);

    console.log('\n✅ Payment system tables created successfully!');
    console.log('\n📋 Created tables:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}`);
    });

    console.log(`\n🎉 Migration completed! Created ${tables.length} new tables for financial monitoring.`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting payment system tables creation...');
createPaymentTables();
