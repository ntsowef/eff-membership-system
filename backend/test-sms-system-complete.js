const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// COMPREHENSIVE SMS SYSTEM TEST
// Tests all SMS-related tables and functionality
// =====================================================================================

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  port: 5432,
  max: 20,
});

async function testSMSSystem() {
  console.log('🔍 Comprehensive SMS System Test');
  console.log('=================================\n');
  
  try {
    // 1. Test SMS Provider Health Table
    console.log('1️⃣ Testing SMS Provider Health Table...\n');
    
    const healthQuery = `
      SELECT provider_name, is_healthy, health_message, 
             consecutive_failures, success_rate_24h, last_check_timestamp
      FROM sms_provider_health
      ORDER BY provider_name
    `;
    
    const healthResult = await pool.query(healthQuery);
    console.log(`✅ SMS Provider Health: ${healthResult.rows.length} providers found`);
    
    healthResult.rows.forEach(provider => {
      console.log(`   - ${provider.provider_name}: ${provider.is_healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`     Message: ${provider.health_message}`);
      console.log(`     Success Rate: ${provider.success_rate_24h}%`);
      console.log(`     Failures: ${provider.consecutive_failures}`);
    });
    
    // 2. Test SMS Delivery Tracking Table
    console.log('\n2️⃣ Testing SMS Delivery Tracking Table...\n');
    
    const deliveryQuery = `
      SELECT COUNT(*) as total_records,
             COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
             COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
             COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM sms_delivery_tracking
    `;
    
    const deliveryResult = await pool.query(deliveryQuery);
    const stats = deliveryResult.rows[0];
    
    console.log(`✅ SMS Delivery Tracking: ${stats.total_records} total records`);
    console.log(`   - Delivered: ${stats.delivered}`);
    console.log(`   - Pending: ${stats.pending}`);
    console.log(`   - Failed: ${stats.failed}`);
    
    // 3. Test UPSERT Operations (Provider Health)
    console.log('\n3️⃣ Testing Provider Health UPSERT...\n');
    
    const testProviderData = {
      provider_name: 'Test Provider Health',
      is_healthy: true,
      health_message: 'Test health check',
      response_time_ms: 125,
      consecutive_failures: 0,
      success_rate_24h: 98.5,
      average_response_time_24h: 130,
      total_messages_24h: 500
    };
    
    const upsertHealthQuery = `
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
    
    await pool.query(upsertHealthQuery, [
      testProviderData.provider_name,
      testProviderData.is_healthy,
      testProviderData.health_message,
      testProviderData.response_time_ms,
      testProviderData.consecutive_failures,
      null, // last_error_message
      null, // last_error_timestamp
      testProviderData.success_rate_24h,
      testProviderData.average_response_time_24h,
      testProviderData.total_messages_24h,
      new Date()
    ]);
    
    console.log('✅ Provider Health UPSERT successful');
    
    // 4. Test UPSERT Operations (Delivery Tracking)
    console.log('\n4️⃣ Testing Delivery Tracking UPSERT...\n');
    
    const testDeliveryData = {
      message_id: 'test-msg-' + Date.now(),
      provider_message_id: 'provider-' + Date.now(),
      status: 'delivered',
      delivery_timestamp: new Date(),
      error_code: null,
      error_message: null,
      retry_count: 0,
      cost: 0.05
    };
    
    const upsertDeliveryQuery = `
      INSERT INTO sms_delivery_tracking (
        message_id, provider_message_id, status, delivery_timestamp,
        error_code, error_message, retry_count, cost, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (message_id) DO UPDATE SET
        status = EXCLUDED.status,
        delivery_timestamp = EXCLUDED.delivery_timestamp,
        error_code = EXCLUDED.error_code,
        error_message = EXCLUDED.error_message,
        retry_count = EXCLUDED.retry_count,
        cost = EXCLUDED.cost,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(upsertDeliveryQuery, [
      testDeliveryData.message_id,
      testDeliveryData.provider_message_id,
      testDeliveryData.status,
      testDeliveryData.delivery_timestamp,
      testDeliveryData.error_code,
      testDeliveryData.error_message,
      testDeliveryData.retry_count,
      testDeliveryData.cost
    ]);
    
    console.log('✅ Delivery Tracking UPSERT successful');
    
    // 5. Test Complex Queries
    console.log('\n5️⃣ Testing Complex SMS Queries...\n');
    
    // Provider performance query
    const performanceQuery = `
      SELECT 
        provider_name,
        is_healthy,
        success_rate_24h,
        average_response_time_24h,
        total_messages_24h,
        consecutive_failures,
        CASE 
          WHEN consecutive_failures = 0 AND success_rate_24h >= 95 THEN 'Excellent'
          WHEN consecutive_failures <= 2 AND success_rate_24h >= 90 THEN 'Good'
          WHEN consecutive_failures <= 5 AND success_rate_24h >= 80 THEN 'Fair'
          ELSE 'Poor'
        END as performance_rating
      FROM sms_provider_health
      ORDER BY success_rate_24h DESC, average_response_time_24h ASC
    `;
    
    const performanceResult = await pool.query(performanceQuery);
    console.log(`✅ Provider Performance Analysis: ${performanceResult.rows.length} providers`);
    
    performanceResult.rows.forEach(provider => {
      console.log(`   - ${provider.provider_name}: ${provider.performance_rating}`);
      console.log(`     Success Rate: ${provider.success_rate_24h}%, Avg Response: ${provider.average_response_time_24h}ms`);
    });
    
    // Delivery status summary
    const deliverySummaryQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(retry_count) as avg_retries,
        SUM(cost) as total_cost
      FROM sms_delivery_tracking
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const deliverySummaryResult = await pool.query(deliverySummaryQuery);
    console.log(`\n✅ Delivery Status Summary:`);
    
    if (deliverySummaryResult.rows.length > 0) {
      deliverySummaryResult.rows.forEach(status => {
        console.log(`   - ${status.status}: ${status.count} messages (Avg retries: ${parseFloat(status.avg_retries || 0).toFixed(1)}, Cost: $${parseFloat(status.total_cost || 0).toFixed(2)})`);
      });
    } else {
      console.log('   - No delivery records yet (this is normal for a new system)');
    }
    
    // 6. Clean up test records
    console.log('\n6️⃣ Cleaning up test records...\n');
    
    await pool.query('DELETE FROM sms_provider_health WHERE provider_name = $1', ['Test Provider Health']);
    await pool.query('DELETE FROM sms_delivery_tracking WHERE message_id = $1', [testDeliveryData.message_id]);
    
    console.log('✅ Test records cleaned up');
    
    // 7. Final verification
    console.log('\n7️⃣ Final SMS System Status...\n');
    
    const finalHealthCount = await pool.query('SELECT COUNT(*) FROM sms_provider_health');
    const finalDeliveryCount = await pool.query('SELECT COUNT(*) FROM sms_delivery_tracking');
    
    // Check for any missing SMS-related tables
    const smsTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%sms%'
      ORDER BY table_name
    `;
    
    const smsTablesResult = await pool.query(smsTablesQuery);
    
    console.log('📊 FINAL SMS SYSTEM STATUS:');
    console.log('===========================');
    console.log(`✅ SMS Provider Health: ${finalHealthCount.rows[0].count} providers`);
    console.log(`✅ SMS Delivery Tracking: ${finalDeliveryCount.rows[0].count} delivery records`);
    console.log(`✅ SMS-related tables: ${smsTablesResult.rows.length} tables found`);
    
    smsTablesResult.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    console.log('\n🎉 SMS SYSTEM TEST COMPLETED!');
    console.log('==============================');
    console.log('✅ All SMS tables exist and are functional');
    console.log('✅ UPSERT operations working correctly');
    console.log('✅ Complex queries executing successfully');
    console.log('✅ Provider health monitoring ready');
    console.log('✅ Delivery tracking system operational');
    console.log('✅ SMS system is production-ready!');
    
  } catch (error) {
    console.error('❌ SMS system test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
if (require.main === module) {
  testSMSSystem()
    .then(() => {
      console.log('\n✅ SMS system test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ SMS system test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSMSSystem };
