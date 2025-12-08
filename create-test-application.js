const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_db',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function createTestApplication() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to database');
    
    // Generate unique application number
    const appNumber = `APP${Date.now()}`;
    
    // Create test application
    const query = `
      INSERT INTO membership_applications (
        application_number, first_name, last_name, id_number, date_of_birth,
        gender, ward_code, cell_number, email, residential_address, postal_address,
        membership_type, status, payment_amount, payment_method, payment_status,
        payment_reference, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING application_id
    `;
    
    const params = [
      appNumber,
      'Test',
      'Member',
      '9001015800099', // Unique ID number
      '1990-01-01',
      'Male',
      '52503004',
      '0821234567',
      'ntsowef@gmail.com', // Your email
      '123 Test Street, Johannesburg, 2000',
      'PO Box 123, Johannesburg, 2000',
      'Regular',
      'Submitted',
      10.00,
      'Cash',
      'Completed',
      'TEST-' + Date.now()
    ];
    
    const result = await client.query(query, params);
    const applicationId = result.rows[0].application_id;
    
    console.log('✅ Test application created!');
    console.log('Application ID:', applicationId);
    console.log('Application Number:', appNumber);
    console.log('Email:', 'ntsowef@gmail.com');
    console.log('\nYou can now approve this application to test the notification system.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestApplication();

