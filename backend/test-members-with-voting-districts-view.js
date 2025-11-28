/**
 * Test to check members_with_voting_districts view and create if missing
 */

const { Pool } = require('pg');

async function testMembersWithVotingDistrictsView() {
  console.log('🔍 Testing members_with_voting_districts view...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check if members_with_voting_districts view exists
    console.log('\n1. Checking if members_with_voting_districts view exists...');
    
    const viewCheckQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'members_with_voting_districts'
    `;
    
    const viewCheck = await pool.query(viewCheckQuery);
    const hasView = viewCheck.rows.length > 0;
    
    console.log(`members_with_voting_districts view exists: ${hasView ? '✅ YES' : '❌ NO'}`);
    
    if (!hasView) {
      console.log('❌ ISSUE IDENTIFIED: members_with_voting_districts view is missing!');
      
      // Test 2: Check available tables and existing member views
      console.log('\n2. Checking available member-related views...');
      
      const memberViewsQuery = `
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'VIEW'
          AND table_name LIKE '%member%'
        ORDER BY table_name
      `;
      
      const memberViews = await pool.query(memberViewsQuery);
      console.log('✅ Existing member-related views:');
      memberViews.rows.forEach(view => {
        console.log(`  - ${view.table_name} (${view.table_type})`);
      });
      
      // Test 3: Check members table structure
      console.log('\n3. Checking members table structure...');
      
      const membersStructureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'members'
        ORDER BY ordinal_position
        LIMIT 20
      `;
      
      const membersColumns = await pool.query(membersStructureQuery);
      console.log('✅ Members table columns (first 20):');
      membersColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Test 4: Check if we have the necessary tables for the view
      console.log('\n4. Checking required tables for view creation...');
      
      const requiredTables = ['members', 'voting_districts', 'wards', 'municipalities', 'districts', 'provinces'];
      
      for (const tableName of requiredTables) {
        const tableCheckQuery = `
          SELECT COUNT(*) as count
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name = $1
        `;
        
        const tableCheck = await pool.query(tableCheckQuery, [tableName]);
        const exists = tableCheck.rows[0].count > 0;
        console.log(`  - ${tableName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      }
      
      // Test 5: Create the missing view
      console.log('\n5. Creating members_with_voting_districts view...');
      
      const createViewQuery = `
        CREATE OR REPLACE VIEW members_with_voting_districts AS
        SELECT 
          -- Member identification
          m.member_id,
          CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0')) as membership_number,
          m.id_number,
          
          -- Member personal information
          m.firstname,
          COALESCE(m.surname, '') as surname,
          CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
          m.middle_name,
          m.date_of_birth,
          EXTRACT(YEAR FROM AGE(m.date_of_birth)) as age,
          
          -- Contact information
          m.cell_number,
          m.landline_number,
          m.alternative_contact,
          m.email,
          m.residential_address,
          m.postal_address,
          
          -- Membership information
          m.membership_type,
          m.member_created_at as membership_date,
          m.updated_at as last_updated,
          
          -- Voting location information
          m.voting_district_code,
          vd.voting_district_name,
          vd.voting_district_id as voting_district_number,
          m.voting_station_id,
          
          -- Geographic hierarchy
          m.ward_code,
          w.ward_name,
          w.ward_number,
          
          w.municipality_code,
          mu.municipality_name,
          
          mu.district_code,
          d.district_name,
          
          d.province_code,
          p.province_name,
          
          -- Full geographic hierarchy as text
          CONCAT(
            p.province_name, ' → ',
            d.district_name, ' → ',
            mu.municipality_name, ' → ',
            'Ward ', w.ward_number,
            CASE 
              WHEN vd.voting_district_name IS NOT NULL 
              THEN CONCAT(' → ', vd.voting_district_name)
              ELSE ''
            END
          ) as full_geographic_hierarchy,
          
          -- Search optimization fields
          LOWER(CONCAT(m.firstname, ' ', COALESCE(m.surname, ''))) as search_name,
          LOWER(m.voting_district_code) as search_voting_district_code,
          LOWER(vd.voting_district_name) as search_voting_district_name
          
        FROM members m
        
        -- Geographic joins (complete hierarchy)
        LEFT JOIN voting_districts vd ON REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') = REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '')
        LEFT JOIN wards w ON m.ward_code = w.ward_code
        LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
        LEFT JOIN districts d ON mu.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        
        ORDER BY m.firstname, COALESCE(m.surname, '')
      `;
      
      await pool.query(createViewQuery);
      console.log('✅ members_with_voting_districts view created successfully!');
      
      // Test 6: Verify the view works
      console.log('\n6. Testing the new view...');
      
      const testViewQuery = `
        SELECT 
          membership_number,
          full_name,
          voting_district_name,
          ward_name,
          municipality_name,
          province_name
        FROM members_with_voting_districts 
        WHERE full_name IS NOT NULL
        ORDER BY full_name
        LIMIT 5
      `;
      
      const testResult = await pool.query(testViewQuery);
      
      console.log(`✅ View test successful! Found ${testResult.rows.length} members`);
      
      if (testResult.rows.length > 0) {
        console.log('\nSample results:');
        testResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.full_name} (${row.membership_number})`);
          console.log(`      Location: ${row.voting_district_name || 'Unknown'}, ${row.ward_name || 'Unknown'}, ${row.municipality_name || 'Unknown'}`);
        });
      }
      
      // Test 7: Test the original failing query
      console.log('\n7. Testing the original failing query...');
      
      const originalQuery = `
        SELECT * FROM members_with_voting_districts 
        WHERE 1 = TRUE 
        ORDER BY full_name 
        LIMIT $1
      `;
      
      const originalResult = await pool.query(originalQuery, [100]);
      
      console.log(`✅ Original query test successful! Found ${originalResult.rows.length} members`);
      
      // Test 8: Test search functionality
      console.log('\n8. Testing search functionality...');
      
      const searchQuery = `
        SELECT 
          membership_number,
          full_name,
          id_number,
          voting_district_name,
          province_name
        FROM members_with_voting_districts 
        WHERE id_number LIKE $1 OR full_name ILIKE $2
        ORDER BY full_name
        LIMIT 10
      `;
      
      const searchResult = await pool.query(searchQuery, ['%750116%', '%750116%']);
      
      console.log(`✅ Search test successful! Found ${searchResult.rows.length} matching members`);
      
      if (searchResult.rows.length > 0) {
        console.log('\nSearch results:');
        searchResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.full_name} (${row.membership_number})`);
          console.log(`      ID: ${row.id_number}, Location: ${row.voting_district_name || 'Unknown'}`);
        });
      }
      
    } else {
      console.log('✅ View already exists, testing functionality...');
      
      const testQuery = `
        SELECT COUNT(*) as total_members
        FROM members_with_voting_districts
      `;
      
      const result = await pool.query(testQuery);
      console.log(`✅ View contains ${result.rows[0].total_members} members`);
    }
    
    console.log('\n🎯 MEMBERS WITH VOTING DISTRICTS VIEW TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testMembersWithVotingDistrictsView();
