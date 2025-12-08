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

async function checkMembersConsolidatedColumns() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(80));
    console.log('MEMBERS_CONSOLIDATED TABLE STRUCTURE');
    console.log('='.repeat(80));
    console.log();

    // Get column information
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(query);
    console.table(result.rows);
    console.log();

    // Check for specific columns we need
    const columnNames = result.rows.map(row => row.column_name);
    
    console.log('='.repeat(80));
    console.log('CHECKING FOR REQUIRED COLUMNS');
    console.log('='.repeat(80));
    console.log();
    
    const requiredColumns = [
      'membership_status_id',
      'voter_status_id',
      'voting_district_code',
      'voter_registration_number',
      'expiry_date',
      'date_joined'
    ];
    
    requiredColumns.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error checking table structure:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkMembersConsolidatedColumns()
  .then(() => {
    console.log('\n✅ Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });

