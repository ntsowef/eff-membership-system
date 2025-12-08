/**
 * Test Single Member Insert
 * 
 * This script tests inserting a single member to see the exact error
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function testSingleInsert() {
  console.log('🧪 Testing single member insert...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Test data - minimal required fields
    const testData = {
      id_number: '9001015800080',
      firstname: 'Test',
      surname: 'Member',
      date_of_birth: '1990-01-01',
      age: 35,
      gender_id: 1,
      race_id: 1,
      citizenship_id: 1,
      language_id: 1,
      ward_code: '12345678',
      voter_district_code: null,
      voting_district_code: null,
      voting_station_id: null,
      residential_address: 'Test Address',
      cell_number: '0821234567',
      email: 'test@example.com',
      occupation_id: 1,
      qualification_id: 1,
      voter_status_id: 1,
      membership_type: 'Regular',
      province_name: 'Gauteng',
      province_code: '1',
      district_name: null,
      district_code: null,
      municipality_name: 'City of Johannesburg',
      municipality_code: 'JHB',
      date_joined: '2025-01-01',
      last_payment_date: '2025-01-01',
      expiry_date: '2027-01-01',
      subscription_type_id: 1,
      membership_amount: 12,
      membership_status_id: 1,
      payment_method: null,
      payment_reference: null,
      payment_status: 'Pending'
    };

    console.log('📝 Test data:', JSON.stringify(testData, null, 2));
    console.log('\n🔄 Attempting insert...\n');

    const query = `
      INSERT INTO members_consolidated (
        id_number, firstname, surname, date_of_birth, age, gender_id, race_id,
        citizenship_id, language_id, ward_code, voter_district_code, voting_district_code,
        voting_station_id, residential_address, cell_number, email, occupation_id,
        qualification_id, voter_status_id, membership_type,
        province_name, province_code, district_name, district_code,
        municipality_name, municipality_code,
        date_joined, last_payment_date, expiry_date, subscription_type_id,
        membership_amount, membership_status_id, payment_method, payment_reference, payment_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::VARCHAR, $11::VARCHAR, $12::VARCHAR,
        $13, $14, $15::VARCHAR, $16, $17, $18, $19, $20,
        $21, $22::VARCHAR, $23, $24::VARCHAR, $25, $26::VARCHAR,
        $27, $28, $29, $30, $31, $32, $33, $34, $35
      )
      RETURNING member_id
    `;

    const params = [
      testData.id_number,
      testData.firstname,
      testData.surname,
      testData.date_of_birth,
      testData.age,
      testData.gender_id,
      testData.race_id,
      testData.citizenship_id,
      testData.language_id,
      testData.ward_code,
      testData.voter_district_code,
      testData.voting_district_code,
      testData.voting_station_id,
      testData.residential_address,
      testData.cell_number,
      testData.email,
      testData.occupation_id,
      testData.qualification_id,
      testData.voter_status_id,
      testData.membership_type,
      testData.province_name,
      testData.province_code,
      testData.district_name,
      testData.district_code,
      testData.municipality_name,
      testData.municipality_code,
      testData.date_joined,
      testData.last_payment_date,
      testData.expiry_date,
      testData.subscription_type_id,
      testData.membership_amount,
      testData.membership_status_id,
      testData.payment_method,
      testData.payment_reference,
      testData.payment_status
    ];

    const result = await client.query(query, params);
    
    console.log('✅ Insert successful!');
    console.log(`   Member ID: ${result.rows[0].member_id}`);

    await client.query('ROLLBACK'); // Rollback to not pollute database
    console.log('\n🔄 Transaction rolled back (test only)');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Insert failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Detail: ${error.detail || 'N/A'}`);
    console.error(`   Hint: ${error.hint || 'N/A'}`);
    console.error(`\n   Full error:`, error);
  } finally {
    client.release();
    await pool.end();
  }
}

testSingleInsert();

