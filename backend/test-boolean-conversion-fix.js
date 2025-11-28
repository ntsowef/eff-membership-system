const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
});

async function testBooleanConversionFix() {
  console.log('🧪 Testing boolean conversion fix...\n');

  try {
    // Test the original failing query with boolean conversion
    console.log('1. Testing the original failing query with boolean conversion...');
    
    const originalQuery = `
      SELECT
        w.ward_code,
        w.ward_name,
        m.municipality_name,
        m.municipality_code,
        d.district_name,
        p.province_name,
        COUNT(mem.member_id) as member_count,
        COUNT(CASE WHEN mem.is_eligible_to_vote = true THEN 1 END) as active_members,
        ROUND(COUNT(CASE WHEN mem.is_eligible_to_vote = true THEN 1 END) * 100.0 / COUNT(mem.member_id), 2) as active_percentage
      FROM wards w
      LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN vw_member_details mem ON w.ward_code = mem.ward_code
      WHERE p.province_code = $1
      GROUP BY w.ward_code, w.ward_name, m.municipality_name, m.municipality_code, d.district_name, p.province_name
      HAVING COUNT(mem.member_id) > 0
      ORDER BY COUNT(mem.member_id) DESC, active_percentage DESC
      LIMIT $2
    `;

    const result = await pool.query(originalQuery, ['WC', 5]);
    console.log('✅ Query executed successfully with boolean = true!');
    console.log(`Result: Found ${result.rows.length} wards`);
    
    if (result.rows.length > 0) {
      console.log('\nTop wards in WC:');
      result.rows.forEach((ward, index) => {
        console.log(`${index + 1}. ${ward.ward_name} (${ward.ward_code}) - ${ward.member_count} members, ${ward.active_members} active (${ward.active_percentage}%)`);
      });
    }

    // Test the boolean conversion logic manually
    console.log('\n2. Testing boolean conversion logic...');
    
    const testQueries = [
      "SELECT * FROM table WHERE is_eligible_to_vote = 1",
      "SELECT * FROM table WHERE is_eligible_to_vote = 0", 
      "SELECT COUNT(CASE WHEN is_eligible_to_vote = 1 THEN 1 END) as active",
      "SELECT * WHERE is_active = 1 AND is_eligible_to_vote = 0"
    ];

    testQueries.forEach((query, index) => {
      // Manually apply the boolean conversion logic
      let converted = query;
      converted = converted.replace(/\bis_eligible_to_vote\s*=\s*1\b/gi, 'is_eligible_to_vote = true');
      converted = converted.replace(/\bis_eligible_to_vote\s*=\s*0\b/gi, 'is_eligible_to_vote = false');
      converted = converted.replace(/\bis_active\s*=\s*1\b/gi, 'is_active = true');
      converted = converted.replace(/\bis_active\s*=\s*0\b/gi, 'is_active = false');
      
      console.log(`\nTest ${index + 1}:`);
      console.log(`Original: ${query}`);
      console.log(`Converted: ${converted}`);
      
      if (!converted.includes('= 1') && !converted.includes('= 0')) {
        console.log('✅ Boolean conversion successful');
      } else {
        console.log('❌ Boolean conversion incomplete');
      }
    });

    // Test with different boolean fields
    console.log('\n3. Testing other boolean field conversions...');
    
    const booleanTestQuery = `
      SELECT 
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_count,
        COUNT(CASE WHEN is_deleted = false THEN 1 END) as not_deleted_count
      FROM vw_member_details 
      WHERE is_eligible_to_vote = true
      LIMIT 1
    `;

    const booleanResult = await pool.query(booleanTestQuery);
    console.log('✅ Boolean field query executed successfully!');
    console.log('Results:', booleanResult.rows[0]);

    // Test the specific failing query pattern
    console.log('\n4. Testing the specific failing query pattern...');
    
    const specificQuery = `
      SELECT COUNT(CASE WHEN mem.is_eligible_to_vote = true THEN 1 END) as active_members
      FROM vw_member_details mem
      WHERE mem.ward_code IN (SELECT ward_code FROM wards WHERE municipality_code LIKE 'CPT%')
      LIMIT 1
    `;

    const specificResult = await pool.query(specificQuery);
    console.log('✅ Specific query pattern executed successfully!');
    console.log(`Active members found: ${specificResult.rows[0].active_members}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testBooleanConversionFix().catch(console.error);
