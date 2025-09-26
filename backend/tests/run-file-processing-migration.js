const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'membership_new',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_file_processing_jobs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL statements (in case there are multiple)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}...`);
        await connection.execute(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify table was created
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'file_processing_jobs'
    `, [process.env.DB_NAME || 'membership_new']);

    if (rows[0].count > 0) {
      console.log('✅ file_processing_jobs table created successfully');
      
      // Show table structure
      const [columns] = await connection.execute(`
        DESCRIBE file_processing_jobs
      `);
      
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('❌ Table creation may have failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
console.log('🚀 Starting file processing migration...');
runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
