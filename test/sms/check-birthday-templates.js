/**
 * Check Birthday Message Templates
 */

require('dotenv').config({ path: '.env.postgres' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function checkTemplates() {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT language_code, language_name, message_template
      FROM birthday_message_templates
      WHERE language_code IN ('tn', 'nso')
      ORDER BY language_code
    `);

    console.log('\n📋 Birthday Message Templates:\n');
    
    result.rows.forEach(row => {
      console.log(`${row.language_name} (${row.language_code}):`);
      console.log(`"${row.message_template}"`);
      console.log('');
      
      // Show personalized examples
      console.log('Examples:');
      console.log(`  Frans: "${row.message_template.replace('{firstname}', 'Frans')}"`);
      console.log(`  NOKO: "${row.message_template.replace('{firstname}', 'NOKO')}"`);
      console.log('');
    });

    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkTemplates();

