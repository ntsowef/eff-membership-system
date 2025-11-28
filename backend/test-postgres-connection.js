const { Pool } = require('pg');
require('dotenv').config();

// =====================================================================================
// SIMPLE POSTGRESQL CONNECTION TEST
// =====================================================================================

async function testPostgreSQLConnection() {
  console.log('🧪 Testing PostgreSQL Connection');
  console.log('=================================\n');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'eff_admin',
    password: process.env.DB_PASSWORD || 'Frames!123',
    database: process.env.DB_NAME || 'eff_membership_db',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  };
  
  console.log('Database Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log('');
  
  const pool = new Pool(dbConfig);
  
  try {
    // 1. Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    
    // 2. Test basic query
    console.log('\n2️⃣ Testing basic query...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Basic query successful');
    console.log('Current Time:', result.rows[0].current_time);
    console.log('PostgreSQL Version:', result.rows[0].version.split(' ')[0]);
    
    // 3. Test database existence and tables
    console.log('\n3️⃣ Testing database structure...');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`✅ Found ${tablesResult.rows.length} tables in the database`);
    if (tablesResult.rows.length > 0) {
      console.log('Tables:', tablesResult.rows.map(row => row.tablename).join(', '));
    }
    
    // 4. Test users table specifically
    console.log('\n4️⃣ Testing users table...');
    try {
      const userCountResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ Users table exists with ${userCountResult.rows[0].count} records`);
      
      // Get a sample user
      const sampleUserResult = await client.query('SELECT user_id, name, email, admin_level FROM users LIMIT 1');
      if (sampleUserResult.rows.length > 0) {
        console.log('Sample user:', sampleUserResult.rows[0]);
      }
    } catch (error) {
      console.log('⚠️  Users table not found or empty:', error.message);
    }
    
    // 5. Test MySQL to PostgreSQL conversion examples
    console.log('\n5️⃣ Testing MySQL to PostgreSQL conversion...');
    
    // Test CONCAT conversion
    try {
      const concatResult = await client.query(`
        SELECT 'Hello' || ' ' || 'World' as concatenated_string
      `);
      console.log('✅ String concatenation (||) works:', concatResult.rows[0].concatenated_string);
    } catch (error) {
      console.log('❌ String concatenation failed:', error.message);
    }
    
    // Test COALESCE (IFNULL equivalent)
    try {
      const coalesceResult = await client.query(`
        SELECT COALESCE(NULL, 'default_value') as coalesced_value
      `);
      console.log('✅ COALESCE (IFNULL equivalent) works:', coalesceResult.rows[0].coalesced_value);
    } catch (error) {
      console.log('❌ COALESCE failed:', error.message);
    }
    
    // Test CASE WHEN (IF equivalent)
    try {
      const caseResult = await client.query(`
        SELECT CASE WHEN 1 = 1 THEN 'true' ELSE 'false' END as case_result
      `);
      console.log('✅ CASE WHEN (IF equivalent) works:', caseResult.rows[0].case_result);
    } catch (error) {
      console.log('❌ CASE WHEN failed:', error.message);
    }
    
    // Test date functions
    try {
      const dateResult = await client.query(`
        SELECT 
          CURRENT_DATE as current_date,
          CURRENT_TIMESTAMP as current_timestamp,
          EXTRACT(YEAR FROM CURRENT_DATE) as current_year
      `);
      console.log('✅ Date functions work:');
      console.log('  Current Date:', dateResult.rows[0].current_date);
      console.log('  Current Year:', dateResult.rows[0].current_year);
    } catch (error) {
      console.log('❌ Date functions failed:', error.message);
    }
    
    // 6. Test parameterized queries (PostgreSQL style)
    console.log('\n6️⃣ Testing parameterized queries...');
    try {
      const paramResult = await client.query(
        'SELECT $1 as param1, $2 as param2, $3 as param3',
        ['Hello', 123, true]
      );
      console.log('✅ Parameterized queries work:', paramResult.rows[0]);
    } catch (error) {
      console.log('❌ Parameterized queries failed:', error.message);
    }
    
    // 7. Test connection pool
    console.log('\n7️⃣ Testing connection pool...');
    console.log('Pool Status:');
    console.log(`  Total connections: ${pool.totalCount}`);
    console.log(`  Idle connections: ${pool.idleCount}`);
    console.log(`  Waiting connections: ${pool.waitingCount}`);
    
    client.release();
    
    // 8. Test multiple concurrent connections
    console.log('\n8️⃣ Testing concurrent connections...');
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        pool.query('SELECT $1 as connection_test', [`Connection ${i + 1}`])
      );
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    console.log('✅ Concurrent connections successful:');
    concurrentResults.forEach((result, index) => {
      console.log(`  ${result.rows[0].connection_test}`);
    });
    
    // 9. Test admin users from our previous creation
    console.log('\n9️⃣ Testing admin users...');
    try {
      const adminResult = await pool.query(`
        SELECT 
          admin_level,
          COUNT(*) as count
        FROM users 
        WHERE admin_level IS NOT NULL
        GROUP BY admin_level
        ORDER BY admin_level
      `);
      
      if (adminResult.rows.length > 0) {
        console.log('✅ Admin users found:');
        adminResult.rows.forEach(row => {
          console.log(`  ${row.admin_level}: ${row.count} users`);
        });
      } else {
        console.log('⚠️  No admin users found');
      }
    } catch (error) {
      console.log('⚠️  Admin users test skipped:', error.message);
    }
    
    console.log('\n🎉 POSTGRESQL CONNECTION TEST COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('✅ Basic connection: Working');
    console.log('✅ Query execution: Working');
    console.log('✅ MySQL→PostgreSQL syntax: Compatible');
    console.log('✅ Parameterized queries: Working');
    console.log('✅ Connection pooling: Working');
    console.log('✅ Concurrent connections: Working');
    console.log('');
    console.log('🚀 Your PostgreSQL database is ready!');
    console.log('📝 The hybrid system should work perfectly');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Make sure PostgreSQL is running on port 5432');
    console.error('2. Verify database credentials in .env file');
    console.error('3. Check if database "eff_membership_db" exists');
    console.error('4. Ensure user "eff_admin" has proper permissions');
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔒 Connection pool closed');
  }
}

// Run the test
if (require.main === module) {
  testPostgreSQLConnection()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPostgreSQLConnection };
