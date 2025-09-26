const mysql = require('mysql2/promise');

async function deployTables() {
  try {
    console.log('🚀 Deploying Communication Module Tables...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Connected to database: membership_new');
    
    // Define tables to create
    const tables = [
      {
        name: 'message_templates',
        sql: `CREATE TABLE IF NOT EXISTS message_templates (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          template_type ENUM('Email', 'SMS', 'In-App', 'Push') NOT NULL,
          category ENUM('System', 'Marketing', 'Announcement', 'Reminder', 'Welcome', 'Custom') DEFAULT 'Custom',
          subject VARCHAR(500),
          content TEXT NOT NULL,
          variables JSON,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_template_type (template_type),
          INDEX idx_category (category),
          INDEX idx_active (is_active)
        )`
      },
      {
        name: 'communication_campaigns',
        sql: `CREATE TABLE IF NOT EXISTS communication_campaigns (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          campaign_type ENUM('Mass', 'Targeted', 'Individual') NOT NULL,
          status ENUM('Draft', 'Scheduled', 'Sending', 'Completed', 'Cancelled', 'Failed') DEFAULT 'Draft',
          template_id INT,
          delivery_channels JSON,
          target_criteria JSON,
          recipient_count INT DEFAULT 0,
          scheduled_at TIMESTAMP NULL,
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          total_sent INT DEFAULT 0,
          total_delivered INT DEFAULT 0,
          total_failed INT DEFAULT 0,
          total_opened INT DEFAULT 0,
          total_clicked INT DEFAULT 0,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
          INDEX idx_campaign_status (status),
          INDEX idx_campaign_type (campaign_type),
          INDEX idx_scheduled_at (scheduled_at),
          INDEX idx_created_by (created_by)
        )`
      },
      {
        name: 'messages',
        sql: `CREATE TABLE IF NOT EXISTS messages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          conversation_id VARCHAR(50) NOT NULL,
          campaign_id INT NULL,
          sender_type ENUM('Admin', 'Member', 'System') NOT NULL,
          sender_id INT NULL,
          recipient_type ENUM('Admin', 'Member', 'All') NOT NULL,
          recipient_id INT NULL,
          subject VARCHAR(500),
          content TEXT NOT NULL,
          message_type ENUM('Text', 'HTML', 'Template') DEFAULT 'Text',
          template_id INT NULL,
          template_data JSON,
          delivery_channels JSON,
          delivery_status ENUM('Draft', 'Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Read') DEFAULT 'Draft',
          sent_at TIMESTAMP NULL,
          delivered_at TIMESTAMP NULL,
          read_at TIMESTAMP NULL,
          failed_reason TEXT NULL,
          priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
          is_reply BOOLEAN DEFAULT FALSE,
          parent_message_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE SET NULL,
          FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
          FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL,
          INDEX idx_conversation (conversation_id),
          INDEX idx_sender (sender_type, sender_id),
          INDEX idx_recipient (recipient_type, recipient_id),
          INDEX idx_delivery_status (delivery_status),
          INDEX idx_sent_at (sent_at),
          INDEX idx_campaign (campaign_id)
        )`
      },
      {
        name: 'message_deliveries',
        sql: `CREATE TABLE IF NOT EXISTS message_deliveries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          message_id INT NOT NULL,
          campaign_id INT NULL,
          recipient_type ENUM('Member', 'Admin') NOT NULL,
          recipient_id INT NOT NULL,
          recipient_email VARCHAR(255),
          recipient_phone VARCHAR(20),
          delivery_channel ENUM('Email', 'SMS', 'In-App', 'Push') NOT NULL,
          delivery_status ENUM('Queued', 'Sending', 'Sent', 'Delivered', 'Failed', 'Bounced', 'Opened', 'Clicked') DEFAULT 'Queued',
          queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sent_at TIMESTAMP NULL,
          delivered_at TIMESTAMP NULL,
          opened_at TIMESTAMP NULL,
          clicked_at TIMESTAMP NULL,
          failed_at TIMESTAMP NULL,
          failure_reason TEXT NULL,
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          next_retry_at TIMESTAMP NULL,
          external_message_id VARCHAR(255),
          tracking_data JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE SET NULL,
          INDEX idx_message (message_id),
          INDEX idx_campaign (campaign_id),
          INDEX idx_recipient (recipient_type, recipient_id),
          INDEX idx_delivery_status (delivery_status),
          INDEX idx_delivery_channel (delivery_channel),
          INDEX idx_retry (next_retry_at, retry_count)
        )`
      },
      {
        name: 'communication_preferences',
        sql: `CREATE TABLE IF NOT EXISTS communication_preferences (
          id INT PRIMARY KEY AUTO_INCREMENT,
          member_id INT NOT NULL,
          email_enabled BOOLEAN DEFAULT TRUE,
          sms_enabled BOOLEAN DEFAULT TRUE,
          in_app_enabled BOOLEAN DEFAULT TRUE,
          push_enabled BOOLEAN DEFAULT TRUE,
          marketing_emails BOOLEAN DEFAULT TRUE,
          system_notifications BOOLEAN DEFAULT TRUE,
          membership_reminders BOOLEAN DEFAULT TRUE,
          event_notifications BOOLEAN DEFAULT TRUE,
          newsletter BOOLEAN DEFAULT TRUE,
          digest_frequency ENUM('Immediate', 'Daily', 'Weekly', 'Monthly') DEFAULT 'Immediate',
          quiet_hours_start TIME DEFAULT '22:00:00',
          quiet_hours_end TIME DEFAULT '08:00:00',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_member_preferences (member_id)
        )`
      },
      {
        name: 'communication_analytics',
        sql: `CREATE TABLE IF NOT EXISTS communication_analytics (
          id INT PRIMARY KEY AUTO_INCREMENT,
          date DATE NOT NULL,
          campaigns_sent INT DEFAULT 0,
          campaigns_completed INT DEFAULT 0,
          campaigns_failed INT DEFAULT 0,
          emails_sent INT DEFAULT 0,
          emails_delivered INT DEFAULT 0,
          emails_opened INT DEFAULT 0,
          emails_clicked INT DEFAULT 0,
          emails_bounced INT DEFAULT 0,
          sms_sent INT DEFAULT 0,
          sms_delivered INT DEFAULT 0,
          sms_failed INT DEFAULT 0,
          in_app_sent INT DEFAULT 0,
          in_app_delivered INT DEFAULT 0,
          in_app_read INT DEFAULT 0,
          province_breakdown JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_date_analytics (date),
          INDEX idx_date (date)
        )`
      },
      {
        name: 'message_queue',
        sql: `CREATE TABLE IF NOT EXISTS message_queue (
          id INT PRIMARY KEY AUTO_INCREMENT,
          campaign_id INT NULL,
          message_id INT NOT NULL,
          queue_type ENUM('Immediate', 'Scheduled', 'Batch', 'Retry') DEFAULT 'Immediate',
          priority INT DEFAULT 5,
          status ENUM('Pending', 'Processing', 'Completed', 'Failed') DEFAULT 'Pending',
          scheduled_for TIMESTAMP NULL,
          processed_at TIMESTAMP NULL,
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          retry_after TIMESTAMP NULL,
          error_message TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (campaign_id) REFERENCES communication_campaigns(id) ON DELETE CASCADE,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          INDEX idx_queue_status (status),
          INDEX idx_priority (priority),
          INDEX idx_scheduled_for (scheduled_for),
          INDEX idx_retry_after (retry_after)
        )`
      }
    ];
    
    // Create tables
    let created = 0;
    let existed = 0;
    
    for (const table of tables) {
      try {
        await connection.execute(table.sql);
        console.log(`✅ Table ready: ${table.name}`);
        created++;
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⏭️  Table exists: ${table.name}`);
          existed++;
        } else {
          console.error(`❌ Error creating ${table.name}:`, error.message);
        }
      }
    }
    
    // Insert default templates
    console.log('\n📝 Creating default templates...');
    const templates = [
      ['Welcome New Member', 'Welcome message for new members', 'Email', 'Welcome', 'Welcome to {{organization_name}}, {{member_name}}!', '<h2>Welcome {{member_name}}!</h2><p>Thank you for joining {{organization_name}}!</p>', '["member_name", "organization_name"]'],
      ['Membership Renewal', 'Reminder for membership renewal', 'Email', 'Reminder', 'Membership Renewal - {{member_name}}', '<p>Dear {{member_name}}, your membership expires on {{expiry_date}}.</p>', '["member_name", "expiry_date"]'],
      ['SMS Welcome', 'SMS welcome message', 'SMS', 'Welcome', null, 'Welcome {{member_name}}! Your membership ID: {{member_id}}', '["member_name", "member_id"]']
    ];
    
    for (const template of templates) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO message_templates 
          (name, description, template_type, category, subject, content, variables, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, template);
        console.log(`✅ Template: ${template[0]}`);
      } catch (error) {
        console.log(`⏭️  Template exists: ${template[0]}`);
      }
    }
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const [finalTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND (TABLE_NAME LIKE '%communication%' OR TABLE_NAME LIKE '%message%')
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📊 Communication Tables:');
    finalTables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
    await connection.end();
    
    console.log('\n🎉 Communication Module Database Deployment Complete!');
    console.log(`📈 Summary: ${created} created, ${existed} existed, ${finalTables.length} total`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
  }
}

deployTables();
