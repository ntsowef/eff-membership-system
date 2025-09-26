const mysql = require('mysql2/promise');
const axios = require('axios');

async function testTwoTierApprovalSystem() {
  let connection;
  
  try {
    console.log('🚀 Testing Two-Tier Approval System...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Connected to database');
    
    // Test 1: Verify roles and permissions exist
    console.log('\n📋 Test 1: Verifying roles and permissions...');
    
    const [roles] = await connection.execute(`
      SELECT r.name, r.description, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.name IN ('financial_reviewer', 'membership_approver')
      GROUP BY r.id, r.name, r.description
    `);
    
    console.log('Roles found:');
    roles.forEach(role => {
      console.log(`  - ${role.name}: ${role.description} (${role.permission_count} permissions)`);
    });
    
    // Test 2: Verify test users exist
    console.log('\n👥 Test 2: Verifying test users...');
    
    const [users] = await connection.execute(`
      SELECT u.name, u.email, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email LIKE '%@test.com'
      ORDER BY r.name, u.name
    `);
    
    console.log('Test users found:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role_name}`);
    });
    
    // Test 3: Verify database schema changes
    console.log('\n🗄️ Test 3: Verifying database schema...');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'membership_new'
      AND TABLE_NAME = 'membership_applications'
      AND COLUMN_NAME IN (
        'financial_status', 'financial_reviewed_at', 'financial_reviewed_by',
        'financial_rejection_reason', 'financial_admin_notes',
        'final_reviewed_at', 'final_reviewed_by', 'workflow_stage'
      )
      ORDER BY COLUMN_NAME
    `);
    
    console.log('New columns in membership_applications:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Test 4: Verify audit trail table
    console.log('\n📊 Test 4: Verifying audit trail table...');
    
    const [auditTable] = await connection.execute(`
      SELECT COUNT(*) as table_exists
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'membership_new'
      AND TABLE_NAME = 'approval_audit_trail'
    `);
    
    if (auditTable[0].table_exists > 0) {
      console.log('✅ Audit trail table exists');
      
      const [auditColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'membership_new'
        AND TABLE_NAME = 'approval_audit_trail'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('Audit trail columns:');
      auditColumns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
      });
    } else {
      console.log('❌ Audit trail table not found');
    }
    
    // Test 5: Verify workflow notifications table
    console.log('\n📬 Test 5: Verifying workflow notifications table...');
    
    const [notificationTable] = await connection.execute(`
      SELECT COUNT(*) as table_exists
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'membership_new'
      AND TABLE_NAME = 'workflow_notifications'
    `);
    
    if (notificationTable[0].table_exists > 0) {
      console.log('✅ Workflow notifications table exists');
    } else {
      console.log('❌ Workflow notifications table not found');
    }
    
    // Test 6: Check for test applications
    console.log('\n📝 Test 6: Checking test applications...');
    
    const [applications] = await connection.execute(`
      SELECT id, application_number, first_name, last_name, status, workflow_stage, financial_status
      FROM membership_applications
      WHERE email LIKE '%@test.com' OR application_number LIKE 'TEST-%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('Test applications found:');
    applications.forEach(app => {
      console.log(`  - ${app.application_number}: ${app.first_name} ${app.last_name}`);
      console.log(`    Status: ${app.status} | Workflow: ${app.workflow_stage} | Financial: ${app.financial_status || 'Pending'}`);
    });
    
    // Test 7: Test API endpoints (if backend is running)
    console.log('\n🌐 Test 7: Testing API endpoints...');
    
    try {
      // Test login with financial reviewer
      const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'financial.reviewer@test.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Financial reviewer login successful');
        const token = loginResponse.data.data.token;
        
        // Test financial review applications endpoint
        try {
          const appsResponse = await axios.get('http://localhost:5000/api/v1/two-tier-approval/financial-review/applications', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log(`✅ Financial review applications endpoint working (${appsResponse.data.data.applications.length} applications)`);
        } catch (error) {
          console.log('❌ Financial review applications endpoint failed:', error.response?.data?.message || error.message);
        }
        
        // Test workflow statistics endpoint
        try {
          const statsResponse = await axios.get('http://localhost:5000/api/v1/two-tier-approval/statistics', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('✅ Workflow statistics endpoint working');
          console.log('Statistics:', JSON.stringify(statsResponse.data.data.statistics, null, 2));
        } catch (error) {
          console.log('❌ Workflow statistics endpoint failed:', error.response?.data?.message || error.message);
        }
        
      } else {
        console.log('❌ Financial reviewer login failed');
      }
      
    } catch (error) {
      console.log('⚠️ API tests skipped - backend may not be running');
      console.log('Error:', error.message);
    }
    
    console.log('\n🎉 Two-Tier Approval System Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Roles created: ${roles.length}`);
    console.log(`✅ Test users created: ${users.length}`);
    console.log(`✅ Database columns added: ${columns.length}`);
    console.log(`✅ Test applications: ${applications.length}`);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start the backend server: cd backend && npm run dev');
    console.log('2. Start the frontend server: cd frontend && npm run dev');
    console.log('3. Login with test credentials:');
    console.log('   - Financial Reviewer: financial.reviewer@test.com / password123');
    console.log('   - Membership Approver: membership.approver@test.com / password123');
    console.log('4. Test the two-tier approval workflow');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testTwoTierApprovalSystem();
