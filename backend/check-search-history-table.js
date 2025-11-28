/**
 * Check the current structure of the search_history table
 * and fix the missing search_filters column
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function checkAndFixSearchHistoryTable() {
  console.log('🔍 Checking search_history table structure...');
  
  try {
    // Check current table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'search_history' 
      ORDER BY ordinal_position
    `;
    
    const structureResult = await pool.query(structureQuery);
    console.log('\n📋 Current search_history table structure:');
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if search_filters column exists
    const hasSearchFilters = structureResult.rows.some(row => row.column_name === 'search_filters');
    
    if (hasSearchFilters) {
      console.log('\n✅ search_filters column already exists');
    } else {
      console.log('\n❌ search_filters column is missing - adding it now...');
      
      // Add the missing column
      const addColumnQuery = `
        ALTER TABLE search_history 
        ADD COLUMN search_filters TEXT
      `;
      
      await pool.query(addColumnQuery);
      console.log('✅ Successfully added search_filters column');
      
      // Verify the column was added
      const verifyResult = await pool.query(structureQuery);
      console.log('\n📋 Updated search_history table structure:');
      verifyResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Test inserting a record to make sure everything works
    console.log('\n🧪 Testing insert with search_filters...');
    const testInsertQuery = `
      INSERT INTO search_history 
      (user_id, search_query, search_filters, results_count, execution_time_ms, search_type, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const testResult = await pool.query(testInsertQuery, [
      1,
      'test_query',
      '{"test": true}',
      5,
      100,
      'test',
      '127.0.0.1',
      'test-agent'
    ]);
    
    console.log(`✅ Test insert successful! Record ID: ${testResult.rows[0].id}`);
    
    // Clean up test record
    await pool.query('DELETE FROM search_history WHERE id = $1', [testResult.rows[0].id]);
    console.log('✅ Test record cleaned up');
    
    console.log('\n🎉 search_history table is now properly configured!');
    
  } catch (error) {
    console.error('❌ Error checking/fixing search_history table:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
checkAndFixSearchHistoryTable();
