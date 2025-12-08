/**
 * Test script to verify the unified financial transactions view is working
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function testView() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing unified_financial_transactions view...\n');
    
    // Test 1: Check if view exists
    console.log('Test 1: Checking if view exists...');
    const viewExistsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'unified_financial_transactions'
    `;
    const viewExists = await client.query(viewExistsQuery);
    console.log(viewExists.rows.length > 0 ? '✅ View exists' : '❌ View does not exist');
    console.log('');
    
    // Test 2: Get total count
    console.log('Test 2: Getting total transaction count...');
    const countQuery = 'SELECT COUNT(*) as total_count FROM unified_financial_transactions';
    const countResult = await client.query(countQuery);
    console.log(`✅ Total transactions: ${countResult.rows[0].total_count}`);
    console.log('');
    
    // Test 3: Get sample transactions
    console.log('Test 3: Getting sample transactions...');
    const sampleQuery = `
      SELECT 
        transaction_id,
        transaction_type,
        first_name,
        last_name,
        amount,
        payment_status,
        financial_status,
        created_at
      FROM unified_financial_transactions
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const sampleResult = await client.query(sampleQuery);
    if (sampleResult.rows.length > 0) {
      console.log(`✅ Found ${sampleResult.rows.length} sample transactions:`);
      sampleResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.transaction_id} - ${row.first_name} ${row.last_name} - R${row.amount} - ${row.payment_status}`);
      });
    } else {
      console.log('ℹ️  No transactions found (this is normal if database is empty)');
    }
    console.log('');
    
    // Test 4: Test the summary view
    console.log('Test 4: Testing financial_transactions_summary view...');
    const summaryQuery = 'SELECT * FROM financial_transactions_summary LIMIT 5';
    const summaryResult = await client.query(summaryQuery);
    console.log(`✅ Summary view accessible. Found ${summaryResult.rows.length} summary records`);
    console.log('');
    
    // Test 5: Test the pending reviews view
    console.log('Test 5: Testing pending_financial_reviews view...');
    const pendingQuery = 'SELECT COUNT(*) as pending_count FROM pending_financial_reviews';
    const pendingResult = await client.query(pendingQuery);
    console.log(`✅ Pending reviews view accessible. Pending reviews: ${pendingResult.rows[0].pending_count}`);
    console.log('');
    
    // Test 6: Test the audit trail view
    console.log('Test 6: Testing financial_audit_trail_view...');
    const auditQuery = 'SELECT COUNT(*) as audit_count FROM financial_audit_trail_view';
    const auditResult = await client.query(auditQuery);
    console.log(`✅ Audit trail view accessible. Audit records: ${auditResult.rows[0].audit_count}`);
    console.log('');
    
    console.log('🎉 All tests passed! The unified financial transactions view is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the tests
testView().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

