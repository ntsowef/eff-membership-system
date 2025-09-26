const mysql = require('mysql2/promise');

async function testDirectQuery() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Testing direct SQL queries...');

    // Test 1: Simple count query
    console.log('\n📋 **Step 1: Testing simple count query...**');
    try {
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total_count
        FROM unified_financial_transactions uft
      `);
      
      console.log('✅ Count query successful:', countResult[0].total_count);
    } catch (error) {
      console.log('❌ Count query failed:', error.message);
    }

    // Test 2: Simple select query
    console.log('\n📋 **Step 2: Testing simple select query...**');
    try {
      const [selectResult] = await connection.query(`
        SELECT 
          uft.*,
          CASE 
            WHEN uft.transaction_type = 'Application' THEN 'Application'
            WHEN uft.transaction_type = 'Renewal' THEN 'Renewal'
            ELSE 'Unknown'
          END as entity_type_display
        FROM unified_financial_transactions uft
        ORDER BY uft.created_at DESC
        LIMIT 5 OFFSET 0
      `);
      
      console.log('✅ Select query successful, returned', selectResult.length, 'records');
      if (selectResult.length > 0) {
        const first = selectResult[0];
        console.log('   • First record:', first.transaction_id, '-', first.amount, '-', first.payment_status);
      }
    } catch (error) {
      console.log('❌ Select query failed:', error.message);
      console.log('   Error details:', error.sqlMessage);
    }

    // Test 3: Summary query
    console.log('\n📋 **Step 3: Testing summary query...**');
    try {
      const [summaryResult] = await connection.query(`
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
      `);
      
      console.log('✅ Summary query successful');
      const summary = summaryResult[0];
      console.log('   • Total records:', summary.filtered_count);
      console.log('   • Total amount:', summary.total_amount);
      console.log('   • Average amount:', summary.avg_amount);
      console.log('   • Completed amount:', summary.completed_amount);
      console.log('   • Status breakdown:');
      console.log('     - Pending:', summary.status_pending);
      console.log('     - Under Review:', summary.status_under_review);
      console.log('     - Approved:', summary.status_approved);
      console.log('     - Rejected:', summary.status_rejected);
    } catch (error) {
      console.log('❌ Summary query failed:', error.message);
      console.log('   Error details:', error.sqlMessage);
    }

    // Test 4: Test with entity_type filter
    console.log('\n📋 **Step 4: Testing with entity_type filter...**');
    try {
      const [filteredResult] = await connection.query(`
        SELECT COUNT(*) as count
        FROM unified_financial_transactions uft
        WHERE uft.transaction_type = ?
      `, ['Application']);
      
      console.log('✅ Filtered query successful, found', filteredResult[0].count, 'application records');
    } catch (error) {
      console.log('❌ Filtered query failed:', error.message);
    }

    // Test 5: Check for any problematic data
    console.log('\n📋 **Step 5: Checking for problematic data...**');
    try {
      const [problemData] = await connection.query(`
        SELECT 
          transaction_id,
          transaction_type,
          amount,
          payment_status,
          financial_status,
          created_at
        FROM unified_financial_transactions uft
        WHERE uft.amount IS NULL 
           OR uft.created_at IS NULL 
           OR uft.transaction_type IS NULL
        LIMIT 5
      `);
      
      if (problemData.length > 0) {
        console.log('⚠️  Found', problemData.length, 'records with NULL values:');
        problemData.forEach(record => {
          console.log('   •', record.transaction_id, '- Amount:', record.amount, '- Type:', record.transaction_type, '- Created:', record.created_at);
        });
      } else {
        console.log('✅ No problematic NULL data found');
      }
    } catch (error) {
      console.log('❌ Problem data check failed:', error.message);
    }

    console.log('\n✅ Direct query testing completed!');

  } catch (error) {
    console.error('❌ Error testing direct queries:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testDirectQuery();
