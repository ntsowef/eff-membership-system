const { Client } = require('pg');

async function checkWards() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_database'
  });

  try {
    await client.connect();
    
    // Count total wards
    const countResult = await client.query('SELECT COUNT(*) as count FROM wards');
    console.log(`Total wards in database: ${countResult.rows[0].count}\n`);
    
    // Get sample wards
    const sampleResult = await client.query('SELECT ward_code, ward_name FROM wards LIMIT 20');
    console.log('Sample ward codes:');
    sampleResult.rows.forEach(r => {
      console.log(`  ${r.ward_code}: ${r.ward_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkWards();

