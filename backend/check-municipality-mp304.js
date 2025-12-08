const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMunicipality() {
  try {
    console.log('🔍 Checking municipality MP304...\n');

    // Check if municipality exists
    const munQuery = `
      SELECT * FROM municipalities WHERE municipality_code = 'MP304';
    `;
    const munResult = await pool.query(munQuery);
    console.log('📊 Municipality MP304 info:');
    console.table(munResult.rows);
    console.log('');

    // Check members in members_consolidated
    const consolidatedQuery = `
      SELECT COUNT(*) as member_count 
      FROM members_consolidated 
      WHERE municipality_code = 'MP304';
    `;
    const consolidatedResult = await pool.query(consolidatedQuery);
    console.log('📊 Members in members_consolidated with municipality_code = MP304:');
    console.log('Count:', consolidatedResult.rows[0].member_count);
    console.log('');

    // Check members in view
    const viewQuery = `
      SELECT COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      WHERE municipality_code = 'MP304';
    `;
    const viewResult = await pool.query(viewQuery);
    console.log('📊 Members in vw_enhanced_member_search with municipality_code = MP304:');
    console.log('Count:', viewResult.rows[0].member_count);
    console.log('');

    // Sample members
    if (parseInt(consolidatedResult.rows[0].member_count) > 0) {
      const sampleQuery = `
        SELECT member_id, firstname, surname, province_code, district_code, municipality_code, ward_code
        FROM members_consolidated 
        WHERE municipality_code = 'MP304' 
        LIMIT 5;
      `;
      const sampleResult = await pool.query(sampleQuery);
      console.log('📊 Sample members from members_consolidated:');
      console.table(sampleResult.rows);
    }

    // Check what municipalities exist in MP province
    const mpMunQuery = `
      SELECT m.municipality_code, m.municipality_name, COUNT(mc.member_id) as member_count
      FROM municipalities m
      LEFT JOIN members_consolidated mc ON m.municipality_code = mc.municipality_code
      WHERE m.district_code IN (SELECT district_code FROM districts WHERE province_code = 'MP')
      GROUP BY m.municipality_code, m.municipality_name
      HAVING COUNT(mc.member_id) > 0
      ORDER BY member_count DESC
      LIMIT 10;
    `;
    const mpMunResult = await pool.query(mpMunQuery);
    console.log('\n📊 Top 10 municipalities in MP province with members:');
    console.table(mpMunResult.rows);

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkMunicipality();

