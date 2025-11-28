/**
 * Test to check voting_districts table schema
 */

const { Pool } = require('pg');

async function testVotingDistrictsSchema() {
  console.log('🔍 Testing voting_districts table schema...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    // Test 1: Check if voting_districts table exists and its columns
    console.log('\n1. Checking voting_districts table structure...');
    
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'voting_districts'
      ORDER BY ordinal_position
    `;
    
    const columns = await pool.query(schemaQuery);
    
    if (columns.rows.length === 0) {
      console.log('❌ voting_districts table does not exist!');
      return;
    }
    
    console.log('✅ voting_districts table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test 2: Check if vd_code column exists
    const hasVdCode = columns.rows.some(col => col.column_name === 'vd_code');
    console.log(`\n2. vd_code column exists: ${hasVdCode ? '✅ YES' : '❌ NO'}`);
    
    if (!hasVdCode) {
      console.log('❌ ISSUE IDENTIFIED: voting_districts table is missing vd_code column!');
      
      // Check what columns are available that might be related
      const relatedColumns = columns.rows.filter(col => 
        col.column_name.includes('code') || 
        col.column_name.includes('id') ||
        col.column_name.includes('district') ||
        col.column_name.includes('vd')
      );
      
      console.log('\nRelated columns found:');
      relatedColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // Test 3: Check members table for voting_district_code column
    console.log('\n3. Checking members table for voting_district_code...');
    
    const membersSchemaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'members' 
        AND column_name LIKE '%voting%'
      ORDER BY ordinal_position
    `;
    
    const membersColumns = await pool.query(membersSchemaQuery);
    
    if (membersColumns.rows.length > 0) {
      console.log('✅ Members table voting-related columns:');
      membersColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ No voting-related columns found in members table');
    }
    
    // Test 4: Try to get sample data to understand the structure
    console.log('\n4. Testing sample queries...');
    
    try {
      const countQuery = 'SELECT COUNT(*) as count FROM voting_districts';
      const countResult = await pool.query(countQuery);
      console.log(`✅ voting_districts table has ${countResult.rows[0].count} records`);
      
      // Try to get a sample record
      const sampleQuery = 'SELECT * FROM voting_districts LIMIT 1';
      const sampleResult = await pool.query(sampleQuery);
      
      if (sampleResult.rows.length > 0) {
        console.log('\n✅ Sample record from voting_districts:');
        console.log(JSON.stringify(sampleResult.rows[0], null, 2));
      } else {
        console.log('ℹ️ No records found in voting_districts table');
      }
      
    } catch (error) {
      console.log(`❌ Error querying voting_districts: ${error.message}`);
    }
    
    // Test 5: Check if there's a view or alternative table
    console.log('\n5. Checking for alternative voting district tables/views...');
    
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%voting%' OR table_name LIKE '%district%')
      ORDER BY table_name
    `;
    
    const tables = await pool.query(tablesQuery);
    console.log('✅ Voting/District related tables:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });
    
    // Test 6: Check what the correct column name should be
    console.log('\n6. Analyzing correct column mapping...');
    
    const votingDistrictColumns = columns.rows.map(col => col.column_name);
    console.log('Available columns in voting_districts:');
    votingDistrictColumns.forEach(col => {
      console.log(`  - ${col}`);
    });
    
    // Suggest the correct mapping
    console.log('\n🔧 COLUMN MAPPING ANALYSIS:');
    
    if (votingDistrictColumns.includes('voting_district_code')) {
      console.log('✅ FOUND: voting_district_code - should use this instead of vd_code');
    } else if (votingDistrictColumns.includes('district_code')) {
      console.log('✅ FOUND: district_code - should use this instead of vd_code');
    } else if (votingDistrictColumns.includes('code')) {
      console.log('✅ FOUND: code - should use this instead of vd_code');
    } else if (votingDistrictColumns.includes('id')) {
      console.log('✅ FOUND: id - might be the primary key to use instead of vd_code');
    } else {
      console.log('❌ No obvious replacement for vd_code found');
    }
    
    console.log('\n🎯 SCHEMA ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testVotingDistrictsSchema();
