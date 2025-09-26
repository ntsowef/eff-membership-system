#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function createMaintenanceTables() {
  try {
    console.log('🔧 Creating Maintenance Mode Tables...\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'membership_new'
    });
    
    // Create maintenance_mode table
    console.log('📋 Creating maintenance_mode table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_mode (
        id INT PRIMARY KEY AUTO_INCREMENT,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        maintenance_message TEXT,
        maintenance_level ENUM('full_system', 'api_only', 'frontend_only', 'specific_modules') NOT NULL DEFAULT 'full_system',
        affected_modules JSON,
        
        scheduled_start TIMESTAMP NULL,
        scheduled_end TIMESTAMP NULL,
        auto_enable BOOLEAN NOT NULL DEFAULT FALSE,
        auto_disable BOOLEAN NOT NULL DEFAULT FALSE,
        
        bypass_admin_users BOOLEAN NOT NULL DEFAULT TRUE,
        bypass_roles JSON,
        bypass_ip_addresses JSON,
        bypass_user_ids JSON,
        
        enabled_by INT,
        disabled_by INT,
        enabled_at TIMESTAMP NULL,
        disabled_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (enabled_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (disabled_by) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_maintenance_enabled (is_enabled),
        INDEX idx_maintenance_schedule (scheduled_start, scheduled_end),
        INDEX idx_maintenance_level (maintenance_level)
      )
    `);
    console.log('✅ maintenance_mode table created');
    
    // Create maintenance_mode_logs table
    console.log('📋 Creating maintenance_mode_logs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_mode_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        action ENUM('enabled', 'disabled', 'scheduled', 'auto_enabled', 'auto_disabled', 'updated') NOT NULL,
        maintenance_level VARCHAR(50),
        message TEXT,
        scheduled_start TIMESTAMP NULL,
        scheduled_end TIMESTAMP NULL,
        bypass_settings JSON,
        
        user_id INT,
        user_email VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_maintenance_logs_action (action),
        INDEX idx_maintenance_logs_user (user_id),
        INDEX idx_maintenance_logs_created (created_at)
      )
    `);
    console.log('✅ maintenance_mode_logs table created');
    
    // Create maintenance_notifications table
    console.log('📋 Creating maintenance_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        notification_type ENUM('warning', 'immediate', 'completed') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        scheduled_maintenance_start TIMESTAMP NULL,
        
        target_all_users BOOLEAN NOT NULL DEFAULT TRUE,
        target_roles JSON,
        target_user_ids JSON,
        
        is_sent BOOLEAN NOT NULL DEFAULT FALSE,
        sent_at TIMESTAMP NULL,
        
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_maintenance_notifications_type (notification_type),
        INDEX idx_maintenance_notifications_sent (is_sent),
        INDEX idx_maintenance_notifications_schedule (scheduled_maintenance_start)
      )
    `);
    console.log('✅ maintenance_notifications table created');
    
    // Insert default maintenance mode record
    console.log('📋 Inserting default maintenance mode record...');
    await connection.execute(`
      INSERT INTO maintenance_mode (
        is_enabled, 
        maintenance_message, 
        maintenance_level,
        bypass_admin_users,
        bypass_roles,
        bypass_ip_addresses,
        bypass_user_ids
      ) VALUES (
        FALSE,
        'The system is currently under maintenance. Please check back shortly.',
        'full_system',
        TRUE,
        JSON_ARRAY('super_admin', 'system_admin'),
        JSON_ARRAY(),
        JSON_ARRAY()
      ) ON DUPLICATE KEY UPDATE id = id
    `);
    console.log('✅ Default maintenance mode record inserted');
    
    // Create view for current maintenance status
    console.log('📋 Creating maintenance status view...');
    await connection.execute(`DROP VIEW IF EXISTS vw_current_maintenance_status`);
    await connection.execute(`
      CREATE VIEW vw_current_maintenance_status AS
      SELECT 
        m.*,
        CASE 
          WHEN m.is_enabled = TRUE THEN 'active'
          WHEN m.scheduled_start IS NOT NULL AND m.scheduled_start > NOW() THEN 'scheduled'
          WHEN m.scheduled_start IS NOT NULL AND m.scheduled_start <= NOW() AND m.scheduled_end > NOW() THEN 'should_be_active'
          ELSE 'inactive'
        END as status,
        CASE 
          WHEN m.scheduled_start IS NOT NULL AND m.scheduled_start > NOW() 
          THEN TIMESTAMPDIFF(MINUTE, NOW(), m.scheduled_start)
          ELSE NULL
        END as minutes_until_start,
        CASE 
          WHEN m.is_enabled = TRUE AND m.scheduled_end IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, NOW(), m.scheduled_end)
          ELSE NULL
        END as minutes_until_end,
        enabled_user.name as enabled_by_name,
        enabled_user.email as enabled_by_email,
        disabled_user.name as disabled_by_name,
        disabled_user.email as disabled_by_email
      FROM maintenance_mode m
      LEFT JOIN users enabled_user ON m.enabled_by = enabled_user.id
      LEFT JOIN users disabled_user ON m.disabled_by = disabled_user.id
      ORDER BY m.id DESC
      LIMIT 1
    `);
    console.log('✅ Maintenance status view created');
    
    // Verify everything was created
    console.log('\n📊 Verifying tables...');
    const tables = ['maintenance_mode', 'maintenance_mode_logs', 'maintenance_notifications'];
    
    for (const tableName of tables) {
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'membership_new' 
        AND TABLE_NAME = ?
      `, [tableName]);
      
      if (rows[0].count > 0) {
        console.log(`✅ ${tableName} verified`);
      } else {
        console.log(`❌ ${tableName} not found`);
      }
    }
    
    // Test the initial record
    console.log('\n📋 Testing initial maintenance record...');
    const [maintenanceRows] = await connection.execute('SELECT * FROM maintenance_mode LIMIT 1');
    
    if (maintenanceRows.length > 0) {
      const record = maintenanceRows[0];
      console.log('✅ Initial record found:');
      console.log(`   Enabled: ${record.is_enabled ? 'Yes' : 'No'}`);
      console.log(`   Level: ${record.maintenance_level}`);
      console.log(`   Message: ${record.maintenance_message}`);
    }
    
    await connection.end();
    
    console.log('\n🎉 Maintenance Mode Tables Created Successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

createMaintenanceTables();
