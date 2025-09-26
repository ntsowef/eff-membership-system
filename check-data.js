const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'membership_new'
  });
  
  try {
    console.log('Checking actual data in tables...');
    
    const [municipalities] = await connection.execute(`
      SELECT * FROM iec_municipality_mappings 
      WHERE province_code = 'EC' 
      LIMIT 5
    `);
    console.log('Municipality mappings:', municipalities);
    
    const [wards] = await connection.execute(`
      SELECT * FROM iec_ward_mappings 
      WHERE province_code = 'EC' 
      LIMIT 5
    `);
    console.log('Ward mappings:', wards);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkData();
