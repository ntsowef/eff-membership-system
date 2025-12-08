/**
 * Test script to verify the financial dashboard tables are working
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

async function testTables() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing financial dashboard tables...\n');
    
    // Test 1: Check if all tables exist
    console.log('Test 1: Checking if all tables exist...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'daily_financial_summary',
        'monthly_financial_summary',
        'financial_reviewer_performance',
        'payment_method_summary',
        'financial_kpi_tracking'
      )
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    console.log(`✅ Found ${tablesResult.rows.length}/5 tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');
    
    // Test 2: Check financial_kpi_tracking
    console.log('Test 2: Checking financial_kpi_tracking table...');
    const kpiQuery = `
      SELECT kpi_name, kpi_category, current_value, target_value, performance_status
      FROM financial_kpi_tracking
      WHERE measurement_date = CURRENT_DATE
      ORDER BY kpi_category, kpi_name
      LIMIT 5
    `;
    const kpiResult = await client.query(kpiQuery);
    console.log(`✅ Found ${kpiResult.rows.length} KPI records for today:`);
    kpiResult.rows.forEach(row => {
      console.log(`   - ${row.kpi_name} (${row.kpi_category}): ${row.current_value}/${row.target_value}`);
    });
    console.log('');
    
    // Test 3: Test the system alerts query (the one that was failing)
    console.log('Test 3: Testing system alerts query...');
    const alertsQuery = `
      SELECT kpi_name, current_value, target_value, performance_status
      FROM financial_kpi_tracking
      WHERE measurement_date = CURRENT_DATE
        AND performance_status IN ('needs_improvement', 'critical')
    `;
    const alertsResult = await client.query(alertsQuery);
    console.log(`✅ System alerts query successful. Found ${alertsResult.rows.length} alerts`);
    if (alertsResult.rows.length > 0) {
      alertsResult.rows.forEach(row => {
        console.log(`   - ${row.kpi_name}: ${row.performance_status}`);
      });
    } else {
      console.log('   (No alerts - all KPIs are performing well)');
    }
    console.log('');
    
    // Test 4: Check daily_financial_summary
    console.log('Test 4: Checking daily_financial_summary table...');
    const dailyQuery = 'SELECT COUNT(*) as count FROM daily_financial_summary';
    const dailyResult = await client.query(dailyQuery);
    console.log(`✅ Daily summary table accessible. Records: ${dailyResult.rows[0].count}`);
    console.log('');
    
    // Test 5: Check monthly_financial_summary
    console.log('Test 5: Checking monthly_financial_summary table...');
    const monthlyQuery = 'SELECT COUNT(*) as count FROM monthly_financial_summary';
    const monthlyResult = await client.query(monthlyQuery);
    console.log(`✅ Monthly summary table accessible. Records: ${monthlyResult.rows[0].count}`);
    console.log('');
    
    // Test 6: Check financial_reviewer_performance
    console.log('Test 6: Checking financial_reviewer_performance table...');
    const reviewerQuery = 'SELECT COUNT(*) as count FROM financial_reviewer_performance';
    const reviewerResult = await client.query(reviewerQuery);
    console.log(`✅ Reviewer performance table accessible. Records: ${reviewerResult.rows[0].count}`);
    console.log('');
    
    // Test 7: Check payment_method_summary
    console.log('Test 7: Checking payment_method_summary table...');
    const paymentQuery = 'SELECT COUNT(*) as count FROM payment_method_summary';
    const paymentResult = await client.query(paymentQuery);
    console.log(`✅ Payment method summary table accessible. Records: ${paymentResult.rows[0].count}`);
    console.log('');
    
    console.log('🎉 All tests passed! The financial dashboard tables are working correctly.');
    
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
testTables().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

