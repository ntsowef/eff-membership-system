/**
 * Add missing search_filters column to search_history table
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

async function addSearchFiltersColumn() {
  console.log('🔧 Adding search_filters column to search_history table...');
  
  try {
    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'search_history' 
      AND column_name = 'search_filters'
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ search_filters column already exists');
      return;
    }
    
    // Add the missing column
    const addColumnQuery = `
      ALTER TABLE search_history 
      ADD COLUMN search_filters TEXT
    `;
    
    await pool.query(addColumnQuery);
    console.log('✅ Successfully added search_filters column to search_history table');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'search_history' 
      AND column_name = 'search_filters'
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verification successful:', verifyResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error adding search_filters column:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
addSearchFiltersColumn();
