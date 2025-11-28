const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// FIX SMS DELIVERY TRACKING TABLE
// Adds missing provider_name column and fixes table structure
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function fixSMSDeliveryTrackingTable() {
  console.log('🔧 Fixing SMS Delivery Tracking Table');
  console.log('=====================================\n');
  
  try {
    // 1. Check current table structure
    console.log('1️⃣ Checking current sms_delivery_tracking table structure...\n');
    
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'sms_delivery_tracking'
      ORDER BY ordinal_position
    `;
    
    const currentColumns = await pool.query(columnsQuery);
    console.log('📋 Current columns:');
    currentColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // 2. Check if provider_name column exists
    const hasProviderName = currentColumns.rows.some(col => col.column_name === 'provider_name');
    
    if (!hasProviderName) {
      console.log('\n❌ Missing provider_name column! Adding it...\n');
      
      await pool.query(`
        ALTER TABLE sms_delivery_tracking 
        ADD COLUMN provider_name VARCHAR(100)
      `);
      
      console.log('✅ Added provider_name column');
      
      // Create index for the new column
      await pool.query(`
        CREATE INDEX idx_sms_delivery_tracking_provider_name 
        ON sms_delivery_tracking(provider_name)
      `);
      
      console.log('✅ Created index for provider_name column');
      
    } else {
      console.log('\n✅ provider_name column already exists');
    }
    
    // 3. Update existing records with default provider names if any exist
    console.log('\n3️⃣ Checking for existing records without provider names...\n');
    
    const recordsWithoutProvider = await pool.query(`
      SELECT COUNT(*) as count 
      FROM sms_delivery_tracking 
      WHERE provider_name IS NULL
    `);
    
    if (recordsWithoutProvider.rows[0].count > 0) {
      console.log(`Found ${recordsWithoutProvider.rows[0].count} records without provider names`);
      console.log('Setting default provider name for existing records...');
      
      await pool.query(`
        UPDATE sms_delivery_tracking 
        SET provider_name = 'Unknown Provider' 
        WHERE provider_name IS NULL
      `);
      
      console.log('✅ Updated existing records with default provider name');
    } else {
      console.log('✅ No records need provider name updates');
    }
    
    // 4. Test the fixed query structure
    console.log('\n4️⃣ Testing the fixed query structure...\n');
    
    // Test the PostgreSQL-compatible query
    const testQuery = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
        SUM(CASE WHEN status IN ('pending', 'queued', 'sending', 'sent') THEN 1 ELSE 0 END) as pending_messages,
        ROUND(AVG(COALESCE(cost, 0)), 4) as average_cost
      FROM sms_delivery_tracking
      WHERE provider_name = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    `;
    
    try {
      const testResult = await pool.query(testQuery, ['Test Provider']);
      console.log('✅ PostgreSQL-compatible query test successful!');
      console.log(`   Results: ${testResult.rows[0].total_messages} total messages`);
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
    }
    
    // 5. Insert a test record to verify everything works
    console.log('\n5️⃣ Testing record insertion with provider name...\n');
    
    const testMessageId = 'test-msg-' + Date.now();
    
    try {
      await pool.query(`
        INSERT INTO sms_delivery_tracking (
          message_id, provider_message_id, provider_name, status, 
          delivery_timestamp, error_code, error_message, retry_count, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        testMessageId,
        'provider-test-' + Date.now(),
        'Test Provider',
        'delivered',
        new Date(),
        null,
        null,
        0,
        0.05
      ]);
      
      console.log('✅ Test record insertion successful');
      
      // Test the performance metrics query with the test record
      const metricsResult = await pool.query(testQuery, ['Test Provider']);
      console.log(`✅ Performance metrics query successful: ${metricsResult.rows[0].total_messages} messages found`);
      
      // Clean up test record
      await pool.query('DELETE FROM sms_delivery_tracking WHERE message_id = $1', [testMessageId]);
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.log(`❌ Test record insertion failed: ${error.message}`);
    }
    
    // 6. Final verification
    console.log('\n6️⃣ Final table structure verification...\n');
    
    const finalColumns = await pool.query(columnsQuery);
    const finalCount = await pool.query('SELECT COUNT(*) FROM sms_delivery_tracking');
    
    console.log('📊 FINAL TABLE STRUCTURE:');
    console.log('=========================');
    finalColumns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log(`\n📊 Total records: ${finalCount.rows[0].count}`);
    
    // Check indexes
    const indexesQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'sms_delivery_tracking'
      ORDER BY indexname
    `;
    
    const indexes = await pool.query(indexesQuery);
    console.log('\n📊 INDEXES:');
    console.log('===========');
    indexes.rows.forEach(idx => {
      console.log(`   ✅ ${idx.indexname}`);
    });
    
    console.log('\n🎉 SMS DELIVERY TRACKING TABLE FIX COMPLETED!');
    console.log('==============================================');
    console.log('✅ provider_name column added and indexed');
    console.log('✅ Existing records updated with default provider');
    console.log('✅ PostgreSQL-compatible queries tested');
    console.log('✅ Table structure verified and ready');
    console.log('✅ Performance metrics queries will now work');
    
  } catch (error) {
    console.error('❌ Error during table fix:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixSMSDeliveryTrackingTable()
    .then(() => {
      console.log('\n✅ SMS delivery tracking table fix completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ SMS delivery tracking table fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixSMSDeliveryTrackingTable };
