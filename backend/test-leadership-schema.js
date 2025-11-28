/**
 * Test to check leadership_elections table schema
 */

const { Pool } = require('pg');

async function testLeadershipSchema() {
  console.log('🔍 Testing leadership_elections table schema...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check if leadership_elections table exists and its columns
    console.log('\n1. Checking leadership_elections table structure...');
    
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'leadership_elections'
      ORDER BY ordinal_position
    `;
    
    const columns = await pool.query(schemaQuery);
    
    if (columns.rows.length === 0) {
      console.log('❌ leadership_elections table does not exist!');
      return;
    }
    
    console.log('✅ leadership_elections table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test 2: Check if position_id column exists
    const hasPositionId = columns.rows.some(col => col.column_name === 'position_id');
    console.log(`\n2. position_id column exists: ${hasPositionId ? '✅ YES' : '❌ NO'}`);
    
    if (!hasPositionId) {
      console.log('❌ ISSUE IDENTIFIED: leadership_elections table is missing position_id column!');
      
      // Check what columns are available that might be related
      const relatedColumns = columns.rows.filter(col => 
        col.column_name.includes('position') || 
        col.column_name.includes('id')
      );
      
      console.log('\nRelated columns found:');
      relatedColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Test 3: Check leadership_positions table
    console.log('\n3. Checking leadership_positions table structure...');
    
    const positionsSchemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'leadership_positions'
      ORDER BY ordinal_position
    `;
    
    const positionsColumns = await pool.query(positionsSchemaQuery);
    
    if (positionsColumns.rows.length === 0) {
      console.log('❌ leadership_positions table does not exist!');
    } else {
      console.log('✅ leadership_positions table columns:');
      positionsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Test 4: Try a simple query to see what data exists
    console.log('\n4. Testing simple queries...');
    
    try {
      const countQuery = 'SELECT COUNT(*) as count FROM leadership_elections';
      const countResult = await pool.query(countQuery);
      console.log(`✅ leadership_elections table has ${countResult.rows[0].count} records`);
      
      // Try to get a sample record
      const sampleQuery = 'SELECT * FROM leadership_elections LIMIT 1';
      const sampleResult = await pool.query(sampleQuery);
      
      if (sampleResult.rows.length > 0) {
        console.log('\n✅ Sample record from leadership_elections:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      } else {
        console.log('ℹ️ No records found in leadership_elections table');
      }
      
    } catch (error) {
      console.log(`❌ Error querying leadership_elections: ${error.message}`);
    }
    
    // Test 5: Check if there are any foreign key relationships
    console.log('\n5. Checking foreign key relationships...');
    
    const fkQuery = `
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'leadership_elections' OR ccu.table_name = 'leadership_elections')
    `;
    
    const fkResult = await pool.query(fkQuery);
    
    if (fkResult.rows.length > 0) {
      console.log('✅ Foreign key relationships:');
      fkResult.rows.forEach(fk => {
        console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('ℹ️ No foreign key relationships found for leadership_elections');
    }
    
    console.log('\n🎯 SCHEMA ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testLeadershipSchema();
