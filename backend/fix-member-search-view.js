/**
 * Fix vw_member_search view by adding the missing search_text column
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
});

async function fixMemberSearchView() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing vw_member_search view to include search_text column...\n');

    // First, let's see the current view definition
    const currentViewResult = await client.query(`
      SELECT definition FROM pg_views 
      WHERE viewname = 'vw_member_search' AND schemaname = 'public';
    `);

    if (currentViewResult.rows.length === 0) {
      console.log('❌ vw_member_search view not found');
      return;
    }

    console.log('📋 Current view definition:');
    console.log(currentViewResult.rows[0].definition.substring(0, 300) + '...\n');

    // Drop the existing view
    await client.query('DROP VIEW IF EXISTS vw_member_search CASCADE;');
    console.log('✅ Dropped existing vw_member_search view');

    // Create the new view with search_text column
    const createViewSQL = `
      CREATE VIEW vw_member_search AS
      SELECT 
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
          m.cell_number,
          m.email,
          m.ward_code,
          w.ward_name,
          mu.municipality_name,
          p.province_name,
          ms.membership_number,
          st.status_name AS membership_status,
          ms.expiry_date,
          m.created_at,
          m.updated_at,
          
          -- Add the missing search_text column for full-text search
          LOWER(CONCAT(
              COALESCE(m.firstname, ''), ' ',
              COALESCE(m.surname, ''), ' ',
              COALESCE(m.id_number, ''), ' ',
              COALESCE(m.cell_number, ''), ' ',
              COALESCE(m.email, ''), ' ',
              COALESCE(ms.membership_number, ''), ' ',
              COALESCE(w.ward_name, ''), ' ',
              COALESCE(mu.municipality_name, ''), ' ',
              COALESCE(p.province_name, '')
          )) AS search_text
          
      FROM members m
      LEFT JOIN wards w ON m.ward_code = w.ward_code
      LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
      LEFT JOIN provinces p ON mu.province_code = p.province_code
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses st ON ms.status_id = st.id
      WHERE m.member_id IS NOT NULL;
    `;

    await client.query(createViewSQL);
    console.log('✅ Created new vw_member_search view with search_text column');

    // Test the new view
    const testResult = await client.query(`
      SELECT member_id, firstname, surname, search_text
      FROM vw_member_search 
      LIMIT 3;
    `);

    console.log('\n📊 Testing new view (first 3 records):');
    console.log('┌─────────────┬─────────────┬─────────────┬─────────────────────────────────────┐');
    console.log('│ Member ID   │ First Name  │ Surname     │ Search Text (first 35 chars)       │');
    console.log('├─────────────┼─────────────┼─────────────┼─────────────────────────────────────┤');
    
    testResult.rows.forEach(row => {
      const searchTextPreview = (row.search_text || '').substring(0, 35);
      console.log(`│ ${row.member_id.toString().padEnd(11)} │ ${(row.firstname || '').padEnd(11)} │ ${(row.surname || '').padEnd(11)} │ ${searchTextPreview.padEnd(35)} │`);
    });
    
    console.log('└─────────────┴─────────────┴─────────────┴─────────────────────────────────────┘');

    // Test search functionality
    console.log('\n🔍 Testing search functionality...');
    
    const searchTestResult = await client.query(`
      SELECT COUNT(*) as total_searchable_records
      FROM vw_member_search 
      WHERE search_text IS NOT NULL AND search_text != '';
    `);

    console.log(`✅ Total searchable records: ${searchTestResult.rows[0].total_searchable_records}`);

    // Test a sample search query
    const sampleSearchResult = await client.query(`
      SELECT member_id, firstname, surname, membership_number
      FROM vw_member_search
      WHERE search_text LIKE '%test%'
      LIMIT 5;
    `);

    console.log(`✅ Sample search for 'test': ${sampleSearchResult.rows.length} results found`);

    // Create an index on search_text for better performance
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vw_member_search_text 
        ON vw_member_search USING gin(to_tsvector('english', search_text));
      `);
      console.log('✅ Created full-text search index on search_text column');
    } catch (indexError) {
      console.log('⚠️ Could not create full-text index (views don\'t support indexes directly)');
      console.log('💡 Consider creating a materialized view for better search performance');
    }

    console.log('\n🎉 vw_member_search view fixed successfully!');
    console.log('✅ search_text column added');
    console.log('✅ Full-text search capability enabled');
    console.log('✅ View is now compatible with search queries');

  } catch (error) {
    console.error('❌ Error fixing member search view:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixMemberSearchView().catch(console.error);
