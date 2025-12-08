require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function getRealWards() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fetching real ward codes from database...\n');
    
    // Get wards from different provinces
    const result = await client.query(`
      SELECT
        w.ward_code,
        w.ward_name
      FROM wards w
      WHERE w.ward_code IS NOT NULL
      ORDER BY w.ward_code
      LIMIT 50;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No wards found in database!');
      console.log('\nChecking if wards table exists...');
      
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'wards';
      `);
      
      if (tableCheck.rows.length === 0) {
        console.log('❌ Wards table does not exist!');
      } else {
        console.log('✓ Wards table exists but is empty');
        
        // Check table structure
        const structureCheck = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'wards'
          ORDER BY ordinal_position;
        `);
        
        console.log('\nWards table structure:');
        structureCheck.rows.forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
      }
    } else {
      console.log(`✓ Found ${result.rows.length} wards\n`);
      console.log('Sample wards:');
      console.log('='.repeat(80));

      result.rows.forEach((row, index) => {
        console.log(`${(index + 1).toString().padStart(3)}. ${row.ward_code.padEnd(20)} ${row.ward_name || 'N/A'}`);
      });
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

getRealWards();

