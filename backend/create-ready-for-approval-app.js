const mysql = require('mysql2/promise');

async function createReadyForApprovalApp() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔧 Creating applications ready for final approval...\n');

    // Create applications in "Payment Approved" status
    const testApplications = [
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        cell_number: '0821234567',
        id_number: '9001015800083'
      },
      {
        first_name: 'Michael',
        last_name: 'Williams',
        email: 'michael.williams@example.com',
        cell_number: '0837654321',
        id_number: '8505125900074'
      },
      {
        first_name: 'Priya',
        last_name: 'Patel',
        email: 'priya.patel@example.com',
        cell_number: '0729876543',
        id_number: '7803201234567'
      }
    ];

    for (const app of testApplications) {
      // Check if application already exists
      const [existing] = await connection.execute(`
        SELECT id FROM membership_applications WHERE email = ?
      `, [app.email]);

      if (existing.length === 0) {
        const [insertResult] = await connection.execute(`
          INSERT INTO membership_applications (
            application_number,
            first_name, 
            last_name, 
            email, 
            cell_number, 
            id_number,
            date_of_birth,
            gender,
            residential_address,
            ward_code,
            application_type,
            status,
            workflow_stage,
            financial_status,
            declaration_accepted,
            constitution_accepted,
            membership_type,
            submitted_at,
            created_at,
            updated_at
          ) VALUES (
            CONCAT('APP', LPAD(FLOOR(RAND() * 999999), 6, '0')),
            ?, ?, ?, ?, ?,
            '1990-01-01',
            'Male',
            '123 Test Street, Test City',
            'TEST001',
            'New',
            'Under Review',
            'Payment Approved',
            'Approved',
            1,
            1,
            'Regular',
            NOW(),
            NOW(),
            NOW()
          )
        `, [app.first_name, app.last_name, app.email, app.cell_number, app.id_number]);

        console.log(`✅ Created application for ${app.first_name} ${app.last_name} (ID: ${insertResult.insertId})`);
      } else {
        // Update existing application to be ready for approval
        await connection.execute(`
          UPDATE membership_applications 
          SET workflow_stage = 'Payment Approved',
              financial_status = 'Approved',
              status = 'Under Review',
              declaration_accepted = 1,
              constitution_accepted = 1,
              updated_at = NOW()
          WHERE email = ?
        `, [app.email]);

        console.log(`✅ Updated existing application for ${app.first_name} ${app.last_name} (ID: ${existing[0].id})`);
      }
    }

    // Verify the applications are ready
    console.log('\n📋 **Applications Ready for Final Approval:**');
    const [readyApps] = await connection.execute(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        workflow_stage,
        financial_status,
        status,
        created_at
      FROM membership_applications 
      WHERE workflow_stage = 'Payment Approved' 
         AND financial_status = 'Approved'
         AND status = 'Under Review'
      ORDER BY created_at DESC
    `);

    readyApps.forEach(app => {
      console.log(`   • ID: ${app.id} | ${app.first_name} ${app.last_name} | ${app.email}`);
      console.log(`     Status: ${app.workflow_stage} → Ready for Membership Approver`);
    });

    await connection.end();
    console.log(`\n🎉 **Success!** Created/Updated ${testApplications.length} applications ready for final approval`);
    console.log('✅ These applications should now appear in the "Ready for Approval" tab');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createReadyForApprovalApp();
