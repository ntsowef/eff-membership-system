/**
 * Create Payment Tables - Direct Connection Script
 * 
 * This script creates the payment_transactions table and related tables
 * by connecting to localhost (assuming it's run on the server itself)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration - using localhost since this should run on the server
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  ssl: false,
  connectionTimeoutMillis: 30000,
});

async function createPaymentTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting payment tables creation...\n');
    console.log('📍 Database: localhost:5432/eff_membership_db\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database-recovery', 'create_payment_transactions_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
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
    
    if (result.rows.length === 8) {
      console.log('\n✅ All 8 payment system tables created successfully!');
    } else {
      console.log(`\n⚠️  Warning: Expected 8 tables, but found ${result.rows.length}`);
    }
    
    // Check payment_transactions table structure
    const checkColumns = await client.query(`
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
    console.log(`   Total columns: ${checkColumns.rows.length}`);
    checkColumns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name} (${col.data_type}) ${nullable}`);
    });
    
    // Check triggers
    const checkTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'payment_transactions'
      ORDER BY trigger_name;
    `);
    
    console.log('\n🔧 Triggers created:');
    if (checkTriggers.rows.length > 0) {
      checkTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation})`);
      });
    } else {
      console.log('   ⚠️  No triggers found');
    }
    
    // Check indexes
    const checkIndexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'payment_transactions'
      ORDER BY indexname;
    `);
    
    console.log('\n📑 Indexes created:');
    checkIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    // Test a simple query
    console.log('\n🧪 Testing payment_transactions table...');
    const testQuery = await client.query('SELECT COUNT(*) as count FROM payment_transactions');
    console.log(`   Current records: ${testQuery.rows[0].count}`);
    
    console.log('\n🎉 Payment tables creation completed successfully!');
    console.log('✅ The payment_transactions table is now available for use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test the payment endpoints');
    console.log('   3. Verify the application can now process payments');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Make sure:');
      console.error('   1. PostgreSQL is running');
      console.error('   2. You are running this script on the server (69.164.245.173)');
      console.error('   3. PostgreSQL is listening on localhost:5432');
    } else if (error.code === '28000') {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   1. Database credentials are correct');
      console.error('   2. pg_hba.conf allows local connections');
    } else if (error.code === '42P07') {
      console.error('\n💡 Table already exists. This is OK if you are re-running the migration.');
    } else {
      console.error('\nError details:', error);
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Payment Tables Creation Script');
console.log('  Database: eff_membership_db');
console.log('═══════════════════════════════════════════════════════════════\n');

createPaymentTables().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

