/**
 * Check leadership_positions table schema
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function checkSchema() {
  await initializeDatabase();
  
  try {
    console.log('\n🔍 Checking leadership_positions Table Schema\n');
    console.log('='.repeat(80));
    
    // Get table columns
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'leadership_positions'
      ORDER BY ordinal_position;
    `;
    
    const columns = await executeQuery(columnsQuery);
    console.log('\n📋 leadership_positions Columns:');
    console.table(columns);
    
    // Check if structure_id exists
    const hasStructureId = columns.some((col: any) => col.column_name === 'structure_id');
    console.log(`\n${hasStructureId ? '✅' : '❌'} structure_id column ${hasStructureId ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    // Sample data
    console.log('\n📊 Sample War Council Positions:');
    const sampleQuery = `
      SELECT 
        id,
        position_name,
        position_code,
        hierarchy_level,
        province_code
      FROM leadership_positions
      WHERE id IN (1, 2, 3, 4, 5, 6, 17, 18, 19, 20)
      ORDER BY id
      LIMIT 10;
    `;
    
    const sample = await executeQuery(sampleQuery);
    console.table(sample);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSchema();

