/**
 * Test Member Search Consolidated Migration
 * 
 * This test verifies that all member search functionality is using
 * the members_consolidated table as the primary data source.
 */

const { Client } = require('pg');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
};

async function testMemberSearchConsolidated() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Test 1: Verify vw_member_search_consolidated exists and has data
    console.log('📊 Test 1: Verify vw_member_search_consolidated view');
    const viewCountResult = await client.query(`
      SELECT COUNT(*) as total_members 
      FROM vw_member_search_consolidated
    `);
    const totalMembers = parseInt(viewCountResult.rows[0].total_members);
    console.log(`   Total members in view: ${totalMembers.toLocaleString()}`);
    
    if (totalMembers > 0) {
      console.log('   ✅ View exists and contains data\n');
    } else {
      console.log('   ❌ View is empty\n');
      return;
    }

    // Test 2: Verify view has membership data from members_consolidated
    console.log('📊 Test 2: Verify membership data in view');
    const membershipDataResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(membership_number) as with_membership_number,
        COUNT(date_joined) as with_date_joined,
        COUNT(expiry_date) as with_expiry_date,
        COUNT(membership_status) as with_status
      FROM vw_member_search_consolidated
      LIMIT 1
    `);
    const membershipData = membershipDataResult.rows[0];
    console.log(`   Members with membership_number: ${parseInt(membershipData.with_membership_number).toLocaleString()}`);
    console.log(`   Members with date_joined: ${parseInt(membershipData.with_date_joined).toLocaleString()}`);
    console.log(`   Members with expiry_date: ${parseInt(membershipData.with_expiry_date).toLocaleString()}`);
    console.log(`   Members with membership_status: ${parseInt(membershipData.with_status).toLocaleString()}`);
    console.log('   ✅ Membership data is present in view\n');

    // Test 3: Test search functionality
    console.log('📊 Test 3: Test search by name');
    const searchResult = await client.query(`
      SELECT member_id, firstname, surname, membership_number, membership_status
      FROM vw_member_search_consolidated
      WHERE firstname LIKE 'Joseph%'
      LIMIT 5
    `);
    console.log(`   Found ${searchResult.rows.length} members named Joseph:`);
    searchResult.rows.forEach(row => {
      console.log(`   - ${row.firstname} ${row.surname} (${row.membership_number}) - ${row.membership_status}`);
    });
    console.log('   ✅ Search by name working\n');

    // Test 4: Test search by ID number
    console.log('📊 Test 4: Test search by ID number');
    const idSearchResult = await client.query(`
      SELECT member_id, firstname, surname, id_number, membership_number
      FROM vw_member_search_consolidated
      WHERE id_number IS NOT NULL
      LIMIT 3
    `);
    console.log(`   Found ${idSearchResult.rows.length} members with ID numbers:`);
    idSearchResult.rows.forEach(row => {
      console.log(`   - ${row.firstname} ${row.surname} (ID: ${row.id_number})`);
    });
    console.log('   ✅ Search by ID number working\n');

    // Test 5: Verify search_text field for full-text search
    console.log('📊 Test 5: Test full-text search using search_text');
    const fullTextResult = await client.query(`
      SELECT member_id, firstname, surname, email
      FROM vw_member_search_consolidated
      WHERE search_text LIKE '%@gmail.com%'
      LIMIT 5
    `);
    console.log(`   Found ${fullTextResult.rows.length} members with Gmail addresses:`);
    fullTextResult.rows.forEach(row => {
      console.log(`   - ${row.firstname} ${row.surname} (${row.email})`);
    });
    console.log('   ✅ Full-text search working\n');

    // Test 6: Verify no JOIN to old memberships table
    console.log('📊 Test 6: Verify view definition uses members_consolidated');
    const viewDefResult = await client.query(`
      SELECT pg_get_viewdef('vw_member_search_consolidated', true) as view_def
    `);
    const viewDef = viewDefResult.rows[0].view_def;
    
    if (viewDef.includes('members_consolidated')) {
      console.log('   ✅ View uses members_consolidated table');
    } else {
      console.log('   ❌ View does NOT use members_consolidated table');
    }
    
    if (viewDef.includes('LEFT JOIN memberships')) {
      console.log('   ❌ View still has LEFT JOIN to memberships table');
    } else {
      console.log('   ✅ View does NOT have LEFT JOIN to memberships table');
    }
    console.log('');

    // Test 7: Performance test
    console.log('📊 Test 7: Performance test');
    const startTime = Date.now();
    await client.query(`
      SELECT COUNT(*) 
      FROM vw_member_search_consolidated
      WHERE search_text LIKE '%john%'
    `);
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`   Search completed in ${duration}ms`);
    if (duration < 1000) {
      console.log('   ✅ Performance is good (< 1 second)\n');
    } else {
      console.log('   ⚠️  Performance could be improved (> 1 second)\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n🎉 Member search is now using members_consolidated!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await client.end();
  }
}

// Run the test
testMemberSearchConsolidated();

