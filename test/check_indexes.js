const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function checkIndexes() {
  try {
    console.log('Checking indexes on members_consolidated table...\n');
    
    const result = await pool.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'members_consolidated'
      ORDER BY indexname
    `);
    
    console.table(result.rows);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No indexes found on members_consolidated table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkIndexes();

