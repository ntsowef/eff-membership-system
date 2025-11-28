/**
 * Verify SMS Webhook Tables
 * Checks if the required SMS tables exist in the database
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Verify SMS Webhook Tables                                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function verifyTables() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check sms_webhook_log table
    console.log('1️⃣  Checking sms_webhook_log table...');
    const webhookLogCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sms_webhook_log'
      );
    `);

    if (webhookLogCheck.rows[0].exists) {
      console.log('   ✅ sms_webhook_log table exists');
      
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sms_webhook_log'
        ORDER BY ordinal_position;
      `);
      
      console.log('   Columns:');
      columns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
      
      // Get record count
      const count = await client.query('SELECT COUNT(*) FROM sms_webhook_log');
      console.log(`   Records: ${count.rows[0].count}`);
    } else {
      console.log('   ❌ sms_webhook_log table does NOT exist');
    }
    console.log('');

    // Check sms_delivery_tracking table
    console.log('2️⃣  Checking sms_delivery_tracking table...');
    const deliveryTrackingCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sms_delivery_tracking'
      );
    `);

    if (deliveryTrackingCheck.rows[0].exists) {
      console.log('   ✅ sms_delivery_tracking table exists');
      
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sms_delivery_tracking'
        ORDER BY ordinal_position;
      `);
      
      console.log('   Columns:');
      columns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
      
      // Get record count
      const count = await client.query('SELECT COUNT(*) FROM sms_delivery_tracking');
      console.log(`   Records: ${count.rows[0].count}`);
    } else {
      console.log('   ❌ sms_delivery_tracking table does NOT exist');
    }
    console.log('');

    client.release();

    // Summary
    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    
    if (webhookLogCheck.rows[0].exists && deliveryTrackingCheck.rows[0].exists) {
      console.log('✅ All required SMS tables exist!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Start backend server: cd backend && npm run dev');
      console.log('   2. Send SMS and track: node test/sms/send-and-track-sms.js');
      console.log('   3. Check delivery reports in database');
    } else {
      console.log('❌ Some tables are missing!');
      console.log('');
      console.log('📋 To create tables:');
      console.log('   node scripts/execute-sql-file.js database-recovery/create-sms-webhook-tables.sql');
    }
    console.log('');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTables();

