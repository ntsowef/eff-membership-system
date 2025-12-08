/**
 * Check ward_code vs ward_number for member 93087
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

async function checkWardData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking ward data for member 93087...\n');
    
    // Check member's ward_code
    const memberQuery = `
      SELECT 
        member_id,
        ward_code,
        firstname,
        surname
      FROM members
      WHERE member_id = 93087;
    `;
    
    console.log('📋 Member data:');
    const memberResult = await client.query(memberQuery);
    console.table(memberResult.rows);
    
    if (memberResult.rows.length > 0) {
      const wardCode = memberResult.rows[0].ward_code;
      
      // Check ward details
      const wardQuery = `
        SELECT 
          ward_code,
          ward_number,
          ward_name,
          municipality_code
        FROM wards
        WHERE ward_code = $1;
      `;
      
      console.log('\n📋 Ward details:');
      const wardResult = await client.query(wardQuery, [wardCode]);
      console.table(wardResult.rows);
    }
    
    // Check what the view returns
    console.log('\n📋 View data:');
    const viewQuery = `
      SELECT 
        member_id,
        ward_code,
        ward_number,
        municipality_name
      FROM vw_member_details_optimized
      WHERE member_id = 93087;
    `;
    
    const viewResult = await client.query(viewQuery);
    console.table(viewResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkWardData()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

