
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432'), user: process.env.DB_USER || 'eff_admin', password: process.env.DB_PASSWORD || 'Frames!123', database: process.env.DB_NAME || 'eff_membership_database'
});

async function findID(idNumber) {
  const client = await pool.connect();
  try {
    const tables = ['members', 'members_consolidated', 'membership_applications', 'member_application_bulk_upload_records'];
    let results = {};
    for (const table of tables) {
      try {
        const query = `SELECT * FROM ${table} WHERE id_number = $1`;
        const res = await client.query(query, [idNumber]);
        results[table] = res.rows;
      } catch (err) {
        results[table] = { error: err.message };
      }
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    client.release(); await pool.end();
  }
}

const targetID = process.argv[2] || '7808020703087';
findID(targetID).catch(console.error);
