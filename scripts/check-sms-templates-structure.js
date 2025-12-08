const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function checkSMSTemplatesStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking sms_templates table structure...\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'sms_templates'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length === 0) {
      console.log('❌ sms_templates table does not exist!');
    } else {
      console.log('✅ sms_templates table structure:');
      console.log('');
      result.rows.forEach(col => {
        console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSMSTemplatesStructure();

