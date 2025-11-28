/**
 * Test to check voting districts views and create missing ones
 */

const { Pool } = require('pg');

async function testVotingDistrictsViews() {
  console.log('🔍 Testing voting districts views...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check what voting-related views exist
    console.log('\n1. Checking existing voting-related views...');
    
    const viewsQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%voting%' OR table_name LIKE '%district%')
        AND table_type = 'VIEW'
      ORDER BY table_name
    `;
    
    const views = await pool.query(viewsQuery);
    console.log('✅ Existing voting-related views:');
    views.rows.forEach(view => {
      console.log(`  - ${view.table_name} (${view.table_type})`);
    });
    
    // Test 2: Check if voting_districts_with_members view exists
    const missingView = 'voting_districts_with_members';
    const hasView = views.rows.some(view => view.table_name === missingView);
    
    console.log(`\n2. ${missingView} view exists: ${hasView ? '✅ YES' : '❌ NO'}`);
    
    if (!hasView) {
      console.log(`❌ ISSUE IDENTIFIED: ${missingView} view is missing!`);
      
      // Test 3: Check what tables we have to create the view
      console.log('\n3. Checking available tables for view creation...');
      
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND (table_name LIKE '%voting%' OR table_name LIKE '%member%' OR table_name LIKE '%district%')
        ORDER BY table_name
      `;
      
      const tables = await pool.query(tablesQuery);
      console.log('✅ Available tables:');
      tables.rows.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      // Test 4: Check voting_districts table structure
      console.log('\n4. Checking voting_districts table structure...');
      
      const vdStructureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'voting_districts'
        ORDER BY ordinal_position
      `;
      
      const vdColumns = await pool.query(vdStructureQuery);
      console.log('✅ voting_districts columns:');
      vdColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Test 5: Check members table for voting district relationship
      console.log('\n5. Checking members table voting district columns...');
      
      const membersVotingQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'members'
          AND column_name LIKE '%voting%'
        ORDER BY ordinal_position
      `;
      
      const membersVotingColumns = await pool.query(membersVotingQuery);
      console.log('✅ Members voting-related columns:');
      membersVotingColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Test 6: Create the missing view
      console.log('\n6. Creating voting_districts_with_members view...');
      
      const createViewQuery = `
        CREATE OR REPLACE VIEW voting_districts_with_members AS
        SELECT 
          vd.voting_district_id,
          vd.voting_district_code,
          vd.voting_district_name,
          vd.voting_district_id as voting_district_number,
          vd.ward_code,
          vd.population,
          vd.registered_voters,
          vd.is_active,
          vd.created_at,
          vd.updated_at,
          COUNT(m.member_id) as member_count,
          COUNT(CASE WHEN m.membership_type = 'Active' THEN 1 END) as active_members,
          COUNT(CASE WHEN m.membership_type = 'Expired' THEN 1 END) as expired_members,
          COUNT(CASE WHEN m.membership_type = 'Pending' THEN 1 END) as pending_members
        FROM voting_districts vd
        LEFT JOIN members m ON REPLACE(CAST(vd.voting_district_code AS TEXT), '.0', '') = REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '')
        WHERE vd.is_active = true
        GROUP BY 
          vd.voting_district_id,
          vd.voting_district_code,
          vd.voting_district_name,
          vd.ward_code,
          vd.population,
          vd.registered_voters,
          vd.is_active,
          vd.created_at,
          vd.updated_at
        ORDER BY vd.voting_district_id
      `;
      
      await pool.query(createViewQuery);
      console.log('✅ voting_districts_with_members view created successfully!');
      
      // Test 7: Verify the view works
      console.log('\n7. Testing the new view...');
      
      const testViewQuery = `
        SELECT 
          voting_district_code,
          voting_district_name,
          voting_district_number,
          member_count,
          active_members,
          expired_members
        FROM voting_districts_with_members 
        WHERE ward_code = $1
        ORDER BY member_count DESC, voting_district_number
        LIMIT 5
      `;
      
      const testResult = await pool.query(testViewQuery, ['10104009']);
      
      console.log(`✅ View test successful! Found ${testResult.rows.length} voting districts for ward 10104009`);
      
      if (testResult.rows.length > 0) {
        console.log('\nSample results:');
        testResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.voting_district_name} (${row.voting_district_code}) - ${row.member_count} members`);
        });
      } else {
        console.log('ℹ️ No voting districts found for ward 10104009 (might be expected)');
      }
      
    } else {
      console.log('✅ View already exists, testing functionality...');
      
      const testQuery = `
        SELECT 
          voting_district_code,
          voting_district_name,
          voting_district_number,
          member_count
        FROM voting_districts_with_members 
        WHERE ward_code = $1
        ORDER BY member_count DESC, voting_district_number
        LIMIT 5
      `;
      
      const result = await pool.query(testQuery, ['10104009']);
      console.log(`✅ View test successful! Found ${result.rows.length} results`);
    }
    
    console.log('\n🎯 VOTING DISTRICTS VIEWS TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testVotingDistrictsViews();
