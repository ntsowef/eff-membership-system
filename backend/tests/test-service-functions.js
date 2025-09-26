// Import the actual service functions
const { executeQuery, executeQuerySingle } = require('../dist/config/database');

async function testServiceFunctions() {
  try {
    console.log('🔍 Testing service database functions...');

    // Test 1: Simple count using executeQuerySingle
    console.log('\n📋 **Step 1: Testing executeQuerySingle with count...**');
    try {
      const countResult = await executeQuerySingle(`
        SELECT COUNT(*) as total_count
        FROM unified_financial_transactions uft
      `);
      
      console.log('✅ executeQuerySingle successful:', countResult);
      console.log('   • Total count:', countResult?.total_count);
    } catch (error) {
      console.log('❌ executeQuerySingle failed:', error.message);
      console.log('   Stack:', error.stack);
    }

    // Test 2: Select using executeQuery
    console.log('\n📋 **Step 2: Testing executeQuery with select...**');
    try {
      const selectResult = await executeQuery(`
        SELECT 
          uft.*,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN 'Application'
            WHEN uft.transaction_type = 'Renewal' THEN 'Renewal'
            ELSE 'Unknown'
          END as entity_type_display
        FROM unified_financial_transactions uft
        ORDER BY uft.created_at DESC
        LIMIT 3 OFFSET 0
      `);
      
      console.log('✅ executeQuery successful, returned', selectResult?.length || 0, 'records');
      if (selectResult && selectResult.length > 0) {
        const first = selectResult[0];
        console.log('   • First record:', first.transaction_id, '-', first.amount, '-', first.payment_status);
      }
    } catch (error) {
      console.log('❌ executeQuery failed:', error.message);
      console.log('   Stack:', error.stack);
    }

    // Test 3: Test with parameters
    console.log('\n📋 **Step 3: Testing with parameters...**');
    try {
      const paramResult = await executeQuery(`
        SELECT COUNT(*) as count
        FROM unified_financial_transactions uft
        WHERE uft.transaction_type = ?
      `, ['Application']);
      
      console.log('✅ Parameterized query successful:', paramResult);
      if (paramResult && paramResult.length > 0) {
        console.log('   • Application count:', paramResult[0].count);
      }
    } catch (error) {
      console.log('❌ Parameterized query failed:', error.message);
      console.log('   Stack:', error.stack);
    }

    // Test 4: Test the exact query from the service
    console.log('\n📋 **Step 4: Testing exact service query...**');
    try {
      const filters = {
        sort_by: 'created_at',
        sort_order: 'DESC',
        limit: 25,
        offset: 0
      };

      // Build the exact query that the service would build
      const whereConditions = [];
      const queryParams = [];

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'DESC';
      const orderClause = `ORDER BY uft.${sortBy} ${sortOrder}`;

      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;
      const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM unified_financial_transactions uft
        ${whereClause}
      `;
      
      console.log('   • Running count query:', countQuery);
      const countResult = await executeQuerySingle(countQuery, queryParams);
      console.log('   • Count result:', countResult);

      // Transactions query
      const transactionsQuery = `
        SELECT 
          uft.*,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN 'Application'
            WHEN uft.transaction_type = 'Renewal' THEN 'Renewal'
            ELSE 'Unknown'
          END as entity_type_display,
          CASE 
            WHEN uft.financial_status = 'Approved' AND uft.payment_status = 'Completed' THEN 'Complete'
            WHEN uft.financial_status = 'Rejected' OR uft.payment_status = 'Failed' THEN 'Failed'
            WHEN uft.financial_status IN ('Pending', 'Under Review') THEN 'In Review'
            ELSE 'Processing'
          END as overall_status,
          DATEDIFF(NOW(), uft.created_at) as days_since_created
        FROM unified_financial_transactions uft
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;

      console.log('   • Running transactions query...');
      const transactions = await executeQuery(transactionsQuery, queryParams);
      console.log('   • Transactions result:', transactions?.length || 0, 'records');

      // Summary query
      const summaryQuery = `
        SELECT
          COUNT(*) as filtered_count,
          COALESCE(SUM(uft.amount), 0) as total_amount,
          COALESCE(AVG(uft.amount), 0) as avg_amount,
          COALESCE(SUM(CASE WHEN uft.payment_status = 'Completed' THEN uft.amount ELSE 0 END), 0) as completed_amount,
          COALESCE(SUM(CASE WHEN uft.payment_status != 'Completed' THEN uft.amount ELSE 0 END), 0) as pending_amount,
          COUNT(CASE WHEN uft.financial_status = 'Pending' THEN 1 END) as status_pending,
          COUNT(CASE WHEN uft.financial_status = 'Under Review' THEN 1 END) as status_under_review,
          COUNT(CASE WHEN uft.financial_status = 'Approved' THEN 1 END) as status_approved,
          COUNT(CASE WHEN uft.financial_status = 'Rejected' THEN 1 END) as status_rejected
        FROM unified_financial_transactions uft
        ${whereClause}
      `;

      console.log('   • Running summary query...');
      const summaryResult = await executeQuerySingle(summaryQuery, queryParams);
      console.log('   • Summary result:', summaryResult);

      console.log('✅ All service queries successful!');

    } catch (error) {
      console.log('❌ Service query failed:', error.message);
      console.log('   Stack:', error.stack);
    }

    console.log('\n✅ Service function testing completed!');

  } catch (error) {
    console.error('❌ Error testing service functions:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testServiceFunctions();
