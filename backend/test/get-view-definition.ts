/**
 * Get the actual definition of vw_war_council_structure view
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function getViewDefinition() {
  await initializeDatabase();
  
  try {
    console.log('\n🔍 Getting vw_war_council_structure View Definition\n');
    console.log('='.repeat(80));
    
    // Get view definition
    const query = `
      SELECT pg_get_viewdef('vw_war_council_structure', true) as view_definition;
    `;
    
    const result = await executeQuery(query);
    console.log('\n📋 View Definition:\n');
    console.log(result[0].view_definition);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

getViewDefinition();

