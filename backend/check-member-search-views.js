/**
 * Check for member search related views and tables
 */

const { Pool } = require('pg');

async function checkMemberSearchViews() {
  console.log('🔍 Checking member search views and tables...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Check if vw_enhanced_member_search view exists
    const viewExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_enhanced_member_search'
      );
    `;
    
    const viewExists = await pool.query(viewExistsQuery);
    console.log('vw_enhanced_member_search view exists:', viewExists.rows[0].exists);
    
    if (!viewExists.rows[0].exists) {
      console.log('\n❌ vw_enhanced_member_search view does not exist!');
      
      // Check what member-related views do exist
      const memberViewsQuery = `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%member%'
        ORDER BY table_name;
      `;
      
      const memberViews = await pool.query(memberViewsQuery);
      console.log('\n📋 Member-related views found:');
      if (memberViews.rows.length > 0) {
        memberViews.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        console.log('  No member-related views found');
      }
      
      // Check what search-related views exist
      const searchViewsQuery = `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%search%'
        ORDER BY table_name;
      `;
      
      const searchViews = await pool.query(searchViewsQuery);
      console.log('\n📋 Search-related views found:');
      if (searchViews.rows.length > 0) {
        searchViews.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        console.log('  No search-related views found');
      }
      
      // Check if we have vw_member_details or similar
      const memberDetailsQuery = `
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'vw_member%' OR table_name LIKE '%member_details%')
        ORDER BY table_name;
      `;
      
      const memberDetailsViews = await pool.query(memberDetailsQuery);
      console.log('\n📋 Member details views found:');
      if (memberDetailsViews.rows.length > 0) {
        memberDetailsViews.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
        
        // Test the first available view
        const firstView = memberDetailsViews.rows[0].table_name;
        console.log(`\n🔧 Testing ${firstView} as alternative...`);
        try {
          const testQuery = `SELECT COUNT(*) as count FROM ${firstView} WHERE 1=1`;
          const result = await pool.query(testQuery);
          console.log(`✅ ${firstView} works! Count: ${result.rows[0].count}`);
          
          // Get structure of this view
          const structureQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${firstView}'
            ORDER BY ordinal_position
            LIMIT 10;
          `;
          
          const structure = await pool.query(structureQuery);
          console.log(`\n📋 ${firstView} structure (first 10 columns):`);
          structure.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
          });
          
        } catch (error) {
          console.log(`❌ ${firstView} failed: ${error.message}`);
        }
      } else {
        console.log('  No member details views found');
        
        // Check if members table exists as fallback
        console.log('\n🔧 Testing members table as fallback...');
        try {
          const membersQuery = `SELECT COUNT(*) as count FROM members WHERE 1=1`;
          const result = await pool.query(membersQuery);
          console.log(`✅ members table works! Count: ${result.rows[0].count}`);
        } catch (error) {
          console.log(`❌ members table failed: ${error.message}`);
        }
      }
      
      console.log('\n💡 SOLUTION OPTIONS:');
      console.log('1. Create vw_enhanced_member_search view');
      console.log('2. Update queries to use existing views (vw_member_details, etc.)');
      console.log('3. Use members table directly with appropriate JOINs');
      
    } else {
      // Get view definition
      const definitionQuery = `
        SELECT view_definition
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_enhanced_member_search';
      `;
      
      const definition = await pool.query(definitionQuery);
      console.log('\n📋 vw_enhanced_member_search view definition:');
      console.log(definition.rows[0].view_definition);
    }
    
  } catch (error) {
    console.error('❌ Error checking member search views:', error.message);
  } finally {
    await pool.end();
  }
}

checkMemberSearchViews();
