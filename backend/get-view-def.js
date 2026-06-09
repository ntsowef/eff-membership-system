const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function getViewDef() {
  try {
    const result = await pool.query("SELECT pg_get_viewdef('vw_ward_membership_audit', true) as def");
    console.log('View definition:\n');
    console.log(result.rows[0].def);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getViewDef();

