
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function run() {
  try {
    const res = await pool.query('SELECT member_id, id_number, firstname, surname, membership_number, province_code FROM members WHERE id_number = $1', ['7808020703087']);
    console.log(JSON.stringify(res.rows, null, 2));
    
    const resConsol = await pool.query('SELECT member_id, id_number, firstname, surname, membership_number, province_code FROM members_consolidated WHERE id_number = $1', ['7808020703087']);
    console.log('\nConsolidated:');
    console.log(JSON.stringify(resConsol.rows, null, 2));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
run();
