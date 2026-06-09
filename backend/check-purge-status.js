
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost', port: 5432, user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT COUNT(*) as count FROM members_consolidated
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
run();
