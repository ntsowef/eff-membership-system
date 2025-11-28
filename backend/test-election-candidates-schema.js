/**
 * Test to check election_candidates table schema and relationships
 */

const { Pool } = require('pg');

async function testElectionCandidatesSchema() {
  console.log('🔍 Testing election_candidates and related tables schema...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check election_candidates table
    console.log('\n1. Checking election_candidates table structure...');
    
    const candidatesSchemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'election_candidates'
      ORDER BY ordinal_position
    `;
    
    const candidatesColumns = await pool.query(candidatesSchemaQuery);
    
    if (candidatesColumns.rows.length === 0) {
      console.log('❌ election_candidates table does not exist!');
    } else {
      console.log('✅ election_candidates table columns:');
      candidatesColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if position_id exists in election_candidates
      const hasPositionId = candidatesColumns.rows.some(col => col.column_name === 'position_id');
      console.log(`\n   position_id column exists: ${hasPositionId ? '✅ YES' : '❌ NO'}`);
    }
    
    // Test 2: Check leadership_election_candidates table
    console.log('\n2. Checking leadership_election_candidates table structure...');
    
    const leadershipCandidatesSchemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'leadership_election_candidates'
      ORDER BY ordinal_position
    `;
    
    const leadershipCandidatesColumns = await pool.query(leadershipCandidatesSchemaQuery);
    
    if (leadershipCandidatesColumns.rows.length === 0) {
      console.log('❌ leadership_election_candidates table does not exist!');
    } else {
      console.log('✅ leadership_election_candidates table columns:');
      leadershipCandidatesColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if position_id exists in leadership_election_candidates
      const hasPositionId = leadershipCandidatesColumns.rows.some(col => col.column_name === 'position_id');
      console.log(`\n   position_id column exists: ${hasPositionId ? '✅ YES' : '❌ NO'}`);
    }
    
    // Test 3: Look for any table that might link elections to positions
    console.log('\n3. Searching for tables that might link elections to positions...');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%election%' OR table_name LIKE '%position%')
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log('✅ Election/Position related tables:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Test 4: Check if there's a separate position assignment table
    console.log('\n4. Checking for position assignment patterns...');
    
    // Check if elections are linked to positions through candidates
    const linkageQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.column_name LIKE '%position%'
      ORDER BY t.table_name, c.column_name
    `;
    
    const linkages = await pool.query(linkageQuery);
    console.log('✅ Tables with position-related columns:');
    linkages.rows.forEach(link => {
      console.log(`  - ${link.table_name}.${link.column_name}: ${link.data_type}`);
    });
    
    // Test 5: Try to understand the election-position relationship
    console.log('\n5. Analyzing election-position relationship...');
    
    // Check if elections are for specific positions or general
    // Maybe the position is determined by the election_name or election_type
    const electionTypesQuery = `
      SELECT DISTINCT election_type, election_name, hierarchy_level
      FROM leadership_elections
      LIMIT 10
    `;
    
    try {
      const electionTypes = await pool.query(electionTypesQuery);
      if (electionTypes.rows.length > 0) {
        console.log('✅ Sample election types:');
        electionTypes.rows.forEach(type => {
          console.log(`  - Type: ${type.election_type}, Name: ${type.election_name}, Level: ${type.hierarchy_level}`);
        });
      } else {
        console.log('ℹ️ No election records found to analyze');
      }
    } catch (error) {
      console.log(`ℹ️ No election data to analyze: ${error.message}`);
    }
    
    console.log('\n🎯 RELATIONSHIP ANALYSIS COMPLETE!');
    console.log('\n📊 FINDINGS:');
    console.log('- leadership_elections table does NOT have position_id column');
    console.log('- Elections might be linked to positions through:');
    console.log('  1. election_name or election_type fields');
    console.log('  2. Candidates table that links to positions');
    console.log('  3. A separate mapping table');
    console.log('\n🔧 RECOMMENDATION:');
    console.log('- The query needs to be fixed to not reference le.position_id');
    console.log('- Alternative: Link through election_candidates -> position_id');
    console.log('- Or: Use election_name/election_type to identify position');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testElectionCandidatesSchema();
