const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function checkMembersSchema() {
  try {
    console.log('🔍 Checking members table schema...\n');

    // Get column info
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `;

    const columnResult = await pool.query(columnQuery);
    
    console.log('📋 Members Table Columns:');
    console.log('='.repeat(120));
    columnResult.rows.forEach((row, index) => {
      const maxLength = row.character_maximum_length ? ` (${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`${(index + 1).toString().padStart(3)}. ${row.column_name.padEnd(30)} ${row.data_type}${maxLength.padEnd(10)} ${nullable.padEnd(10)}${defaultVal}`);
    });
    
    console.log('\n' + '='.repeat(120));
    console.log(`Total columns: ${columnResult.rows.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMembersSchema();

