const mysql = require('mysql2/promise');

async function createApprovalReadyApplications() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Creating applications ready for approval...\n');

    // Create applications with "Payment Approved" status for membership approver
    const applications = [
      {
        application_number: 'APP-2025-001',
        first_name: 'Nomsa',
        last_name: 'Dlamini',
        id_number: '9001015678901',
        date_of_birth: '1990-01-01',
        gender: 'Female',
        email: 'nomsa.dlamini@email.com',
        cell_number: '0821234567',
        residential_address: '123 Main Street, Durban, KwaZulu-Natal',
        ward_code: '59501001',
        application_type: 'New',
        status: 'Under Review',
        membership_type: 'Student',
        financial_status: 'Approved',
        workflow_stage: 'Payment Approved',
        payment_method: 'Bank Transfer',
        payment_reference: 'PAY-001-2025',
        payment_amount: 50.00,
        last_payment_date: '2025-09-20',
        submitted_at: '2025-09-20 10:00:00',
        financial_reviewed_at: '2025-09-20 14:00:00',
        financial_reviewed_by: 2, // Financial reviewer user ID
        province_code: 'KZN',
        district_code: 'DC21',
        municipal_code: 'KZN211'
      },
      {
        application_number: 'APP-2025-002',
        first_name: 'Sipho',
        last_name: 'Ndlovu',
        id_number: '8505123456789',
        date_of_birth: '1985-05-12',
        gender: 'Male',
        email: 'sipho.ndlovu@email.com',
        cell_number: '0837654321',
        residential_address: '456 Oak Avenue, Cape Town, Western Cape',
        ward_code: '19100001',
        application_type: 'New',
        status: 'Under Review',
        membership_type: 'Regular',
        financial_status: 'Approved',
        workflow_stage: 'Payment Approved',
        payment_method: 'EFT',
        payment_reference: 'PAY-002-2025',
        payment_amount: 100.00,
        last_payment_date: '2025-09-20',
        submitted_at: '2025-09-20 11:30:00',
        financial_reviewed_at: '2025-09-20 15:30:00',
        financial_reviewed_by: 2, // Financial reviewer user ID
        province_code: 'WC',
        district_code: 'DC1',
        municipal_code: 'WC011'
      },
      {
        application_number: 'APP-2025-003',
        first_name: 'Thabo',
        last_name: 'Mthembu',
        id_number: '9203087654321',
        date_of_birth: '1992-03-08',
        gender: 'Male',
        email: 'thabo.mthembu@email.com',
        cell_number: '0719876543',
        residential_address: '789 Pine Street, Johannesburg, Gauteng',
        ward_code: '79801001',
        application_type: 'New',
        status: 'Under Review',
        membership_type: 'Regular',
        financial_status: 'Pending',
        workflow_stage: 'Financial Review',
        payment_method: 'Cash Deposit',
        payment_reference: 'PAY-003-2025',
        payment_amount: 100.00,
        last_payment_date: '2025-09-21',
        submitted_at: '2025-09-21 09:00:00',
        province_code: 'GP',
        district_code: 'DC42',
        municipal_code: 'GP421'
      }
    ];

    // Insert applications
    for (const app of applications) {
      const columns = Object.keys(app).join(', ');
      const placeholders = Object.keys(app).map(() => '?').join(', ');
      const values = Object.values(app);

      const query = `
        INSERT INTO membership_applications (${columns}, created_at, updated_at)
        VALUES (${placeholders}, NOW(), NOW())
      `;

      try {
        await connection.execute(query, values);
        console.log(`✅ Created application: ${app.first_name} ${app.last_name} (${app.workflow_stage})`);
      } catch (error) {
        console.log(`❌ Failed to create ${app.first_name} ${app.last_name}:`, error.message);
      }
    }

    // Show current applications by workflow stage
    console.log('\n📊 Applications by workflow stage:');
    const [stageResults] = await connection.execute(`
      SELECT workflow_stage, COUNT(*) as count 
      FROM membership_applications 
      WHERE workflow_stage IS NOT NULL
      GROUP BY workflow_stage
      ORDER BY count DESC
    `);

    stageResults.forEach(row => {
      console.log(`  • ${row.workflow_stage}: ${row.count} applications`);
    });

    // Show applications ready for approval
    console.log('\n🎯 Applications ready for membership approval:');
    const [readyApps] = await connection.execute(`
      SELECT first_name, last_name, email, membership_type, workflow_stage, financial_status
      FROM membership_applications 
      WHERE workflow_stage = 'Payment Approved' AND financial_status = 'Approved'
      ORDER BY created_at DESC
    `);

    if (readyApps.length > 0) {
      readyApps.forEach((app, index) => {
        console.log(`  ${index + 1}. ${app.first_name} ${app.last_name} (${app.membership_type}) - ${app.email}`);
      });
    } else {
      console.log('  No applications ready for approval found');
    }

    await connection.end();
    console.log('\n✅ Database setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createApprovalReadyApplications();
