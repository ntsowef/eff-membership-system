const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function deploySchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new',
    multipleStatements: true
  });

  console.log('Connected to database');

  // Read and execute schema
  const schemaPath = path.join(__dirname, '../database/migrations/communication_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    await connection.execute(schema);
    console.log('✅ Communication schema deployed successfully!');
    
    // Check created tables
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE '%communication%' OR 
      SHOW TABLES LIKE '%message%'
    `);
    
    console.log('Created tables:', tables);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await connection.end();
}

deploySchema().catch(console.error);
