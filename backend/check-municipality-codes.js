const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function checkMunicipalityCodes() {
  try {
    console.log('🔍 Checking municipality codes in members data...\n');

    // Check how many members have municipality_code
    const totalQuery = `
      SELECT 
        COUNT(*) as total_members,
        COUNT(municipality_code) as members_with_municipality,
        COUNT(*) - COUNT(municipality_code) as members_without_municipality
      FROM members_consolidated;
    `;
    const totalResult = await pool.query(totalQuery);
    console.log('📊 Municipality code coverage:');
    console.table(totalResult.rows);
    console.log('');

    // Get top 20 municipality codes by member count
    const topMunQuery = `
      SELECT municipality_code, COUNT(*) as member_count
      FROM members_consolidated
      WHERE municipality_code IS NOT NULL
      GROUP BY municipality_code
      ORDER BY member_count DESC
      LIMIT 20;
    `;
    const topMunResult = await pool.query(topMunQuery);
    console.log('📊 Top 20 municipality codes by member count:');
    console.table(topMunResult.rows);
    console.log('');

    // Check if these municipality codes exist in municipalities table
    if (topMunResult.rows.length > 0) {
      const sampleCode = topMunResult.rows[0].municipality_code;
      const checkQuery = `
        SELECT * FROM municipalities WHERE municipality_code = $1;
      `;
      const checkResult = await pool.query(checkQuery, [sampleCode]);
      console.log(`📊 Municipality ${sampleCode} in municipalities table:`);
      console.table(checkResult.rows);
    }

    await pool.end();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkMunicipalityCodes();

