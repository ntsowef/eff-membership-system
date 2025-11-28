const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CHECK MISSING TABLES AND CREATE THEM
// Identifies missing tables and creates essential ones for the system
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function checkAndCreateMissingTables() {
  console.log('🔍 Checking for Missing Tables');
  console.log('==============================\n');
  
  try {
    // 1. Get existing tables
    console.log('1️⃣ Checking Existing Tables...\n');
    
    const existingTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const existingTables = existingTablesResult.rows.map(row => row.table_name);
    console.log('📋 EXISTING TABLES:');
    existingTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });
    console.log(`\n   Total: ${existingTables.length} tables\n`);
    
    // 2. Define expected/essential tables
    const essentialTables = {
      'message_queue': {
        description: 'Queue for processing messages (SMS, Email)',
        sql: `
          CREATE TABLE message_queue (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'push'
            recipient VARCHAR(255) NOT NULL,
            subject VARCHAR(500),
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
            priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
            scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 3,
            error_message TEXT,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX idx_message_queue_status ON message_queue(status);
          CREATE INDEX idx_message_queue_type ON message_queue(type);
          CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_at);
        `
      },
      
      'communication_logs': {
        description: 'Logs for all communication activities',
        sql: `
          CREATE TABLE communication_logs (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL, -- 'sms', 'email', 'push', 'bulk'
            recipient VARCHAR(255) NOT NULL,
            sender VARCHAR(255),
            subject VARCHAR(500),
            message TEXT,
            status VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'failed', 'bounced'
            provider VARCHAR(100), -- 'twilio', 'clickatell', 'smtp', etc.
            provider_message_id VARCHAR(255),
            cost DECIMAL(10,4),
            delivery_time TIMESTAMP,
            error_code VARCHAR(100),
            error_message TEXT,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX idx_communication_logs_type ON communication_logs(type);
          CREATE INDEX idx_communication_logs_status ON communication_logs(status);
          CREATE INDEX idx_communication_logs_recipient ON communication_logs(recipient);
          CREATE INDEX idx_communication_logs_created ON communication_logs(created_at);
        `
      },
      
      'bulk_operations': {
        description: 'Track bulk operations like imports, exports, mass communications',
        sql: `
          CREATE TABLE bulk_operations (
            id SERIAL PRIMARY KEY,
            operation_type VARCHAR(100) NOT NULL, -- 'import', 'export', 'mass_sms', 'mass_email'
            status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
            initiated_by INTEGER REFERENCES users(user_id),
            total_records INTEGER DEFAULT 0,
            processed_records INTEGER DEFAULT 0,
            successful_records INTEGER DEFAULT 0,
            failed_records INTEGER DEFAULT 0,
            file_path VARCHAR(500),
            result_file_path VARCHAR(500),
            parameters JSONB,
            error_log TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
          CREATE INDEX idx_bulk_operations_type ON bulk_operations(operation_type);
          CREATE INDEX idx_bulk_operations_user ON bulk_operations(initiated_by);
        `
      },
      
      'file_processing_jobs': {
        description: 'Queue for file processing jobs',
        sql: `
          CREATE TABLE file_processing_jobs (
            id SERIAL PRIMARY KEY,
            job_type VARCHAR(100) NOT NULL, -- 'excel_import', 'pdf_export', 'image_resize'
            status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
            file_path VARCHAR(500) NOT NULL,
            output_path VARCHAR(500),
            parameters JSONB,
            progress INTEGER DEFAULT 0, -- 0-100
            error_message TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX idx_file_processing_status ON file_processing_jobs(status);
          CREATE INDEX idx_file_processing_type ON file_processing_jobs(job_type);
        `
      },
      
      'cache_metrics': {
        description: 'Store cache performance metrics',
        sql: `
          CREATE TABLE cache_metrics (
            id SERIAL PRIMARY KEY,
            endpoint VARCHAR(255) NOT NULL,
            cache_key VARCHAR(500),
            hit_count INTEGER DEFAULT 0,
            miss_count INTEGER DEFAULT 0,
            avg_response_time DECIMAL(10,3),
            last_hit TIMESTAMP,
            last_miss TIMESTAMP,
            date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE UNIQUE INDEX idx_cache_metrics_endpoint_date ON cache_metrics(endpoint, date);
          CREATE INDEX idx_cache_metrics_date ON cache_metrics(date);
        `
      },
      
      'system_logs': {
        description: 'System-wide logging for debugging and monitoring',
        sql: `
          CREATE TABLE system_logs (
            id SERIAL PRIMARY KEY,
            level VARCHAR(20) NOT NULL, -- 'error', 'warn', 'info', 'debug'
            category VARCHAR(100) NOT NULL, -- 'auth', 'database', 'cache', 'api', 'security'
            message TEXT NOT NULL,
            details JSONB,
            user_id INTEGER REFERENCES users(user_id),
            ip_address INET,
            user_agent TEXT,
            request_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX idx_system_logs_level ON system_logs(level);
          CREATE INDEX idx_system_logs_category ON system_logs(category);
          CREATE INDEX idx_system_logs_created ON system_logs(created_at);
          CREATE INDEX idx_system_logs_user ON system_logs(user_id);
        `
      },
      
      'notifications': {
        description: 'In-app notifications for users',
        sql: `
          CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(user_id),
            type VARCHAR(100) NOT NULL, -- 'info', 'warning', 'error', 'success'
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            action_url VARCHAR(500),
            is_read BOOLEAN DEFAULT FALSE,
            is_dismissed BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP,
            dismissed_at TIMESTAMP
          );
          
          CREATE INDEX idx_notifications_user ON notifications(user_id);
          CREATE INDEX idx_notifications_read ON notifications(is_read);
          CREATE INDEX idx_notifications_type ON notifications(type);
          CREATE INDEX idx_notifications_created ON notifications(created_at);
        `
      }
    };
    
    // 3. Check which tables are missing
    console.log('2️⃣ Identifying Missing Tables...\n');
    
    const missingTables = [];
    for (const [tableName, tableInfo] of Object.entries(essentialTables)) {
      if (!existingTables.includes(tableName)) {
        missingTables.push({ name: tableName, ...tableInfo });
      }
    }
    
    if (missingTables.length === 0) {
      console.log('✅ All essential tables exist!\n');
    } else {
      console.log('⚠️  MISSING ESSENTIAL TABLES:');
      missingTables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name} - ${table.description}`);
      });
      console.log('');
    }
    
    // 4. Create missing tables
    if (missingTables.length > 0) {
      console.log('3️⃣ Creating Missing Tables...\n');
      
      for (const table of missingTables) {
        try {
          console.log(`📝 Creating table: ${table.name}`);
          await pool.query(table.sql);
          console.log(`   ✅ ${table.name} created successfully`);
        } catch (error) {
          console.log(`   ❌ Failed to create ${table.name}: ${error.message}`);
        }
      }
      console.log('');
    }
    
    // 5. Verify final table count
    console.log('4️⃣ Final Verification...\n');
    
    const finalTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const finalTables = finalTablesResult.rows.map(row => row.table_name);
    console.log('📊 FINAL TABLE COUNT:');
    console.log(`   Before: ${existingTables.length} tables`);
    console.log(`   After: ${finalTables.length} tables`);
    console.log(`   Created: ${finalTables.length - existingTables.length} new tables\n`);
    
    // 6. Show newly created tables
    const newTables = finalTables.filter(table => !existingTables.includes(table));
    if (newTables.length > 0) {
      console.log('🆕 NEWLY CREATED TABLES:');
      newTables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table}`);
      });
      console.log('');
    }
    
    // 7. Summary
    console.log('🎉 TABLE VERIFICATION COMPLETED!');
    console.log('=================================');
    console.log(`✅ Total tables: ${finalTables.length}`);
    console.log(`✅ Essential tables: ${Object.keys(essentialTables).length}`);
    console.log(`✅ Missing tables created: ${newTables.length}`);
    console.log('✅ Database structure is now complete');
    console.log('');
    console.log('📋 ESSENTIAL TABLES STATUS:');
    console.log('===========================');
    
    for (const tableName of Object.keys(essentialTables)) {
      const exists = finalTables.includes(tableName);
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
if (require.main === module) {
  checkAndCreateMissingTables()
    .then(() => {
      console.log('\n✅ Table verification completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Table verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAndCreateMissingTables };
