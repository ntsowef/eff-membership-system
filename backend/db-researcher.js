
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: '69.164.245.173', port: 5432, user: 'eff_admin', password: 'Frames!123', database: 'eff_membership_database'
});

async function run() {
  try {
    let results = {};
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('deceased_members_archive', 'audit_logs', 'members', 'members_consolidated')");
    results.tables = tables.rows;

    const constraintsMembers = await pool.query(`
      SELECT 
        conname as name, 
        conrelid::regclass as from_table, 
        confrelid::regclass as to_table,
        pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c 
      WHERE confrelid = 'members'::regclass AND contype = 'f'
    `);
    results.constraints_on_members = constraintsMembers.rows;

    const constraintsConsol = await pool.query(`
      SELECT 
        conname as name, 
        conrelid::regclass as from_table, 
        confrelid::regclass as to_table,
        pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c 
      WHERE confrelid = 'members_consolidated'::regclass AND contype = 'f'
    `);
    results.constraints_on_members_consolidated = constraintsConsol.rows;

    console.log(JSON.stringify(results, null, 2));

  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
run();
