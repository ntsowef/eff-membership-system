const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.postgres') });

async function createDatabaseBackupsTable() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'ChangeThis!SuperSecure123',
    database: 'eff_membership_db'
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '../database-recovery/create-database-backups-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Creating database_backups table...');
    
    // Execute SQL
    await pool.query(sql);

    console.log('✅ database_backups table created successfully!');
    console.log('');
    console.log('Table structure:');
    console.log('  - backup_id (SERIAL PRIMARY KEY)');
    console.log('  - filename (VARCHAR)');
    console.log('  - filepath (TEXT)');
    console.log('  - size (BIGINT)');
    console.log('  - status (VARCHAR) - success, failed, in_progress');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - completed_at (TIMESTAMP)');
    console.log('  - error_message (TEXT)');
    console.log('  - created_by (INTEGER)');

  } catch (error) {
    console.error('❌ Error creating database_backups table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
createDatabaseBackupsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

