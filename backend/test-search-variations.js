const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

async function testSearchVariations() {
  try {
    console.log('🔍 Testing search variations for "Leigh-Anne"...\n');

    // Test 1: Search for "Leigh"
    console.log('1️⃣ Searching for "Leigh"...');
    const leigh = await pool.query(`
      SELECT member_id, firstname, surname, province_code
      FROM members_consolidated
      WHERE firstname ILIKE '%Leigh%' OR surname ILIKE '%Leigh%'
      LIMIT 10;
    `);
    console.log(`   Found: ${leigh.rows.length} members`);
    if (leigh.rows.length > 0) {
      console.table(leigh.rows);
    }
    console.log('');

    // Test 2: Search for "Anne"
    console.log('2️⃣ Searching for "Anne"...');
    const anne = await pool.query(`
      SELECT member_id, firstname, surname, province_code
      FROM members_consolidated
      WHERE firstname ILIKE '%Anne%' OR surname ILIKE '%Anne%'
      LIMIT 10;
    `);
    console.log(`   Found: ${anne.rows.length} members`);
    if (anne.rows.length > 0) {
      console.table(anne.rows);
    }
    console.log('');

    // Test 3: Search for names with hyphens
    console.log('3️⃣ Searching for names with hyphens...');
    const hyphen = await pool.query(`
      SELECT member_id, firstname, surname, province_code
      FROM members_consolidated
      WHERE firstname LIKE '%-%' OR surname LIKE '%-%'
      LIMIT 10;
    `);
    console.log(`   Found: ${hyphen.rows.length} members`);
    if (hyphen.rows.length > 0) {
      console.table(hyphen.rows);
    }
    console.log('');

    // Test 4: Check how search_text is built in the view
    console.log('4️⃣ Checking search_text column in view...');
    const searchText = await pool.query(`
      SELECT member_id, firstname, surname, 
             LEFT(search_text, 100) as search_text_preview
      FROM vw_enhanced_member_search
      WHERE firstname ILIKE '%Leigh%'
      LIMIT 5;
    `);
    console.log(`   Found: ${searchText.rows.length} members with "Leigh" in firstname`);
    if (searchText.rows.length > 0) {
      console.table(searchText.rows);
    }
    console.log('');

    // Test 5: Check if search is case-sensitive
    console.log('5️⃣ Testing case variations...');
    const caseTest = await pool.query(`
      SELECT member_id, firstname, surname
      FROM members_consolidated
      WHERE firstname IN ('LEIGH-ANNE', 'Leigh-Anne', 'leigh-anne', 'LeighAnne', 'LEIGHANNE')
      LIMIT 10;
    `);
    console.log(`   Found: ${caseTest.rows.length} members`);
    if (caseTest.rows.length > 0) {
      console.table(caseTest.rows);
    }

    await pool.end();
    console.log('\n✅ Search variation tests complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testSearchVariations();

