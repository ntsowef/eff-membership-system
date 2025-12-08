const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' 
        AND column_name LIKE '%voting%'
      ORDER BY column_name
    `);
    
    console.log('Voting-related columns in members_consolidated:');
    result.rows.forEach(r => console.log('  -', r.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

