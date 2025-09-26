const mysql = require('mysql2/promise');

async function checkApplications() {
  console.log('📋 **CHECKING AVAILABLE APPLICATIONS**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Get all applications
    const [apps] = await connection.execute(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        status, 
        workflow_stage,
        financial_status,
        created_at
      FROM membership_applications 
      ORDER BY id DESC 
      LIMIT 10
    `);

    if (apps.length === 0) {
      console.log('⚠️  No applications found in database');
      console.log('\n🔨 **Creating a simple test application...**');
      
      // Create a simple test application
      const [result] = await connection.execute(`
        INSERT INTO membership_applications (
          first_name, last_name, email, id_number, date_of_birth, gender,
          phone, address, ward_code, status, workflow_stage, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        'Test', 'User', 'test.user@example.com', '8001015009087', '1980-01-01', 'Male',
        '+27123456789', '123 Test Street', '24401001', 'Submitted', 'Submitted'
      ]);

      console.log(`✅ Created test application with ID: ${result.insertId}`);
      
      // Get the created application
      const [newApp] = await connection.execute(
        'SELECT id, first_name, last_name, email, status, workflow_stage FROM membership_applications WHERE id = ?',
        [result.insertId]
      );
      
      apps.push(newApp[0]);
    }

    console.log(`✅ Found ${apps.length} applications in database\n`);
    
    console.log('📋 **Available Applications:**');
    apps.forEach((app, index) => {
      console.log(`\n   ${index + 1}. **${app.first_name} ${app.last_name}**`);
      console.log(`      ID: ${app.id}`);
      console.log(`      Email: ${app.email}`);
      console.log(`      Status: ${app.status}`);
      console.log(`      Workflow: ${app.workflow_stage || 'Submitted'}`);
      console.log(`      Financial Status: ${app.financial_status || 'Pending'}`);
      console.log(`      Frontend URL: http://localhost:3001/admin/applications/${app.id}`);
    });

    console.log('\n🎯 **TESTING INSTRUCTIONS:**');
    console.log('\n1. **Open Frontend**: http://localhost:3001');
    console.log('\n2. **Login as Financial Reviewer**:');
    console.log('   Email: financial.reviewer@test.com');
    console.log('   Password: password123');
    
    console.log('\n3. **Navigate to Application Detail Page**:');
    if (apps.length > 0) {
      console.log(`   URL: http://localhost:3001/admin/applications/${apps[0].id}`);
    }
    
    console.log('\n4. **Verify Financial Reviewer Interface**:');
    console.log('   ✅ Should see only 2 tabs: Payment Information + Financial Review');
    console.log('   ✅ Should NOT see: Personal Information, Contact & Location, Review & History');
    console.log('   ✅ Should be able to start financial review workflow');
    
    console.log('\n5. **Login as Membership Approver**:');
    console.log('   Email: membership.approver@test.com');
    console.log('   Password: password123');
    
    console.log('\n6. **Verify Membership Approver Interface**:');
    console.log('   ✅ Should see all 5 tabs: Personal Info, Contact, Payment, Final Review, History');
    console.log('   ✅ Should be able to review complete application details');
    console.log('   ✅ Should be able to start final review workflow');

    console.log('\n🚀 **SYSTEM STATUS: READY FOR ROLE-BASED TESTING!**');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the function
checkApplications();
