/**
 * Check if vw_war_council_structure view exists and works
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function checkView() {
  await initializeDatabase();
  
  try {
    console.log('\n🔍 Checking vw_war_council_structure View\n');
    console.log('='.repeat(80));
    
    // Check if view exists
    const viewExistsQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_name = 'vw_war_council_structure'
      ) as view_exists;
    `;
    
    const viewExists = await executeQuery(viewExistsQuery);
    console.log('\n📋 View Exists:', viewExists[0].view_exists);
    
    if (viewExists[0].view_exists) {
      console.log('\n⚠️ View exists but may have broken query. Attempting to query it...\n');
      
      try {
        const testQuery = `SELECT * FROM vw_war_council_structure LIMIT 1;`;
        const result = await executeQuery(testQuery);
        console.log('✅ View query successful!');
        console.table(result);
      } catch (error: any) {
        console.error('❌ View query failed:', error.message);
        console.log('\n💡 The view needs to be dropped or recreated without structure_id references.');
      }
    } else {
      console.log('✅ View does not exist - no issue here.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkView();

