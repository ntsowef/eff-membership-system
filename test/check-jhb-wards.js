const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkWards() {
  try {
    // Check total wards for JHB
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM wards 
      WHERE municipality_code = 'JHB'
    `);
    
    console.log(`Total wards for City of Johannesburg (JHB): ${result.rows[0].count}`);
    
    // Get all wards for JHB
    const wardsResult = await pool.query(`
      SELECT ward_code, ward_number, ward_name
      FROM wards 
      WHERE municipality_code = 'JHB'
      ORDER BY ward_number
    `);
    
    console.log('\nAll wards:');
    wardsResult.rows.forEach(ward => {
      console.log(`  ${ward.ward_code} - ${ward.ward_name} (Ward ${ward.ward_number})`);
    });
    
    // Check if there are wards with different municipality codes that should be JHB
    const allWardsResult = await pool.query(`
      SELECT municipality_code, COUNT(*) as count
      FROM wards
      GROUP BY municipality_code
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\nTop 10 municipalities by ward count:');
    allWardsResult.rows.forEach(row => {
      console.log(`  ${row.municipality_code}: ${row.count} wards`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWards();

