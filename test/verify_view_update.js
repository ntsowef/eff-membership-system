const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function verifyView() {
  try {
    const result = await pool.query(`
      SELECT 
        member_id,
        id_number,
        firstname,
        province_code,
        province_name,
        municipality_name,
        ward_code
      FROM vw_member_details_optimized
      WHERE id_number = '7501165402082'
    `);
    
    console.log('View query result:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyView();

