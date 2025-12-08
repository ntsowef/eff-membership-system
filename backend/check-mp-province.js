const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMPProvince() {
  try {
    console.log('🔍 Checking Mpumalanga Province (MP) data...\n');

    // Check if MP province exists in members_consolidated
    const mpQuery = `
      SELECT province_code, province_name, COUNT(*) as member_count 
      FROM members_consolidated 
      WHERE province_code = 'MP' 
      GROUP BY province_code, province_name;
    `;
    const mpResult = await pool.query(mpQuery);
    console.log('📊 MP Province in members_consolidated:');
    console.log(mpResult.rows);
    console.log('');

    // Check all provinces in members_consolidated
    const allProvincesQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM members_consolidated 
      GROUP BY province_code 
      ORDER BY province_code;
    `;
    const allProvincesResult = await pool.query(allProvincesQuery);
    console.log('📊 All provinces in members_consolidated:');
    console.table(allProvincesResult.rows);
    console.log('');

    // Check vw_enhanced_member_search for MP
    const viewQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      WHERE province_code = 'MP' 
      GROUP BY province_code;
    `;
    const viewResult = await pool.query(viewQuery);
    console.log('📊 MP Province in vw_enhanced_member_search:');
    console.log(viewResult.rows);
    console.log('');

    // Check provinces table
    const provincesTableQuery = `
      SELECT province_code, province_name 
      FROM provinces 
      ORDER BY province_code;
    `;
    const provincesTableResult = await pool.query(provincesTableQuery);
    console.log('📊 All provinces in provinces table:');
    console.table(provincesTableResult.rows);
    console.log('');

    // Sample some MP members
    const sampleQuery = `
      SELECT member_id, firstname, surname, province_code, province_name, municipality_code, ward_code
      FROM members_consolidated 
      WHERE province_code = 'MP' 
      LIMIT 5;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log('📊 Sample MP members from members_consolidated:');
    console.table(sampleResult.rows);

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkMPProvince();

