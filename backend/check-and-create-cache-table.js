const mysql = require('mysql2/promise');

async function checkAndCreateCacheTable() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });

    console.log('🔍 Checking if financial_dashboard_cache table exists...\n');

    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND TABLE_NAME = 'financial_dashboard_cache'
    `);

    if (tables.length === 0) {
      console.log('❌ financial_dashboard_cache table does not exist. Creating it...');
      
      // Create the table
      await connection.execute(`
        CREATE TABLE financial_dashboard_cache (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cache_key VARCHAR(255) NOT NULL UNIQUE,
          cache_data LONGTEXT NOT NULL,
          cache_type VARCHAR(100) NOT NULL DEFAULT 'dashboard_metrics',
          expires_at DATETIME NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          data_size_bytes INT DEFAULT 0,
          is_valid BOOLEAN DEFAULT TRUE,
          INDEX idx_cache_key (cache_key),
          INDEX idx_expires_at (expires_at),
          INDEX idx_cache_type (cache_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      
      console.log('✅ Created financial_dashboard_cache table successfully!');
    } else {
      console.log('✅ financial_dashboard_cache table already exists');
    }

    // Test a simple insert and select
    console.log('\n📋 Testing cache table operations...');
    
    const testKey = 'test_key_' + Date.now();
    const testData = { test: 'data', timestamp: new Date().toISOString() };
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Insert test data
    await connection.execute(`
      INSERT INTO financial_dashboard_cache (
        cache_key, cache_data, cache_type, expires_at, data_size_bytes
      ) VALUES (?, ?, 'test', ?, ?)
    `, [
      testKey,
      JSON.stringify(testData),
      expiresAt,
      JSON.stringify(testData).length
    ]);

    console.log('✅ Test insert successful');

    // Select test data
    const [result] = await connection.execute(`
      SELECT cache_data, expires_at
      FROM financial_dashboard_cache
      WHERE cache_key = ? AND expires_at > NOW() AND is_valid = TRUE
    `, [testKey]);

    if (result.length > 0) {
      const retrievedData = JSON.parse(result[0].cache_data);
      console.log('✅ Test select successful');
      console.log('Retrieved data:', retrievedData);
    } else {
      console.log('❌ Test select failed - no data retrieved');
    }

    // Clean up test data
    await connection.execute(`
      DELETE FROM financial_dashboard_cache WHERE cache_key = ?
    `, [testKey]);

    console.log('✅ Test cleanup successful');

    console.log('\n🎉 Cache table is ready for use!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndCreateCacheTable();
