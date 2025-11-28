/**
 * Test Parent Municipality Filtering
 * 
 * Tests if selecting a parent municipality (metro) includes members from sub-regions
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

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Test Parent Municipality Filtering                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Find a parent municipality with sub-regions
    console.log('1️⃣  Finding Parent Municipalities with Sub-Regions:\n');
    
    const parentMunicipalities = await client.query(`
      SELECT 
        m.municipality_id,
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        COUNT(sm.municipality_id) as subregion_count,
        SUM(CASE WHEN mem.member_id IS NOT NULL THEN 1 ELSE 0 END) as total_members_in_subregions
      FROM municipalities m
      LEFT JOIN municipalities sm ON sm.parent_municipality_id = m.municipality_id
      LEFT JOIN wards w ON w.municipality_code = sm.municipality_code
      LEFT JOIN members mem ON mem.ward_code = w.ward_code
      WHERE m.municipality_type = 'Metropolitan'
      GROUP BY m.municipality_id, m.municipality_code, m.municipality_name, m.municipality_type
      HAVING COUNT(sm.municipality_id) > 0
      ORDER BY total_members_in_subregions DESC
      LIMIT 5
    `);

    if (parentMunicipalities.rows.length === 0) {
      console.log('   No parent municipalities with sub-regions found\n');
      client.release();
      await pool.end();
      return;
    }

    console.log(`   Found ${parentMunicipalities.rows.length} parent municipalities:\n`);
    parentMunicipalities.rows.forEach(mu => {
      console.log(`   📍 ${mu.municipality_name} (${mu.municipality_code})`);
      console.log(`      Sub-regions: ${mu.subregion_count}`);
      console.log(`      Total members in sub-regions: ${mu.total_members_in_subregions}`);
      console.log('');
    });

    // Test with the first parent municipality
    const testParent = parentMunicipalities.rows[0];
    console.log('═'.repeat(60));
    console.log(`2️⃣  Testing with: ${testParent.municipality_name}`);
    console.log('═'.repeat(60));
    console.log('');

    // Get sub-regions
    const subregions = await client.query(`
      SELECT
        mu.municipality_code,
        mu.municipality_name,
        COUNT(DISTINCT m.member_id) as member_count
      FROM municipalities mu
      LEFT JOIN wards w ON w.municipality_code = mu.municipality_code
      LEFT JOIN members m ON m.ward_code = w.ward_code
      WHERE mu.parent_municipality_id = $1
      GROUP BY mu.municipality_code, mu.municipality_name
      ORDER BY member_count DESC
    `, [testParent.municipality_id]);

    console.log(`   Sub-regions (${subregions.rows.length}):\n`);
    let totalExpectedMembers = 0;
    subregions.rows.forEach(sr => {
      console.log(`      - ${sr.municipality_name}: ${sr.member_count} members`);
      totalExpectedMembers += parseInt(sr.member_count);
    });
    console.log(`\n   Total expected members: ${totalExpectedMembers}\n`);

    // Test current logic (BROKEN for parent municipalities)
    console.log('3️⃣  Current Logic (Simple Equality):\n');
    
    const currentLogicQuery = `
      SELECT COUNT(*) as count
      FROM vw_member_details m
      WHERE m.municipality_code = (
        SELECT municipality_code 
        FROM municipalities 
        WHERE municipality_id = $1
      )
    `;
    
    const currentResult = await client.query(currentLogicQuery, [testParent.municipality_id]);
    console.log(`   Result: ${currentResult.rows[0].count} members`);
    console.log(`   Expected: ${totalExpectedMembers} members`);
    
    if (parseInt(currentResult.rows[0].count) < totalExpectedMembers) {
      console.log(`   ❌ MISSING: ${totalExpectedMembers - parseInt(currentResult.rows[0].count)} members!\n`);
    } else {
      console.log(`   ✅ Correct count\n`);
    }

    // Test fixed logic (CORRECT - includes sub-regions)
    console.log('4️⃣  Fixed Logic (Includes Sub-Regions):\n');
    
    const fixedLogicQuery = `
      SELECT COUNT(*) as count
      FROM vw_member_details m
      WHERE m.municipality_code IN (
        -- Include the selected municipality itself
        SELECT municipality_code FROM municipalities WHERE municipality_id = $1
        UNION
        -- Include all sub-regions if this is a parent municipality
        SELECT municipality_code FROM municipalities WHERE parent_municipality_id = $1
      )
    `;
    
    const fixedResult = await client.query(fixedLogicQuery, [testParent.municipality_id]);
    console.log(`   Result: ${fixedResult.rows[0].count} members`);
    console.log(`   Expected: ${totalExpectedMembers} members`);
    
    if (parseInt(fixedResult.rows[0].count) >= totalExpectedMembers) {
      console.log(`   ✅ Correct! Includes all sub-region members\n`);
    } else {
      console.log(`   ⚠️  Still missing some members\n`);
    }

    // Show the difference
    console.log('═'.repeat(60));
    console.log('COMPARISON');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Current Logic: ${currentResult.rows[0].count} members`);
    console.log(`Fixed Logic:   ${fixedResult.rows[0].count} members`);
    console.log(`Difference:    ${parseInt(fixedResult.rows[0].count) - parseInt(currentResult.rows[0].count)} members`);
    console.log('');
    
    if (parseInt(fixedResult.rows[0].count) > parseInt(currentResult.rows[0].count)) {
      console.log('❌ ISSUE CONFIRMED!');
      console.log('');
      console.log('When selecting a parent municipality (metro), the current logic');
      console.log('DOES NOT include members from sub-regions.');
      console.log('');
      console.log(`Missing ${parseInt(fixedResult.rows[0].count) - parseInt(currentResult.rows[0].count)} members from sub-regions!`);
    } else {
      console.log('✅ No issue found with this parent municipality');
    }
    console.log('');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

test();

