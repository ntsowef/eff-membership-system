/**
 * Check member 93087 ID number
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

async function checkMember() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking member 93087 ID number...\n');
    
    const query = `
      SELECT 
        member_id,
        id_number,
        firstname,
        surname
      FROM members
      WHERE member_id = 93087;
    `;
    
    const result = await client.query(query);
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      const idNumber = result.rows[0].id_number;
      console.log(`\n✅ Member 93087 has ID number: ${idNumber}`);
      console.log(`\nTo test the API, use:`);
      console.log(`curl http://localhost:5000/api/v1/members/by-id-number/${idNumber}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkMember()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

