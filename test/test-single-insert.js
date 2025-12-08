const { Client } = require('pg');

async function testSingleInsert() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Test data matching what the batch insert would use (using actual ward code from test)
    const testData = {
      application_number: `APP${Date.now()}${Math.floor(Math.random() * 1000)}`,
      first_name: 'Mpho',
      last_name: 'Ndlovu',
      id_number: '6312046071089',
      date_of_birth: '1963-12-04',
      gender: 'Male',
      email: 'mpho.ndlovu@example.com',
      cell_number: '0646584456',
      residential_address: '123 Test Street, Test City',
      ward_code: '29300042',  // Actual ward code from test data
      province_code: null,
      district_code: null,
      municipal_code: null,
      application_type: 'New',
      payment_method: 'Cash',
      payment_reference: 'TEST123',
      payment_amount: 100.00
    };
    
    console.log('Test data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\nAttempting insert...\n');
    
    const query = `
      INSERT INTO membership_applications (
        application_number, first_name, last_name, id_number, date_of_birth,
        gender, email, cell_number, residential_address, ward_code,
        province_code, district_code, municipal_code, application_type,
        payment_method, payment_reference, payment_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING application_id
    `;
    
    const params = [
      testData.application_number,
      testData.first_name,
      testData.last_name,
      testData.id_number,
      testData.date_of_birth,
      testData.gender,
      testData.email,
      testData.cell_number,
      testData.residential_address,
      testData.ward_code,
      testData.province_code,
      testData.district_code,
      testData.municipal_code,
      testData.application_type,
      testData.payment_method,
      testData.payment_reference,
      testData.payment_amount
    ];
    
    const result = await client.query(query, params);
    console.log('✅ Insert successful!');
    console.log(`   Application ID: ${result.rows[0].application_id}`);
    
  } catch (error) {
    console.error('❌ Insert failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Detail: ${error.detail || 'None'}`);
    console.error(`   Hint: ${error.hint || 'None'}`);
    console.error(`   Code: ${error.code || 'None'}`);
  } finally {
    await client.end();
  }
}

testSingleInsert();

