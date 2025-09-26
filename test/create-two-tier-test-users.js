const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTwoTierTestUsers() {
  let connection;
  
  try {
    console.log('🚀 Creating Two-Tier Approval Test Users...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Connected to database');
    
    // Get role IDs
    const [roles] = await connection.execute(`
      SELECT id, name FROM roles 
      WHERE name IN ('financial_reviewer', 'membership_approver', 'super_admin')
    `);
    
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });
    
    console.log('📋 Available roles:', Object.keys(roleMap));
    
    // Hash password for test users
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Test users to create
    const testUsers = [
      {
        name: 'Financial Reviewer',
        email: 'financial.reviewer@test.com',
        role_id: roleMap['financial_reviewer'],
        role_name: 'financial_reviewer',
        admin_level: 'national'
      },
      {
        name: 'Membership Approver',
        email: 'membership.approver@test.com',
        role_id: roleMap['membership_approver'],
        role_name: 'membership_approver',
        admin_level: 'national'
      },
      {
        name: 'Financial Reviewer 2',
        email: 'financial.reviewer2@test.com',
        role_id: roleMap['financial_reviewer'],
        role_name: 'financial_reviewer',
        admin_level: 'province'
      },
      {
        name: 'Membership Approver 2',
        email: 'membership.approver2@test.com',
        role_id: roleMap['membership_approver'],
        role_name: 'membership_approver',
        admin_level: 'province'
      }
    ];
    
    console.log('👥 Creating test users...');
    
    for (const user of testUsers) {
      try {
        // Check if user already exists
        const [existingUser] = await connection.execute(`
          SELECT id FROM users WHERE email = ?
        `, [user.email]);
        
        if (existingUser.length > 0) {
          console.log(`⚠️  User ${user.email} already exists, skipping...`);
          continue;
        }
        
        // Create user
        const [result] = await connection.execute(`
          INSERT INTO users (
            name, email, password, role_id, admin_level, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())
        `, [
          user.name,
          user.email,
          hashedPassword,
          user.role_id,
          user.admin_level
        ]);
        
        console.log(`✅ Created user: ${user.name} (${user.email}) - Role: ${user.role_name}`);
        
      } catch (error) {
        console.error(`❌ Failed to create user ${user.email}:`, error.message);
      }
    }
    
    // Verify created users
    console.log('\n🔍 Verifying created users...');
    const [createdUsers] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.admin_level,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email LIKE '%@test.com'
      ORDER BY r.name, u.name
    `);
    
    console.log('\n📋 Created Test Users:');
    createdUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
      console.log(`     Role: ${user.role_name} | Level: ${user.admin_level}`);
      console.log(`     Description: ${user.role_description}`);
      console.log('');
    });
    
    // Create some test applications in different workflow stages
    console.log('📝 Creating test applications for workflow testing...');
    
    const testApplications = [
      {
        stage: 'Submitted',
        first_name: 'John',
        last_name: 'Financial',
        id_number: '8001015800081',
        email: 'john.financial@test.com'
      },
      {
        stage: 'Financial Review',
        first_name: 'Jane',
        last_name: 'InReview',
        id_number: '9001015800082',
        email: 'jane.inreview@test.com'
      },
      {
        stage: 'Payment Approved',
        first_name: 'Bob',
        last_name: 'PaymentOK',
        id_number: '7501015800083',
        email: 'bob.paymentok@test.com'
      }
    ];
    
    for (const app of testApplications) {
      try {
        // Check if application already exists
        const [existingApp] = await connection.execute(`
          SELECT id FROM membership_applications WHERE email = ?
        `, [app.email]);
        
        if (existingApp.length > 0) {
          console.log(`⚠️  Application for ${app.email} already exists, skipping...`);
          continue;
        }
        
        // Create application
        const [result] = await connection.execute(`
          INSERT INTO membership_applications (
            application_number, first_name, last_name, id_number, date_of_birth,
            gender, email, cell_number, residential_address, ward_code,
            application_type, status, workflow_stage, financial_status,
            submitted_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'Male', ?, '0821234567', '123 Test Street', 'GT001',
                   'New', 'Submitted', ?, 'Pending', NOW(), NOW(), NOW())
        `, [
          `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          app.first_name,
          app.last_name,
          app.id_number,
          '1980-01-01',
          app.email,
          app.stage
        ]);
        
        console.log(`✅ Created test application: ${app.first_name} ${app.last_name} - Stage: ${app.stage}`);
        
      } catch (error) {
        console.error(`❌ Failed to create application for ${app.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Two-Tier Approval Test Users and Applications Created!');
    console.log('\n📋 Login Credentials:');
    console.log('Financial Reviewers:');
    console.log('  - financial.reviewer@test.com / password123');
    console.log('  - financial.reviewer2@test.com / password123');
    console.log('\nMembership Approvers:');
    console.log('  - membership.approver@test.com / password123');
    console.log('  - membership.approver2@test.com / password123');
    console.log('\n🔗 API Endpoints:');
    console.log('  - GET /api/v1/two-tier-approval/financial-review/applications');
    console.log('  - POST /api/v1/two-tier-approval/financial-review/{id}/start');
    console.log('  - POST /api/v1/two-tier-approval/financial-review/{id}/complete');
    console.log('  - GET /api/v1/two-tier-approval/final-review/applications');
    console.log('  - POST /api/v1/two-tier-approval/final-review/{id}/start');
    console.log('  - POST /api/v1/two-tier-approval/final-review/{id}/complete');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

createTwoTierTestUsers();
