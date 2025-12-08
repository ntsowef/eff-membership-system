/**
 * Check Payment Tables Status
 * 
 * This script checks if the payment_transactions table and related tables exist
 * Run this on the server to verify if migration is needed
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  ssl: false,
  connectionTimeoutMillis: 30000,
});

const REQUIRED_TABLES = [
  'payment_transactions',
  'cash_payment_verifications',
  'admin_notifications',
  'financial_monitoring_summary',
  'payment_gateway_configs',
  'application_workflow_status',
  'receipt_uploads',
  'financial_audit_trail'
];

async function checkPaymentTables() {
  const client = await pool.connect();
  
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Payment Tables Status Check');
    console.log('  Database: eff_membership_db @ localhost:5432');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Check which tables exist
    const checkQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = ANY($1)
      ORDER BY tablename;
    `;
    
    const result = await client.query(checkQuery, [REQUIRED_TABLES]);
    const existingTables = result.rows.map(row => row.tablename);
    const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table));
    
    console.log('📊 Payment System Tables Status:\n');
    
    // Show existing tables
    if (existingTables.length > 0) {
      console.log('✅ Existing tables:');
      existingTables.forEach(table => {
        console.log(`   ✓ ${table}`);
      });
      console.log('');
    }
    
    // Show missing tables
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:');
      missingTables.forEach(table => {
        console.log(`   ✗ ${table}`);
      });
      console.log('');
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Status: ${existingTables.length}/${REQUIRED_TABLES.length} tables exist`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (missingTables.length === 0) {
      console.log('🎉 All payment tables exist!');
      console.log('✅ No migration needed.\n');
      
      // Check payment_transactions structure
      const columnsQuery = `
        SELECT COUNT(*) as column_count
        FROM information_schema.columns
        WHERE table_name = 'payment_transactions';
      `;
      const columnsResult = await client.query(columnsQuery);
      console.log(`📋 payment_transactions has ${columnsResult.rows[0].column_count} columns`);
      
      // Check triggers
      const triggersQuery = `
        SELECT COUNT(*) as trigger_count
        FROM information_schema.triggers
        WHERE event_object_table = 'payment_transactions';
      `;
      const triggersResult = await client.query(triggersQuery);
      console.log(`🔧 payment_transactions has ${triggersResult.rows[0].trigger_count} triggers`);
      
      // Check indexes
      const indexesQuery = `
        SELECT COUNT(*) as index_count
        FROM pg_indexes
        WHERE tablename = 'payment_transactions';
      `;
      const indexesResult = await client.query(indexesQuery);
      console.log(`📑 payment_transactions has ${indexesResult.rows[0].index_count} indexes`);
      
      // Check record count
      const countQuery = 'SELECT COUNT(*) as record_count FROM payment_transactions';
      const countResult = await client.query(countQuery);
      console.log(`📊 payment_transactions has ${countResult.rows[0].record_count} records\n`);
      
    } else {
      console.log('⚠️  Migration required!');
      console.log(`❌ ${missingTables.length} table(s) missing\n`);
      console.log('To fix this, run:');
      console.log('   node create-payment-tables-direct.js\n');
      console.log('Or see: database-recovery/PAYMENT_TABLES_MIGRATION_GUIDE.md\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking tables:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Make sure:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. You are running this script on the server');
      console.error('   3. PostgreSQL is listening on localhost:5432');
    } else if (error.code === '28000') {
      console.error('\n💡 Authentication failed. Check database credentials.');
    } else {
      console.error('\nError details:', error);
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkPaymentTables().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

