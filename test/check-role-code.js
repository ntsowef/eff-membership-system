const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkRoleCode() {
  try {
    const result = await pool.query(`
      SELECT role_id, role_name, role_code 
      FROM roles 
      WHERE role_name = 'Super Administrator'
    `);
    
    console.log('Super Administrator Role:');
    console.log(result.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkRoleCode();

