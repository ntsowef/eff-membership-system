const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.postgres') });

async function verifyBackupTable() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'eff_admin',
    password: 'Frames!123',
    database: 'eff_membership_db'
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'database_backups'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      console.log('✅ database_backups table EXISTS!');
      
      // Get table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'database_backups'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table Structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });

      // Get row count
      const count = await pool.query('SELECT COUNT(*) FROM database_backups');
      console.log(`\n📊 Total backups: ${count.rows[0].count}`);

    } else {
      console.log('❌ database_backups table DOES NOT EXIST!');
      console.log('\n🔧 Creating table now...');
      
      // Create table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS database_backups (
          backup_id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          filepath TEXT NOT NULL,
          size BIGINT DEFAULT 0,
          status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          error_message TEXT,
          created_by INTEGER REFERENCES users(user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
        CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups(created_at DESC);
      `);

      console.log('✅ Table created successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
verifyBackupTable()
  .then(() => {
    console.log('\n✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });

