const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkDistrictCodes() {
  try {
    console.log('🔍 Comparing district_code between members_consolidated and vw_enhanced_member_search...\n');

    // Count by district in members_consolidated
    const consolidatedQuery = `
      SELECT district_code, COUNT(*) as member_count 
      FROM members_consolidated 
      GROUP BY district_code 
      ORDER BY district_code;
    `;
    const consolidatedResult = await pool.query(consolidatedQuery);
    console.log('📊 members_consolidated counts by district_code:');
    console.table(consolidatedResult.rows.slice(0, 20)); // Show first 20
    console.log('Total districts:', consolidatedResult.rows.length);
    console.log('Total members:', consolidatedResult.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0));
    console.log('');

    // Count by district in vw_enhanced_member_search
    const viewQuery = `
      SELECT district_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      GROUP BY district_code 
      ORDER BY district_code;
    `;
    const viewResult = await pool.query(viewQuery);
    console.log('📊 vw_enhanced_member_search counts by district_code:');
    console.table(viewResult.rows.slice(0, 20)); // Show first 20
    console.log('Total districts:', viewResult.rows.length);
    console.log('Total members:', viewResult.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0));
    console.log('');

    // Check how many members have NULL district_code
    const nullConsolidated = await pool.query('SELECT COUNT(*) FROM members_consolidated WHERE district_code IS NULL');
    const nullView = await pool.query('SELECT COUNT(*) FROM vw_enhanced_member_search WHERE district_code IS NULL');
    
    console.log('📊 NULL district_code counts:');
    console.log('members_consolidated:', nullConsolidated.rows[0].count);
    console.log('vw_enhanced_member_search:', nullView.rows[0].count);
    console.log('');

    // Sample members with district_code in consolidated but NULL in view
    const sampleQuery = `
      SELECT m.member_id, m.firstname, m.surname, 
             m.district_code as consolidated_district,
             m.municipality_code as consolidated_municipality,
             v.district_code as view_district,
             v.municipality_code as view_municipality
      FROM members_consolidated m
      LEFT JOIN vw_enhanced_member_search v ON m.member_id = v.member_id
      WHERE m.district_code IS NOT NULL 
        AND v.district_code IS NULL
      LIMIT 10;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.log('📊 Sample members with district_code in consolidated but NULL in view:');
    console.table(sampleResult.rows);

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDistrictCodes();

