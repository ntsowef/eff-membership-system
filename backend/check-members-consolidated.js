const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='members_consolidated' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in members_consolidated:');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} ${row.data_type}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

