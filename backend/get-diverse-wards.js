require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function getDiverseWards() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fetching diverse ward codes from across South Africa...\n');
    
    // Get wards with different municipality codes (first 5 digits indicate municipality)
    const result = await client.query(`
      SELECT DISTINCT ON (SUBSTRING(ward_code, 1, 5))
        ward_code,
        ward_name
      FROM wards
      WHERE ward_code IS NOT NULL
      ORDER BY SUBSTRING(ward_code, 1, 5), ward_code
      LIMIT 10;
    `);
    
    console.log(`✓ Found ${result.rows.length} diverse wards\n`);
    console.log('Ward codes for test members:');
    console.log('='.repeat(60));
    
    result.rows.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${row.ward_code.padEnd(15)} ${row.ward_name || 'N/A'}`);
    });
    console.log('='.repeat(60));
    
    console.log('\nJavaScript array for test script:');
    console.log('[');
    result.rows.forEach((row, index) => {
      const comma = index < result.rows.length - 1 ? ',' : '';
      console.log(`  '${row.ward_code}'${comma}`);
    });
    console.log(']');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

getDiverseWards();

