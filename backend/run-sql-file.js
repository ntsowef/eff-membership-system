/**
 * Run SQL File Script
 * Executes a SQL file against the PostgreSQL database
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db',
});

async function runSqlFile(filePath) {
  try {
    console.log(`📄 Reading SQL file: ${filePath}`);
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`✅ File read successfully (${sqlContent.length} characters)`);
    console.log(`🔄 Executing SQL...`);
    
    // Execute the SQL
    const result = await pool.query(sqlContent);
    
    console.log(`✅ SQL executed successfully!`);
    
    // If there are results, display them
    if (result.rows && result.rows.length > 0) {
      console.log('\n📊 Results:');
      console.table(result.rows);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error executing SQL file:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Please provide a SQL file path as an argument');
  console.error('Usage: node run-sql-file.js <path-to-sql-file>');
  process.exit(1);
}

// Resolve the file path
const resolvedPath = path.resolve(filePath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ File not found: ${resolvedPath}`);
  process.exit(1);
}

// Run the SQL file
runSqlFile(resolvedPath).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

