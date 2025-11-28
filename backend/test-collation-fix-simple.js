const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testCollationFixSimple() {
  console.log('🧪 Testing MySQL COLLATE clause conversion with direct database query...\n');

  try {
    // Test the original failing query directly with PostgreSQL
    console.log('1. Testing original failing query with COLLATE clause removed...');
    
    const originalQuery = `
      SELECT COUNT(*) as total_count
      FROM vw_ward_membership_audit
      WHERE ward_standing = $1 AND province_code = $2 AND (ward_name LIKE $3 OR municipality_name LIKE $4)
    `;

    // Use a valid province code from our data
    const testParams = ['Needs Improvement', 'GP', '%64%', '%64%'];
    
    const result = await pool.query(originalQuery, testParams);
    console.log('✅ Query executed successfully!');
    console.log(`Result: Found ${result.rows[0].total_count} wards`);

    // Test with different ward standings
    console.log('\n2. Testing with different ward standings...');
    
    const standings = ['Good Standing', 'Acceptable Standing', 'Needs Improvement'];
    
    for (const standing of standings) {
      const standingResult = await pool.query(originalQuery, [standing, 'GP', '%64%', '%64%']);
      console.log(`✅ ${standing}: ${standingResult.rows[0].total_count} wards`);
    }

    // Test a simpler query to verify ward standings exist
    console.log('\n3. Testing ward standings distribution...');
    const distributionQuery = `
      SELECT ward_standing, COUNT(*) as count
      FROM vw_ward_membership_audit
      WHERE province_code = $1
      GROUP BY ward_standing
      ORDER BY count DESC;
    `;

    const distributionResult = await pool.query(distributionQuery, ['GP']);
    console.log('Ward standings distribution in GP:');
    console.table(distributionResult.rows);

    // Test the collation conversion logic manually
    console.log('\n4. Testing collation conversion logic...');
    
    const testQueries = [
      "SELECT * FROM table WHERE column COLLATE utf8mb4_unicode_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8mb4_general_ci = 'value'",
      "SELECT * FROM table WHERE column COLLATE utf8_unicode_ci = 'value'"
    ];

    testQueries.forEach((query, index) => {
      // Manually apply the collation removal logic
      let converted = query;
      converted = converted.replace(/\s+COLLATE\s+utf8mb4_unicode_ci\b/gi, '');
      converted = converted.replace(/\s+COLLATE\s+utf8mb4_general_ci\b/gi, '');
      converted = converted.replace(/\s+COLLATE\s+utf8_unicode_ci\b/gi, '');
      converted = converted.replace(/\s+COLLATE\s+[a-zA-Z0-9_]+_ci\b/gi, '');
      
      console.log(`\nTest ${index + 1}:`);
      console.log(`Original: ${query}`);
      console.log(`Converted: ${converted}`);
      
      if (!converted.includes('COLLATE')) {
        console.log('✅ Collation successfully removed');
      } else {
        console.log('❌ Collation still present');
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testCollationFixSimple().catch(console.error);
