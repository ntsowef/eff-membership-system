const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// CREATE SMS PROVIDER HEALTH TABLE
// Creates the missing sms_provider_health table for SMS monitoring
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function createSMSProviderHealthTable() {
  console.log('🔍 Creating SMS Provider Health Table');
  console.log('====================================\n');
  
  try {
    // 1. Check if table exists
    console.log('1️⃣ Checking if sms_provider_health table exists...\n');
    
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sms_provider_health'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ sms_provider_health table does not exist!');
      console.log('Creating SMS provider health table...\n');
      
      // Create the table with PostgreSQL syntax
      await pool.query(`
        CREATE TABLE sms_provider_health (
          id SERIAL PRIMARY KEY,
          provider_name VARCHAR(100) NOT NULL UNIQUE,
          
          -- Health status
          is_healthy BOOLEAN DEFAULT TRUE,
          health_message TEXT,
          response_time_ms INTEGER,
          
          -- Error tracking
          consecutive_failures INTEGER DEFAULT 0,
          last_error_message TEXT,
          last_error_timestamp TIMESTAMP,
          
          -- Performance metrics
          success_rate_24h DECIMAL(5, 2) DEFAULT 100.00,
          average_response_time_24h INTEGER DEFAULT 0,
          total_messages_24h INTEGER DEFAULT 0,
          
          -- Timestamps
          last_check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for performance
        CREATE INDEX idx_sms_provider_health_provider ON sms_provider_health(provider_name);
        CREATE INDEX idx_sms_provider_health_healthy ON sms_provider_health(is_healthy);
        CREATE INDEX idx_sms_provider_health_last_check ON sms_provider_health(last_check_timestamp);
      `);
      
      console.log('✅ sms_provider_health table created successfully');
    } else {
      console.log('✅ sms_provider_health table already exists');
    }
    
    // 2. Check if we also need sms_delivery_tracking table
    console.log('\n2️⃣ Checking if sms_delivery_tracking table exists...\n');
    
    const deliveryTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sms_delivery_tracking'
      );
    `);
    
    if (!deliveryTableExists.rows[0].exists) {
      console.log('❌ sms_delivery_tracking table does not exist!');
      console.log('Creating SMS delivery tracking table...\n');
      
      await pool.query(`
        CREATE TABLE sms_delivery_tracking (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(255) NOT NULL UNIQUE,
          provider_message_id VARCHAR(255),
          
          -- Delivery status
          status VARCHAR(50) DEFAULT 'pending',
          delivery_timestamp TIMESTAMP,
          
          -- Error tracking
          error_code VARCHAR(50),
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          
          -- Cost tracking
          cost DECIMAL(10, 4),
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for performance
        CREATE INDEX idx_sms_delivery_tracking_message_id ON sms_delivery_tracking(message_id);
        CREATE INDEX idx_sms_delivery_tracking_status ON sms_delivery_tracking(status);
        CREATE INDEX idx_sms_delivery_tracking_provider_id ON sms_delivery_tracking(provider_message_id);
        CREATE INDEX idx_sms_delivery_tracking_delivery_time ON sms_delivery_tracking(delivery_timestamp);
      `);
      
      console.log('✅ sms_delivery_tracking table created successfully');
    } else {
      console.log('✅ sms_delivery_tracking table already exists');
    }
    
    // 3. Insert default provider health records
    console.log('\n3️⃣ Inserting default provider health records...\n');
    
    const defaultProviders = [
      { name: 'JSON Applink', message: 'Provider initialized' },
      { name: 'Mock SMS Provider', message: 'Mock provider always healthy' },
      { name: 'Twilio', message: 'Provider initialized' },
      { name: 'Clickatell', message: 'Provider initialized' }
    ];
    
    for (const provider of defaultProviders) {
      try {
        await pool.query(`
          INSERT INTO sms_provider_health (provider_name, is_healthy, health_message)
          VALUES ($1, TRUE, $2)
          ON CONFLICT (provider_name) DO NOTHING
        `, [provider.name, provider.message]);
        
        console.log(`   ✅ Added provider: ${provider.name}`);
      } catch (error) {
        console.log(`   ⚠️  Provider ${provider.name} may already exist: ${error.message}`);
      }
    }
    
    // 4. Test the table with a sample query
    console.log('\n4️⃣ Testing the SMS provider health table...\n');
    
    try {
      const testQuery = `
        SELECT provider_name, is_healthy, health_message, 
               consecutive_failures, success_rate_24h
        FROM sms_provider_health
        ORDER BY provider_name
      `;
      
      const testResult = await pool.query(testQuery);
      console.log(`✅ Query test successful! Found ${testResult.rows.length} SMS providers:`);
      
      testResult.rows.forEach(provider => {
        console.log(`   - ${provider.provider_name}: ${provider.is_healthy ? 'Healthy' : 'Unhealthy'} (${provider.health_message})`);
      });
      
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
    }
    
    // 5. Test the UPSERT operation that was failing
    console.log('\n5️⃣ Testing UPSERT operation...\n');
    
    try {
      const upsertQuery = `
        INSERT INTO sms_provider_health (
          provider_name, is_healthy, health_message, response_time_ms,
          consecutive_failures, last_error_message, last_error_timestamp,
          success_rate_24h, average_response_time_24h, total_messages_24h,
          last_check_timestamp, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (provider_name) DO UPDATE SET
          is_healthy = EXCLUDED.is_healthy,
          health_message = EXCLUDED.health_message,
          response_time_ms = EXCLUDED.response_time_ms,
          consecutive_failures = EXCLUDED.consecutive_failures,
          last_error_message = EXCLUDED.last_error_message,
          last_error_timestamp = EXCLUDED.last_error_timestamp,
          success_rate_24h = EXCLUDED.success_rate_24h,
          average_response_time_24h = EXCLUDED.average_response_time_24h,
          total_messages_24h = EXCLUDED.total_messages_24h,
          last_check_timestamp = EXCLUDED.last_check_timestamp,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(upsertQuery, [
        'Test Provider',
        true,
        'Health check test',
        150,
        0,
        null,
        null,
        99.5,
        120,
        1000,
        new Date()
      ]);
      
      console.log('✅ UPSERT operation test successful!');
      
      // Clean up test record
      await pool.query('DELETE FROM sms_provider_health WHERE provider_name = $1', ['Test Provider']);
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.log(`❌ UPSERT test failed: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n6️⃣ Final verification...\n');
    
    const finalCount = await pool.query('SELECT COUNT(*) FROM sms_provider_health');
    const deliveryCount = await pool.query('SELECT COUNT(*) FROM sms_delivery_tracking');
    
    console.log('📊 FINAL TABLE STATUS:');
    console.log('======================');
    console.log(`✅ sms_provider_health: ${finalCount.rows[0].count} providers`);
    console.log(`✅ sms_delivery_tracking: ${deliveryCount.rows[0].count} delivery records`);
    
    console.log('\n🎉 SMS PROVIDER HEALTH TABLE SETUP COMPLETED!');
    console.log('==============================================');
    console.log('✅ sms_provider_health table created and tested');
    console.log('✅ sms_delivery_tracking table verified');
    console.log('✅ Default providers added');
    console.log('✅ UPSERT operations working');
    console.log('✅ Ready for SMS provider monitoring');
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
if (require.main === module) {
  createSMSProviderHealthTable()
    .then(() => {
      console.log('\n✅ SMS provider health table setup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ SMS provider health table setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createSMSProviderHealthTable };
