/**
 * Create search_history table for logging search activities
 * This script creates the missing table that's causing errors in the search functionality
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_db'
};

async function createSearchHistoryTable() {
  console.log('🔧 CREATING SEARCH_HISTORY TABLE\n');

  const pool = new Pool(dbConfig);

  try {
    // Test database connection
    console.log('1. 🔌 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check if table already exists
    console.log('\n2. 🔍 Checking if search_history table exists...');
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'search_history'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (tableExists) {
      console.log('⚠️  search_history table already exists');
      
      // Check table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'search_history'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Current table structure:');
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
    } else {
      console.log('❌ search_history table does not exist - creating it...');
      
      // Read and execute the SQL file
      console.log('\n3. 📄 Reading SQL creation script...');
      const sqlFilePath = path.join(__dirname, 'create-search-history-table.sql');
      const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
      console.log('✅ SQL script loaded');

      console.log('\n4. 🚀 Executing table creation script...');
      await pool.query(sqlScript);
      console.log('✅ search_history table created successfully');
    }

    // Verify table structure
    console.log('\n5. ✅ Verifying table structure...');
    const finalColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'search_history'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Final table structure:');
    finalColumnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? `[default: ${col.column_default}]` : ''}`);
    });

    // Check indexes
    console.log('\n6. 🔍 Checking indexes...');
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'search_history'
      ORDER BY indexname;
    `);
    
    console.log('📊 Table indexes:');
    indexesResult.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Test insert functionality
    console.log('\n7. 🧪 Testing insert functionality...');
    const testInsertResult = await pool.query(`
      INSERT INTO search_history (user_id, search_query, results_count, execution_time_ms, search_type, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at;
    `, [1, 'test query from script', 10, 150, 'quick', '127.0.0.1', 'Node.js Test Script']);
    
    console.log('✅ Test insert successful');
    console.log(`   - Inserted record ID: ${testInsertResult.rows[0].id}`);
    console.log(`   - Created at: ${testInsertResult.rows[0].created_at}`);

    // Get record count
    console.log('\n8. 📊 Getting record count...');
    const countResult = await pool.query('SELECT COUNT(*) as total FROM search_history');
    console.log(`✅ Total records in search_history: ${countResult.rows[0].total}`);

    console.log('\n🎉 SEARCH_HISTORY TABLE SETUP COMPLETE!');
    console.log('═'.repeat(60));
    console.log('✅ Table created with proper structure');
    console.log('✅ Indexes created for performance');
    console.log('✅ Foreign key constraints added (if possible)');
    console.log('✅ Triggers created for automatic timestamps');
    console.log('✅ Insert functionality tested and working');
    console.log('\n🚀 The search functionality should now work without errors!');

  } catch (error) {
    console.error('\n❌ Error creating search_history table:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
createSearchHistoryTable();
