const mysql = require('mysql2/promise');

async function testPaymentApprovedApplications() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking for applications ready for final approval...\n');

    // Check current application statuses
    console.log('📋 **Current Application Statuses:**');
    const [statusCounts] = await connection.execute(`
      SELECT 
        workflow_stage,
        financial_status,
        status,
        COUNT(*) as count
      FROM membership_applications 
      GROUP BY workflow_stage, financial_status, status
      ORDER BY workflow_stage, financial_status, status
    `);

    statusCounts.forEach(row => {
      console.log(`   • Workflow: ${row.workflow_stage || 'NULL'} | Financial: ${row.financial_status || 'NULL'} | Status: ${row.status || 'NULL'} → Count: ${row.count}`);
    });

    // Check for applications that should be ready for final approval
    console.log('\n📋 **Applications Ready for Final Approval:**');
    const [readyApps] = await connection.execute(`
      SELECT 
        id,
        firstname,
        surname,
        email,
        workflow_stage,
        financial_status,
        status,
        created_at
      FROM membership_applications 
      WHERE workflow_stage = 'Payment Approved' 
         OR (financial_status = 'Approved' AND status = 'Under Review')
      ORDER BY created_at DESC
    `);

    if (readyApps.length > 0) {
      console.log(`✅ Found ${readyApps.length} applications ready for final approval:`);
      readyApps.forEach(app => {
        console.log(`   • ID: ${app.id} | ${app.firstname} ${app.surname} | ${app.email}`);
        console.log(`     Workflow: ${app.workflow_stage} | Financial: ${app.financial_status} | Status: ${app.status}`);
        console.log(`     Created: ${app.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No applications found ready for final approval');
      
      // Create a test application in the right state
      console.log('\n📋 **Creating test application for approval workflow:**');
      
      const [insertResult] = await connection.execute(`
        INSERT INTO membership_applications (
          firstname, surname, email, cell_number, id_number,
          membership_type, province_id, municipality_id, ward_id,
          party_declaration_accepted, constitution_accepted,
          digital_signature, workflow_stage, financial_status, status,
          created_at, submitted_at
        ) VALUES (
          'Test', 'Approver', 'test.approver@example.com', '0821234567', '9001015800083',
          'Regular', 1, 1, 1,
          1, 1, 'test-signature-data',
          'Payment Approved', 'Approved', 'Under Review',
          NOW(), NOW()
        )
      `);

      const newAppId = insertResult.insertId;
      console.log(`✅ Created test application with ID: ${newAppId}`);
      console.log('   • Status: Payment Approved → Ready for final approval');
      console.log('   • This application should now appear in the "Ready for Approval" tab');
    }

    await connection.end();
    console.log('\n🎉 **Test Complete!**');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPaymentApprovedApplications();
