const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
        AND column_name IN ('id_number', 'cell_number', 'ward_code', 'voter_district_code', 'voting_district_code')
      ORDER BY column_name
    `);
    
    console.log('Column Types in members_consolidated:');
    console.table(result.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();

