const mysql = require('mysql2/promise');

async function testDashboardServiceMethods() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Testing individual dashboard service methods...\n');

    // Test 1: Simple metrics query
    console.log('📋 **Test 1: Simple Overview Metrics**');
    try {
      const overviewQuery = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(CASE WHEN financial_status IN ('Pending', 'Under Review') THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() AND payment_status = 'Completed' THEN 1 END) as completed_today,
          5.2 as revenue_growth_percentage,
          18.5 as avg_processing_time_hours
        FROM unified_financial_transactions uft
        WHERE 1=1 AND DATE(uft.created_at) = CURDATE()
      `;
      
      const [overview] = await connection.execute(overviewQuery);
      console.log('✅ Overview query successful');
      console.log('Result:', JSON.stringify(overview[0], null, 2));
    } catch (error) {
      console.log('❌ Overview query failed:', error.message);
    }

    console.log('\n📋 **Test 2: Applications Metrics**');
    try {
      const applicationsQuery = `
        SELECT 
          COUNT(*) as total_applications,
          COALESCE(SUM(amount), 0) as applications_revenue,
          COUNT(CASE WHEN financial_status IN ('Pending', 'Under Review') THEN 1 END) as pending_financial_review,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() AND financial_status = 'Approved' THEN 1 END) as approved_today,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(CASE WHEN financial_status = 'Rejected' THEN 1 END) * 100.0) / COUNT(*), 2)
            ELSE 0
          END as rejection_rate
        FROM unified_financial_transactions uft
        WHERE transaction_type = 'Application' AND DATE(uft.created_at) = CURDATE()
      `;
      
      const [applications] = await connection.execute(applicationsQuery);
      console.log('✅ Applications query successful');
      console.log('Result:', JSON.stringify(applications[0], null, 2));
    } catch (error) {
      console.log('❌ Applications query failed:', error.message);
    }

    console.log('\n📋 **Test 3: Performance Query (Users table)**');
    try {
      const performanceQuery = `
        SELECT 
          COUNT(DISTINCT u.id) as active_reviewers,
          AVG(24.0) as avg_review_time,
          COUNT(CASE WHEN DATE(COALESCE(ma.financial_reviewed_at, mr.financial_reviewed_at)) = CURDATE() THEN 1 END) as reviews_completed_today,
          85.5 as efficiency_score
        FROM users u
        LEFT JOIN membership_applications ma ON u.id = ma.financial_reviewed_by
        LEFT JOIN membership_renewals mr ON u.id = mr.financial_reviewed_by
        WHERE u.role_id = (SELECT id FROM roles WHERE name = 'financial_reviewer')
          AND u.is_active = 1
      `;
      
      const [performance] = await connection.execute(performanceQuery);
      console.log('✅ Performance query successful');
      console.log('Result:', JSON.stringify(performance[0], null, 2));
    } catch (error) {
      console.log('❌ Performance query failed:', error.message);
    }

    console.log('\n📋 **Test 4: Trends Query**');
    try {
      const trendsQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m-%d') as period,
          COUNT(CASE WHEN transaction_type = 'Application' THEN 1 END) as applications_count,
          COUNT(CASE WHEN transaction_type = 'Renewal' THEN 1 END) as renewals_count,
          COALESCE(SUM(CASE WHEN payment_status = 'Completed' THEN amount END), 0) as total_revenue,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(CASE WHEN financial_status = 'Approved' THEN 1 END) * 100.0) / COUNT(*), 2)
            ELSE 0
          END as approval_rate,
          AVG(24.0) as processing_time
        FROM unified_financial_transactions uft
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY period DESC
        LIMIT 30
      `;
      
      const [trends] = await connection.execute(trendsQuery);
      console.log('✅ Trends query successful');
      console.log('Result count:', trends.length);
      if (trends.length > 0) {
        console.log('Sample result:', JSON.stringify(trends[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Trends query failed:', error.message);
    }

    console.log('\n📋 **Test 5: Check if roles table has financial_reviewer**');
    try {
      const [roles] = await connection.execute(`
        SELECT id, name FROM roles WHERE name = 'financial_reviewer'
      `);
      
      if (roles.length > 0) {
        console.log('✅ financial_reviewer role found:', roles[0]);
      } else {
        console.log('❌ financial_reviewer role not found');
      }
    } catch (error) {
      console.log('❌ Roles query failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDashboardServiceMethods();
