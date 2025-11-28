const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testMembershipApplicationsFix() {
  console.log('🔧 Testing membership applications column fix...\n');

  try {
    // Test the exact query that was failing
    console.log('1. Testing the fixed query with application_id as id...');
    const query = `
      SELECT
        application_id as id,
        application_number,
        first_name,
        last_name,
        email,
        cell_number,
        id_number,
        status,
        application_type,
        membership_type,
        created_at,
        submitted_at,
        reviewed_at
      FROM membership_applications
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [20, 0]);
    
    console.log('✅ SUCCESS: Query executed successfully!');
    console.log(`Found ${result.rows.length} applications`);
    
    if (result.rows.length > 0) {
      console.log('\nSample result:');
      console.log({
        id: result.rows[0].id,
        application_number: result.rows[0].application_number,
        name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
        status: result.rows[0].status,
        email: result.rows[0].email
      });
    } else {
      console.log('No applications found (table is empty)');
    }

    // Test the getApplicationById query
    console.log('\n2. Testing getApplicationById query...');
    const getByIdQuery = `
      SELECT
        ma.*,
        NULL as ward_name,
        NULL as municipality_name,
        NULL as district_name,
        NULL as province_name,
        NULL as reviewer_name
      FROM membership_applications ma
      WHERE ma.application_id = $1
    `;
    
    // Test with a non-existent ID
    const byIdResult = await pool.query(getByIdQuery, [1]);
    console.log('✅ SUCCESS: getApplicationById query executed successfully!');
    console.log(`Found ${byIdResult.rows.length} applications for ID 1`);

    console.log('\n3. Testing application count query...');
    const countQuery = `SELECT COUNT(*) as count FROM membership_applications`;
    const countResult = await pool.query(countQuery);
    console.log('✅ SUCCESS: Count query executed successfully!');
    console.log(`Total applications: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error testing queries:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }

  console.log('\n🎯 MEMBERSHIP APPLICATIONS FIX TEST COMPLETE!');
}

testMembershipApplicationsFix().catch(console.error);
