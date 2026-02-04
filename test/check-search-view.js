const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  port: 5432
});

async function checkView() {
  try {
    // Check if view exists
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%member_search%'
    `);
    console.log('Views found:', viewCheck.rows);

    // Check if search_text column exists
    const colCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vw_member_search_consolidated'
    `);
    console.log('Columns:', colCheck.rows.map(r => r.column_name));

    // Try a simple search on members_consolidated directly
    const searchTest = await pool.query(`
      SELECT member_id, firstname, surname, id_number
      FROM members_consolidated
      WHERE firstname ILIKE $1 OR surname ILIKE $1
      LIMIT 5
    `, ['%Ntso%']);
    console.log('Direct search results:', searchTest.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkView();

