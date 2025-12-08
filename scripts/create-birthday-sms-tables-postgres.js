const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432
});

async function createBirthdaySMSTables() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Creating Birthday SMS Tables...\n');
    
    await client.query('BEGIN');
    
    // 1. Create birthday_sms_config table
    console.log('📋 Creating birthday_sms_config table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_sms_config (
        id SERIAL PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT TRUE,
        template_id INTEGER,
        send_time TIME DEFAULT '09:00:00',
        timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
        days_before_reminder INTEGER DEFAULT 0,
        include_age BOOLEAN DEFAULT TRUE,
        include_organization_name BOOLEAN DEFAULT TRUE,
        max_daily_sends INTEGER DEFAULT 1000,
        retry_failed_sends BOOLEAN DEFAULT TRUE,
        max_retries INTEGER DEFAULT 3,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_birthday_config_enabled ON birthday_sms_config(is_enabled);
    `);
    console.log('✅ birthday_sms_config table created');
    
    // 2. Create birthday_sms_history table
    console.log('📋 Creating birthday_sms_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_sms_history (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        member_phone VARCHAR(20) NOT NULL,
        birth_date DATE NOT NULL,
        age_at_birthday INTEGER,
        template_id INTEGER,
        message_content TEXT NOT NULL,
        campaign_id INTEGER,
        message_id INTEGER,
        scheduled_date DATE NOT NULL,
        sent_at TIMESTAMP,
        delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_birthday_history_member ON birthday_sms_history(member_id);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_scheduled ON birthday_sms_history(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_status ON birthday_sms_history(delivery_status);
      CREATE INDEX IF NOT EXISTS idx_birthday_history_sent ON birthday_sms_history(sent_at);
    `);
    console.log('✅ birthday_sms_history table created');
    
    // 3. Create birthday_sms_queue table
    console.log('📋 Creating birthday_sms_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_sms_queue (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        member_phone VARCHAR(20) NOT NULL,
        birth_date DATE NOT NULL,
        age_at_birthday INTEGER,
        scheduled_for DATE NOT NULL,
        priority VARCHAR(10) CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',
        status VARCHAR(20) CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
        template_id INTEGER,
        personalized_message TEXT,
        queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        UNIQUE (member_id, scheduled_for)
      );
      
      CREATE INDEX IF NOT EXISTS idx_birthday_queue_scheduled ON birthday_sms_queue(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_birthday_queue_status ON birthday_sms_queue(status);
      CREATE INDEX IF NOT EXISTS idx_birthday_queue_priority ON birthday_sms_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_birthday_queue_member ON birthday_sms_queue(member_id);
      CREATE INDEX IF NOT EXISTS idx_birthday_queue_processing ON birthday_sms_queue(status, scheduled_for, priority);
    `);
    console.log('✅ birthday_sms_queue table created');
    
    // 4. Insert default configuration
    console.log('📋 Inserting default birthday SMS configuration...');
    const configCheck = await client.query('SELECT COUNT(*) as count FROM birthday_sms_config');
    
    if (parseInt(configCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO birthday_sms_config (
          is_enabled,
          send_time,
          timezone,
          include_age,
          include_organization_name,
          max_daily_sends
        ) VALUES (
          TRUE,
          '09:00:00',
          'Africa/Johannesburg',
          TRUE,
          TRUE,
          1000
        )
      `);
      console.log('✅ Default configuration inserted');
    } else {
      console.log('ℹ️  Configuration already exists, skipping insert');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Birthday SMS tables created successfully!\n');
    
    // Display summary
    const configCount = await client.query('SELECT COUNT(*) as count FROM birthday_sms_config');
    const historyCount = await client.query('SELECT COUNT(*) as count FROM birthday_sms_history');
    const queueCount = await client.query('SELECT COUNT(*) as count FROM birthday_sms_queue');
    
    console.log('📊 Summary:');
    console.log(`   - birthday_sms_config: ${configCount.rows[0].count} rows`);
    console.log(`   - birthday_sms_history: ${historyCount.rows[0].count} rows`);
    console.log(`   - birthday_sms_queue: ${queueCount.rows[0].count} rows`);
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating birthday SMS tables:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createBirthdaySMSTables()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });

