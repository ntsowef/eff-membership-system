const mysql = require('mysql2/promise');

async function testDashboardServiceDirect() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Testing dashboard queries directly...\n');

    // Test the overview metrics query that's failing
    console.log('📋 **Testing Overview Metrics Query...**');
    
    const dateFilter = `AND DATE(uft.created_at) = CURDATE()`;
    
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(CASE WHEN financial_status IN ('Pending', 'Under Review') THEN 1 END) as pending_reviews,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() AND payment_status = 'Completed' THEN 1 END) as completed_today,
        -- Revenue growth (placeholder calculation)
        5.2 as revenue_growth_percentage,
        -- Average processing time (placeholder)
        18.5 as avg_processing_time_hours
      FROM unified_financial_transactions uft
      WHERE 1=1 ${dateFilter}
    `;

    console.log('Query:', overviewQuery);
    
    try {
      const [overview] = await connection.execute(overviewQuery);
      console.log('✅ Overview query successful!');
      console.log('Result:', JSON.stringify(overview[0], null, 2));
    } catch (error) {
      console.log('❌ Overview query failed:', error.message);
      console.log('SQL Error:', error.sql);
    }

    console.log('\n');

    // Test applications query
    console.log('📋 **Testing Applications Query...**');
    
    const applicationsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COALESCE(SUM(amount), 0) as applications_revenue,
        COUNT(CASE WHEN financial_status IN ('Pending', 'Under Review') THEN 1 END) as pending_financial_review,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() AND financial_status = 'Approved' THEN 1 END) as approved_today,
        -- Rejection rate calculation
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN financial_status = 'Rejected' THEN 1 END) * 100.0) / COUNT(*), 2)
          ELSE 0
        END as rejection_rate
      FROM unified_financial_transactions uft
      WHERE transaction_type = 'Application' ${dateFilter}
    `;

    try {
      const [applications] = await connection.execute(applicationsQuery);
      console.log('✅ Applications query successful!');
      console.log('Result:', JSON.stringify(applications[0], null, 2));
    } catch (error) {
      console.log('❌ Applications query failed:', error.message);
      console.log('SQL Error:', error.sql);
    }

    console.log('\n');

    // Test simple query without date filter
    console.log('📋 **Testing Simple Query (no date filter)...**');
    
    const simpleQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM unified_financial_transactions uft
    `;

    try {
      const [simple] = await connection.execute(simpleQuery);
      console.log('✅ Simple query successful!');
      console.log('Result:', JSON.stringify(simple[0], null, 2));
    } catch (error) {
      console.log('❌ Simple query failed:', error.message);
      console.log('SQL Error:', error.sql);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDashboardServiceDirect();
