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
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
        AND data_type IN ('integer', 'smallint', 'bigint', 'numeric')
      ORDER BY ordinal_position
    `);
    
    console.log('INTEGER/NUMERIC Columns in members_consolidated:');
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('No integer or numeric columns found.');
    } else {
      result.rows.forEach(row => {
        console.log(`Column: ${row.column_name}`);
        console.log(`  Type: ${row.data_type}`);
        if (row.numeric_precision) {
          console.log(`  Precision: ${row.numeric_precision}, Scale: ${row.numeric_scale}`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    console.log('\nPostgreSQL Integer Limits:');
    console.log('  SMALLINT: -32,768 to 32,767');
    console.log('  INTEGER:  -2,147,483,648 to 2,147,483,647');
    console.log('  BIGINT:   -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807');
    console.log('='.repeat(80));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();

