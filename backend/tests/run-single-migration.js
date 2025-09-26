const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_new',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function runSingleMigration(migrationFile) {
  let connection;
  
  try {
    console.log(`🔄 Running migration: ${migrationFile}`);
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute migration
    await connection.query(migrationSQL);
    console.log(`✅ Migration ${migrationFile} executed successfully`);
    
    // Log to migration history
    await connection.query(`
      INSERT INTO migration_history (migration_name, executed_at, status) 
      VALUES (?, NOW(), 'completed')
      ON DUPLICATE KEY UPDATE executed_at = NOW(), status = 'completed'
    `, [migrationFile]);
    
    console.log('✅ Migration logged to history');
    
  } catch (error) {
    console.error(`❌ Failed to execute migration ${migrationFile}:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide migration file name as argument');
  console.log('Usage: node run-single-migration.js <migration-file.sql>');
  process.exit(1);
}

// Run the migration
runSingleMigration(migrationFile)
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  });
