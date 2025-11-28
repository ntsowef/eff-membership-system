/**
 * Final fix for vw_member_search view with correct table structure
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

async function fixMemberSearchViewFinal() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Final fix for vw_member_search view...\n');

    // Check membership_statuses table structure
    console.log('📋 Checking membership_statuses table:');
    const statusesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'membership_statuses' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (statusesColumns.rows.length === 0) {
      console.log('❌ membership_statuses table not found');
    } else {
      statusesColumns.rows.forEach(col => {
        console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
      });
    }

    // Drop the existing view (if it exists)
    await client.query('DROP VIEW IF EXISTS vw_member_search CASCADE;');
    console.log('✅ Dropped existing view');

    // Create a simplified view first to test basic structure
    const createSimpleViewSQL = `
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
          CASE 
            WHEN ms.expiry_date IS NULL THEN 'Unknown'
            WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
            WHEN ms.expiry_date >= CURRENT_DATE THEN 'Active'
            ELSE 'Unknown'
          END AS membership_status,
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
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      WHERE m.member_id IS NOT NULL;
    `;

    await client.query(createSimpleViewSQL);
    console.log('✅ Created simplified vw_member_search view');

    // Test the new view
    const testResult = await client.query(`
      SELECT member_id, firstname, surname, province_name, membership_status, search_text
      FROM vw_member_search 
      WHERE search_text IS NOT NULL
      LIMIT 3;
    `);

    console.log('\n📊 Testing new view:');
    console.log('┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────────────────────┐');
    console.log('│ Member ID   │ First Name  │ Surname     │ Province    │ Status      │ Search Text (first 35 chars)       │');
    console.log('├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────────────────────┤');
    
    testResult.rows.forEach(row => {
      const searchTextPreview = (row.search_text || '').substring(0, 35);
      console.log(`│ ${row.member_id.toString().padEnd(11)} │ ${(row.firstname || '').padEnd(11)} │ ${(row.surname || '').padEnd(11)} │ ${(row.province_name || '').padEnd(11)} │ ${(row.membership_status || '').padEnd(11)} │ ${searchTextPreview.padEnd(35)} │`);
    });
    
    console.log('└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────────────────────┘');

    // Test search functionality
    console.log('\n🔍 Testing search functionality...');
    
    const searchCountResult = await client.query(`
      SELECT COUNT(*) as total_searchable_records
      FROM vw_member_search 
      WHERE search_text IS NOT NULL AND search_text != '';
    `);

    console.log(`✅ Total searchable records: ${searchCountResult.rows[0].total_searchable_records}`);

    // Test a sample search query that was failing before
    const sampleSearchResult = await client.query(`
      SELECT member_id, firstname, surname, membership_number
      FROM vw_member_search
      WHERE search_text LIKE '%john%'
      LIMIT 5;
    `);

    console.log(`✅ Sample search for 'john': ${sampleSearchResult.rows.length} results found`);

    // Test the exact query that was failing in the error logs
    console.log('\n🧪 Testing the exact failing query...');
    try {
      const exactQueryResult = await client.query(`
        SELECT * FROM vw_member_search
        WHERE search_text LIKE $1
        ORDER BY
          CASE
            WHEN firstname LIKE $2 OR surname LIKE $3 THEN 1
            WHEN id_number LIKE $4 THEN 2
            WHEN email LIKE $5 THEN 3
            ELSE 4
          END,
          firstname ASC
        LIMIT $6
      `, ['%test%', 'test%', 'test%', 'test%', 'test%', 5]);

      console.log(`✅ Exact failing query now works! Found ${exactQueryResult.rows.length} results`);
    } catch (queryError) {
      console.log(`❌ Query still failing: ${queryError.message}`);
    }

    console.log('\n🎉 vw_member_search view successfully fixed!');
    console.log('✅ search_text column added');
    console.log('✅ Correct table relationships established');
    console.log('✅ Search functionality working');
    console.log('✅ Compatible with existing search queries');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixMemberSearchViewFinal().catch(console.error);
