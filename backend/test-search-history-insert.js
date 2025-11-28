/**
 * Test the exact INSERT query that's failing in the logs
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

async function testSearchHistoryInsert() {
  console.log('🧪 Testing the exact INSERT query that\'s failing...');
  
  try {
    // Test the exact query from the error logs
    const failingQuery = `
      INSERT INTO search_history 
      (user_id, search_query, search_filters, results_count, execution_time_ms, search_type, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const params = [
      1,
      'test',
      '{"search":"test","has_email":true}',
      0,
      1002,
      'advanced',
      '::1',
      'axios/1.11.0'
    ];
    
    console.log('Query:', failingQuery);
    console.log('Params:', params);
    
    const result = await pool.query(failingQuery, params);
    console.log('✅ INSERT successful!');
    console.log('Inserted record ID:', result.rowCount);
    
    // Check what was actually inserted
    const selectQuery = `
      SELECT * FROM search_history 
      WHERE user_id = $1 AND search_query = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const selectResult = await pool.query(selectQuery, [1, 'test']);
    if (selectResult.rows.length > 0) {
      console.log('\n📋 Inserted record:');
      console.log(selectResult.rows[0]);
      
      // Clean up
      await pool.query('DELETE FROM search_history WHERE id = $1', [selectResult.rows[0].id]);
      console.log('✅ Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ INSERT failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    
    // Let's check if the issue is with parameter placeholders
    console.log('\n🔍 Testing with MySQL-style placeholders...');
    try {
      const mysqlStyleQuery = `
        INSERT INTO search_history 
        (user_id, search_query, search_filters, results_count, execution_time_ms, search_type, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // This should fail because PostgreSQL doesn't use ? placeholders
      await pool.query(mysqlStyleQuery, params);
    } catch (mysqlError) {
      console.log('❌ MySQL-style placeholders failed as expected:', mysqlError.message);
      console.log('This confirms the issue is with parameter placeholder conversion');
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testSearchHistoryInsert();
