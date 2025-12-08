/**
 * Run Payment Tables Migration Script
 * 
 * This script creates the payment_transactions table and all related payment system tables
 * in the PostgreSQL database running on Docker at 69.164.245.173
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration for remote Docker PostgreSQL
const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  ssl: false,
  connectionTimeoutMillis: 30000,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting payment tables migration...\n');
    console.log('📍 Database: 69.164.245.173:5432/eff_membership_db\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database-recovery', 'create_payment_transactions_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🗄️  Executing migration...\n');
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying created tables...\n');
    
    const verifyQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN (
          'payment_transactions',
          'cash_payment_verifications',
          'admin_notifications',
          'financial_monitoring_summary',
          'payment_gateway_configs',
          'application_workflow_status',
          'receipt_uploads',
          'financial_audit_trail'
        )
      ORDER BY tablename;
    `;
    
    const result = await client.query(verifyQuery);
    
    console.log('📊 Created tables:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tablename}`);
    });
    
    console.log('\n✅ All payment system tables created successfully!');
    
    // Check for payment_transactions specifically
    const checkPaymentTransactions = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'payment_transactions'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 payment_transactions table structure:');
    console.log('   Columns:', checkPaymentTransactions.rows.length);
    checkPaymentTransactions.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check triggers
    const checkTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'payment_transactions';
    `);
    
    console.log('\n🔧 Triggers created:');
    if (checkTriggers.rows.length > 0) {
      checkTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation})`);
      });
    } else {
      console.log('   No triggers found');
    }
    
    // Check indexes
    const checkIndexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'payment_transactions';
    `);
    
    console.log('\n📑 Indexes created:');
    checkIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    console.log('\n🎉 Payment tables migration completed successfully!');
    console.log('✅ The payment_transactions table is now available for use.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

