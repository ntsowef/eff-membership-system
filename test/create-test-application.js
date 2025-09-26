const mysql = require('mysql2/promise');

async function createTestApplication() {
  console.log('📝 **CREATING TEST APPLICATION FOR ROLE-BASED TESTING**\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Check if we already have test applications
    const [existingApps] = await connection.execute(
      'SELECT COUNT(*) as count FROM membership_applications WHERE email LIKE "%test-role%"'
    );

    if (existingApps[0].count > 0) {
      console.log(`✅ Found ${existingApps[0].count} existing test applications`);
      
      // Get the existing applications
      const [apps] = await connection.execute(
        'SELECT id, first_name, last_name, email, status, workflow_stage FROM membership_applications WHERE email LIKE "%test-role%" ORDER BY id DESC LIMIT 3'
      );
      
      console.log('\n📋 **Existing Test Applications:**');
      apps.forEach(app => {
        console.log(`   ID: ${app.id} | ${app.first_name} ${app.last_name} | ${app.email}`);
        console.log(`   Status: ${app.status} | Workflow: ${app.workflow_stage || 'Submitted'}`);
        console.log(`   URL: http://localhost:3001/admin/applications/${app.id}`);
        console.log('');
      });
      
      await connection.end();
      return;
    }

    // Create test applications for role-based testing
    console.log('🔨 **Creating new test applications...**');

    // Get a valid ward code
    const [wards] = await connection.execute(
      'SELECT ward_code FROM wards LIMIT 1'
    );
    
    const wardCode = wards[0]?.ward_code || '24401001';

    // Create 3 test applications in different stages
    const testApplications = [
      {
        first_name: 'John',
        last_name: 'Financial-Test',
        email: 'john.test-role@example.com',
        id_number: '8001015009087',
        date_of_birth: '1980-01-01',
        gender: 'Male',
        phone: '+27123456789',
        address: '123 Test Street, Johannesburg',
        ward_code: wardCode,
        language_id: 1,
        occupation_id: 1,
        qualification_id: 1,
        signature_type: 'typed',
        signature_data: 'John Financial-Test',
        declaration_accepted: true,
        constitution_accepted: true,
        payment_method: 'Cash',
        payment_reference: 'CASH-001',
        payment_date: '2024-01-15',
        payment_amount: 50.00,
        status: 'Submitted',
        workflow_stage: 'Submitted',
        financial_status: null,
        financial_reviewed_at: null,
        financial_reviewed_by: null,
        final_reviewed_at: null,
        final_reviewed_by: null
      },
      {
        first_name: 'Sarah',
        last_name: 'Approval-Test',
        email: 'sarah.test-role@example.com',
        id_number: '8505125009088',
        date_of_birth: '1985-05-12',
        gender: 'Female',
        phone: '+27123456790',
        address: '456 Test Avenue, Cape Town',
        ward_code: wardCode,
        language_id: 2,
        occupation_id: 2,
        qualification_id: 2,
        signature_type: 'drawn',
        signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        declaration_accepted: true,
        constitution_accepted: true,
        payment_method: 'Card',
        payment_reference: 'CARD-002',
        payment_date: '2024-01-16',
        payment_amount: 50.00,
        status: 'Payment Approved',
        workflow_stage: 'Payment Approved',
        financial_status: 'Approved',
        financial_reviewed_at: new Date(),
        financial_reviewed_by: 1,
        final_reviewed_at: null,
        final_reviewed_by: null
      },
      {
        first_name: 'Michael',
        last_name: 'Complete-Test',
        email: 'michael.test-role@example.com',
        id_number: '9002285009089',
        date_of_birth: '1990-02-28',
        gender: 'Male',
        phone: '+27123456791',
        address: '789 Test Road, Durban',
        ward_code: wardCode,
        language_id: 3,
        occupation_id: 3,
        qualification_id: 3,
        signature_type: 'typed',
        signature_data: 'Michael Complete-Test',
        declaration_accepted: true,
        constitution_accepted: true,
        payment_method: 'EFT',
        payment_reference: 'EFT-003',
        payment_date: '2024-01-17',
        payment_amount: 50.00,
        status: 'Approved',
        workflow_stage: 'Approved',
        financial_status: 'Approved',
        financial_reviewed_at: new Date(Date.now() - 86400000), // 1 day ago
        financial_reviewed_by: 1,
        final_reviewed_at: new Date(),
        final_reviewed_by: 2
      }
    ];

    // Insert the test applications
    for (let i = 0; i < testApplications.length; i++) {
      const app = testApplications[i];
      
      const [result] = await connection.execute(`
        INSERT INTO membership_applications (
          first_name, last_name, email, id_number, date_of_birth, gender,
          phone, address, ward_code, language_id, occupation_id, qualification_id,
          signature_type, signature_data, declaration_accepted, constitution_accepted,
          payment_method, payment_reference, payment_date, payment_amount,
          status, workflow_stage, financial_status, financial_reviewed_at, financial_reviewed_by,
          final_reviewed_at, final_reviewed_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        app.first_name, app.last_name, app.email, app.id_number, app.date_of_birth, app.gender,
        app.phone, app.address, app.ward_code, app.language_id, app.occupation_id, app.qualification_id,
        app.signature_type, app.signature_data, app.declaration_accepted, app.constitution_accepted,
        app.payment_method, app.payment_reference, app.payment_date, app.payment_amount,
        app.status, app.workflow_stage, app.financial_status, app.financial_reviewed_at, app.financial_reviewed_by,
        app.final_reviewed_at, app.final_reviewed_by
      ]);

      console.log(`✅ Created application ${result.insertId}: ${app.first_name} ${app.last_name} (${app.workflow_stage})`);
    }

    // Get the created applications
    const [createdApps] = await connection.execute(
      'SELECT id, first_name, last_name, email, status, workflow_stage FROM membership_applications WHERE email LIKE "%test-role%" ORDER BY id DESC'
    );

    console.log('\n🎯 **TEST APPLICATIONS CREATED SUCCESSFULLY!**');
    console.log('\n📋 **Available Test Applications:**');
    
    createdApps.forEach(app => {
      console.log(`\n   📄 **${app.first_name} ${app.last_name}**`);
      console.log(`      ID: ${app.id}`);
      console.log(`      Email: ${app.email}`);
      console.log(`      Status: ${app.status}`);
      console.log(`      Workflow Stage: ${app.workflow_stage || 'Submitted'}`);
      console.log(`      URL: http://localhost:3001/admin/applications/${app.id}`);
    });

    console.log('\n🔐 **TESTING INSTRUCTIONS:**');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Login as Financial Reviewer: financial.reviewer@test.com / password123');
    console.log('3. Navigate to one of the application URLs above');
    console.log('4. Verify you see only Payment Information and Financial Review tabs');
    console.log('5. Test financial review workflow');
    console.log('6. Logout and login as Membership Approver: membership.approver@test.com / password123');
    console.log('7. Navigate to the same application');
    console.log('8. Verify you see all 5 tabs with complete details');

    console.log('\n✅ **READY FOR ROLE-BASED TESTING!**');

  } catch (error) {
    console.error('❌ Error creating test applications:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the function
createTestApplication();
