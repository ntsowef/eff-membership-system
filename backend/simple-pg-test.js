const { Pool } = require('pg');
require('dotenv').config();

async function simpleTest() {
  console.log('Testing PostgreSQL connection...');
  
  const pool = new Pool({
    host: 'localhost',
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db',
    port: 5432,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Code:', error.code);
    await pool.end();
  }
}

simpleTest();
