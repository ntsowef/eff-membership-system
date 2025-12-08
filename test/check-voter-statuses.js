const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkVoterStatuses() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(80));
    console.log('VOTER STATUSES LOOKUP TABLE');
    console.log('='.repeat(80));
    console.log();

    const query = `
      SELECT *
      FROM voter_statuses
      ORDER BY status_id;
    `;
    
    const result = await client.query(query);
    console.table(result.rows);
    console.log();

    console.log('='.repeat(80));
    console.log('INTERPRETATION FOR ATTENDANCE REGISTER FILTERING');
    console.log('='.repeat(80));
    console.log();
    
    result.rows.forEach(row => {
      if (row.status_name && row.status_name.toLowerCase().includes('not registered')) {
        console.log(`❌ EXCLUDE: status_id = ${row.status_id} (${row.status_name})`);
      } else if (row.status_name && row.status_name.toLowerCase().includes('registered')) {
        console.log(`✅ INCLUDE: status_id = ${row.status_id} (${row.status_name})`);
      } else {
        console.log(`⚠️  REVIEW: status_id = ${row.status_id} (${row.status_name})`);
      }
    });
    
    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error checking voter statuses:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkVoterStatuses()
  .then(() => {
    console.log('\n✅ Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });

