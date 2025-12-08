const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkViewCounts() {
  try {
    console.log('🔍 Comparing counts between members_consolidated and vw_enhanced_member_search...\n');

    // Count by province in members_consolidated
    const consolidatedQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM members_consolidated 
      GROUP BY province_code 
      ORDER BY province_code;
    `;
    const consolidatedResult = await pool.query(consolidatedQuery);
    console.log('📊 members_consolidated counts by province:');
    console.table(consolidatedResult.rows);
    console.log('Total:', consolidatedResult.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0));
    console.log('');

    // Count by province in vw_enhanced_member_search
    const viewQuery = `
      SELECT province_code, COUNT(*) as member_count 
      FROM vw_enhanced_member_search 
      GROUP BY province_code 
      ORDER BY province_code;
    `;
    const viewResult = await pool.query(viewQuery);
    console.log('📊 vw_enhanced_member_search counts by province:');
    console.table(viewResult.rows);
    console.log('Total:', viewResult.rows.reduce((sum, row) => sum + parseInt(row.member_count), 0));
    console.log('');

    // Check total counts
    const totalConsolidated = await pool.query('SELECT COUNT(*) FROM members_consolidated');
    const totalView = await pool.query('SELECT COUNT(*) FROM vw_enhanced_member_search');
    
    console.log('📊 Total counts:');
    console.log('members_consolidated:', totalConsolidated.rows[0].count);
    console.log('vw_enhanced_member_search:', totalView.rows[0].count);
    console.log('Difference:', parseInt(totalConsolidated.rows[0].count) - parseInt(totalView.rows[0].count));

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkViewCounts();

