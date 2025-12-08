const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function checkPaymentConstraints() {
  try {
    console.log('🔍 Checking payments table constraints...\n');

    // Get check constraints
    const constraintQuery = `
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'payments' AND con.contype = 'c'
    `;

    const result = await pool.query(constraintQuery);

    if (result.rows.length === 0) {
      console.log('No check constraints found on payments table.');
    } else {
      console.log('Check Constraints:');
      result.rows.forEach(row => {
        console.log(`\n${row.constraint_name}:`);
        console.log(`  ${row.constraint_definition}`);
      });
    }

    // Get column info
    console.log('\n\n📋 Column Information:');
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'payments'
      ORDER BY ordinal_position
    `;

    const columnResult = await pool.query(columnQuery);
    console.table(columnResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPaymentConstraints();

