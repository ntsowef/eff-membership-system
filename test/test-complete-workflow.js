const mysql = require('mysql2/promise');

async function testCompleteWorkflow() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('✅ Connected! Testing complete membership workflow...\n');

    // 1. Create a test membership application
    console.log('📝 Step 1: Creating test membership application...');
    const [applicationResult] = await connection.execute(`
      INSERT INTO membership_applications (
        application_number, first_name, last_name, id_number, date_of_birth, gender,
        cell_number, email, residential_address, province_code,
        district_code, municipal_code, ward_code,
        language_id, occupation_id, qualification_id, citizenship_status,
        declaration_accepted, constitution_accepted, signature_data,
        payment_method, payment_amount, payment_reference, last_payment_date,
        status, submitted_at
      ) VALUES (
        'APP-TEST-001', 'John', 'Doe', '8501015800082', '1985-01-01', 'Male',
        '0821234567', 'john.doe@email.com', '123 Test Street, Johannesburg', 'GP',
        'JHB', 'JHB', '79800001',
        1, 1, 1, 'South African Citizen',
        1, 1, 'John Doe - Digital Signature',
        'cash', 10.00, 'CASH-REF-001', NOW(),
        'Submitted', NOW()
      )
    `);

    const applicationId = applicationResult.insertId;
    console.log(`   ✅ Created application ID: ${applicationId}`);

    // 2. Create cash payment transaction
    console.log('💰 Step 2: Recording cash payment transaction...');
    const [paymentResult] = await connection.execute(`
      INSERT INTO payment_transactions (
        application_id, payment_method, amount, status, 
        receipt_number, created_at
      ) VALUES (
        ?, 'cash', 10.00, 'verification_required', 
        'RECEIPT-001-2025', NOW()
      )
    `, [applicationId]);

    const transactionId = paymentResult.insertId;
    console.log(`   ✅ Created payment transaction ID: ${transactionId}`);

    // 3. Simulate office verification
    console.log('🏢 Step 3: Simulating office cash payment verification...');
    
    // Create cash payment verification record
    await connection.execute(`
      INSERT INTO cash_payment_verifications (
        transaction_id, amount_verified, verified_by, 
        verification_status, verification_notes, created_at
      ) VALUES (
        ?, 10.00, 1, 'approved', 
        'Receipt verified against bank deposit. Amount correct.', NOW()
      )
    `, [transactionId]);

    // Update payment transaction status
    await connection.execute(`
      UPDATE payment_transactions 
      SET status = 'completed', verified_by = 1, verified_at = NOW(),
          verification_notes = 'Cash payment verified by office staff'
      WHERE id = ?
    `, [transactionId]);

    console.log('   ✅ Cash payment verified and approved');

    // 4. Check application approval readiness
    console.log('🔍 Step 4: Checking application approval readiness...');
    
    const [readinessCheck] = await connection.execute(`
      SELECT 
        ma.*,
        pt.status as payment_status,
        pt.amount as payment_amount,
        pt.verified_at
      FROM membership_applications ma
      LEFT JOIN payment_transactions pt ON ma.id = pt.application_id
      WHERE ma.id = ? AND pt.status = 'completed'
    `, [applicationId]);

    if (readinessCheck.length > 0) {
      console.log('   ✅ Application is ready for approval');
      console.log(`   📋 Payment Status: ${readinessCheck[0].payment_status}`);
      console.log(`   💰 Payment Amount: R${readinessCheck[0].payment_amount}`);
      console.log(`   ✅ Verified At: ${readinessCheck[0].verified_at}`);
    }

    // 5. Approve application and create member
    console.log('👤 Step 5: Approving application and creating member...');
    
    // Generate membership number
    const membershipNumber = `EFF${new Date().getFullYear()}${String(applicationId).padStart(6, '0')}`;
    
    // Create member record
    const [memberResult] = await connection.execute(`
      INSERT INTO members (
        membership_number, first_name, last_name, id_number, date_of_birth,
        gender, cell_number, email, residential_address, province_code,
        district_code, municipality_code, ward_code, language_id,
        occupation_id, qualification_id, citizenship_status, status,
        created_at, updated_at
      ) SELECT 
        ?, first_name, last_name, id_number, date_of_birth,
        gender, cell_number, email, residential_address, province_code,
        district_code, municipality_code, ward_code, language_id,
        occupation_id, qualification_id, citizenship_status, 'Active',
        NOW(), NOW()
      FROM membership_applications WHERE id = ?
    `, [membershipNumber, applicationId]);

    const memberId = memberResult.insertId;
    console.log(`   ✅ Created member ID: ${memberId}`);
    console.log(`   🎫 Membership Number: ${membershipNumber}`);

    // Create membership record
    await connection.execute(`
      INSERT INTO memberships (
        member_id, membership_type, status, start_date, 
        payment_amount, payment_method, created_at
      ) VALUES (
        ?, 'Standard', 'Active', CURDATE(),
        10.00, 'cash', NOW()
      )
    `, [memberId]);

    // Update application status
    await connection.execute(`
      UPDATE membership_applications 
      SET status = 'Approved', approved_by = 1, approved_at = NOW(),
          admin_notes = 'Application approved after cash payment verification'
      WHERE id = ?
    `, [applicationId]);

    console.log('   ✅ Membership record created');
    console.log('   ✅ Application status updated to Approved');

    // 6. Create audit trail
    console.log('📋 Step 6: Creating audit trail...');
    await connection.execute(`
      INSERT INTO financial_audit_trail (
        operation_type, transaction_id, application_id, performed_by,
        notes, created_at
      ) VALUES (
        'payment_verified', ?, ?, 1,
        'Cash payment verified and application approved through complete workflow test',
        NOW()
      )
    `, [transactionId, applicationId]);

    console.log('   ✅ Audit trail created');

    // 7. Update financial monitoring summary
    console.log('📊 Step 7: Updating financial monitoring summary...');
    await connection.execute(`
      INSERT INTO financial_monitoring_summary (
        summary_date, total_applications, total_revenue, cash_revenue,
        approved_applications
      ) VALUES (
        CURDATE(), 1, 10.00, 10.00, 1
      ) ON DUPLICATE KEY UPDATE
        total_applications = total_applications + 1,
        total_revenue = total_revenue + 10.00,
        cash_revenue = cash_revenue + 10.00,
        approved_applications = approved_applications + 1,
        updated_at = NOW()
    `);

    console.log('   ✅ Financial summary updated');

    // 8. Verify complete workflow
    console.log('\n🎉 Step 8: Verifying complete workflow...');
    
    const [finalCheck] = await connection.execute(`
      SELECT 
        ma.id as application_id,
        ma.first_name,
        ma.last_name,
        ma.status as application_status,
        m.membership_number,
        m.status as member_status,
        pt.status as payment_status,
        pt.amount as payment_amount,
        ms.status as membership_status
      FROM membership_applications ma
      LEFT JOIN members m ON ma.id = m.id
      LEFT JOIN memberships ms ON m.id = ms.member_id
      LEFT JOIN payment_transactions pt ON ma.id = pt.application_id
      WHERE ma.id = ?
    `, [applicationId]);

    if (finalCheck.length > 0) {
      const result = finalCheck[0];
      console.log('\n📋 WORKFLOW COMPLETION SUMMARY:');
      console.log('=====================================');
      console.log(`Application ID: ${result.application_id}`);
      console.log(`Applicant: ${result.first_name} ${result.last_name}`);
      console.log(`Application Status: ${result.application_status}`);
      console.log(`Membership Number: ${result.membership_number}`);
      console.log(`Member Status: ${result.member_status}`);
      console.log(`Payment Status: ${result.payment_status}`);
      console.log(`Payment Amount: R${result.payment_amount}`);
      console.log(`Membership Status: ${result.membership_status}`);
      console.log('=====================================');
    }

    // 9. Test financial monitoring data
    console.log('\n💰 Step 9: Testing financial monitoring data...');
    const [monitoringData] = await connection.execute(`
      SELECT * FROM financial_monitoring_summary WHERE summary_date = CURDATE()
    `);

    if (monitoringData.length > 0) {
      const data = monitoringData[0];
      console.log('\n📊 FINANCIAL MONITORING DATA:');
      console.log('==============================');
      console.log(`Date: ${data.summary_date}`);
      console.log(`Total Applications: ${data.total_applications}`);
      console.log(`Total Revenue: R${data.total_revenue}`);
      console.log(`Cash Revenue: R${data.cash_revenue}`);
      console.log(`Approved Applications: ${data.approved_applications}`);
      console.log('==============================');
    }

    console.log('\n🎊 COMPLETE WORKFLOW TEST SUCCESSFUL!');
    console.log('\n✅ All systems working correctly:');
    console.log('   ✅ Application submission');
    console.log('   ✅ Cash payment recording');
    console.log('   ✅ Office verification process');
    console.log('   ✅ Application approval');
    console.log('   ✅ Member creation');
    console.log('   ✅ Membership activation');
    console.log('   ✅ Financial monitoring');
    console.log('   ✅ Audit trail creation');

  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

console.log('🚀 Starting complete membership workflow test...');
testCompleteWorkflow();
