const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkTable() {
  try {
    console.log('🔍 Checking voter_statuses table...\n');

    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'voter_statuses'
      );
    `;
    const existsResult = await pool.query(tableExistsQuery);
    console.log('Table exists:', existsResult.rows[0].exists);
    console.log('');

    if (existsResult.rows[0].exists) {
      // Get table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'voter_statuses'
        ORDER BY ordinal_position;
      `;
      const columnsResult = await pool.query(columnsQuery);
      console.log('📊 voter_statuses columns:');
      console.table(columnsResult.rows);
      console.log('');

      // Get sample data
      const sampleQuery = 'SELECT * FROM voter_statuses LIMIT 5;';
      const sampleResult = await pool.query(sampleQuery);
      console.log('📊 Sample data:');
      console.table(sampleResult.rows);
    }

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTable();

