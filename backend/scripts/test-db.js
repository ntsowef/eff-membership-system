const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    console.log('✅ Connected to database successfully!');
    
    // Test query
    const [rows] = await connection.execute('SELECT DATABASE() as current_db');
    console.log('Current database:', rows[0].current_db);
    
    // Check existing tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Existing tables:', tables.length);
    
    // Check if communication tables exist
    const [commTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'membership_new' 
      AND (TABLE_NAME LIKE '%communication%' OR TABLE_NAME LIKE '%message%')
    `);
    
    console.log('Communication tables found:', commTables.length);
    commTables.forEach(table => console.log('  -', table.TABLE_NAME));
    
    await connection.end();
    console.log('✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();
