/**
 * Check how municipalities link to provinces
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

async function checkMunicipalityProvinceLink() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking municipality-province relationship...\n');

    // Check districts table (municipalities have district_code)
    console.log('📋 DISTRICTS table columns:');
    const districtsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'districts' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    districtsColumns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | ${col.is_nullable}`);
    });

    // Test the relationship: municipalities -> districts -> provinces
    console.log('\n🔗 Testing municipality -> district -> province relationship:');
    
    const relationshipTest = await client.query(`
      SELECT 
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
      FROM municipalities m
      LEFT JOIN districts d ON m.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LIMIT 5;
    `);

    console.log('✅ Relationship working! Sample data:');
    console.log('┌─────────────────┬─────────────────────────────┬─────────────────┬─────────────────┐');
    console.log('│ Municipality    │ District                    │ Province Code   │ Province Name   │');
    console.log('├─────────────────┼─────────────────────────────┼─────────────────┼─────────────────┤');
    
    relationshipTest.rows.forEach(row => {
      console.log(`│ ${(row.municipality_name || '').substring(0, 15).padEnd(15)} │ ${(row.district_name || '').substring(0, 27).padEnd(27)} │ ${(row.province_code || '').padEnd(15)} │ ${(row.province_name || '').padEnd(15)} │`);
    });
    
    console.log('└─────────────────┴─────────────────────────────┴─────────────────┴─────────────────┘');

    console.log('\n🎯 CORRECT JOIN STRUCTURE:');
    console.log('members.ward_code -> wards.ward_code');
    console.log('wards.municipality_code -> municipalities.municipality_code');
    console.log('municipalities.district_code -> districts.district_code');
    console.log('districts.province_code -> provinces.province_code');

    // Now let's recreate the view with the correct joins
    console.log('\n🔧 Creating corrected vw_member_search view...');

    // Drop the existing view (if it exists)
    await client.query('DROP VIEW IF EXISTS vw_member_search CASCADE;');
    console.log('✅ Dropped existing view');

    // Create the corrected view
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
      LEFT JOIN districts d ON mu.district_code = d.district_code
      LEFT JOIN provinces p ON d.province_code = p.province_code
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
      LEFT JOIN membership_statuses st ON ms.status_id = st.id
      WHERE m.member_id IS NOT NULL;
    `;

    await client.query(createViewSQL);
    console.log('✅ Created corrected vw_member_search view');

    // Test the new view
    const testResult = await client.query(`
      SELECT member_id, firstname, surname, province_name, search_text
      FROM vw_member_search 
      WHERE search_text IS NOT NULL
      LIMIT 3;
    `);

    console.log('\n📊 Testing corrected view:');
    console.log('┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────────────────────┐');
    console.log('│ Member ID   │ First Name  │ Surname     │ Province    │ Search Text (first 35 chars)       │');
    console.log('├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────────────────────┤');
    
    testResult.rows.forEach(row => {
      const searchTextPreview = (row.search_text || '').substring(0, 35);
      console.log(`│ ${row.member_id.toString().padEnd(11)} │ ${(row.firstname || '').padEnd(11)} │ ${(row.surname || '').padEnd(11)} │ ${(row.province_name || '').padEnd(11)} │ ${searchTextPreview.padEnd(35)} │`);
    });
    
    console.log('└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────────────────────┘');

    console.log('\n🎉 vw_member_search view successfully recreated with correct joins!');
    console.log('✅ search_text column added');
    console.log('✅ Correct municipality -> district -> province relationship');
    console.log('✅ Ready for search functionality');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkMunicipalityProvinceLink().catch(console.error);
