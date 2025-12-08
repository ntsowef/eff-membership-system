/**
 * Test vw_member_details_optimized view directly
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eff_membership_db',
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
});

async function testView() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing vw_member_details_optimized view for member 93087...\n');
    
    const query = `
      SELECT
        member_id,
        membership_number,
        firstname as first_name,
        COALESCE(surname, '') as last_name,
        COALESCE(email, '') as email,
        COALESCE(cell_number, '') as phone_number,
        province_name,
        municipality_name,
        ward_number,
        voting_station_name,
        'Standard' as membership_type,
        member_created_at as join_date,
        (member_created_at + INTERVAL '365 days') as expiry_date,
        id_number
      FROM vw_member_details_optimized
      WHERE member_id = 93087
      LIMIT 1;
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length > 0) {
      console.log('✅ Query result:');
      console.table(result.rows);
      
      const row = result.rows[0];
      console.log('\n📊 Province Data:');
      console.log(`  - province_name: ${row.province_name || 'NULL ❌'}`);
      
      if (row.province_name) {
        console.log('\n✅ SUCCESS: View returns province data!');
      } else {
        console.log('\n❌ FAILURE: View returns NULL for province_name!');
        console.log('\nThis means the view was not updated correctly.');
      }
    } else {
      console.log('❌ No results found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testView()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

