/**
 * Run Database Migration Script
 * Executes the gender column migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_db'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_gender_column_to_membership_applications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🗄️  Executing migration...\n');
    
    // Execute migration
    const result = await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'membership_applications'
      AND column_name = 'gender';
    `;
    
    const verification = await client.query(verifyQuery);
    
    if (verification.rows.length > 0) {
      console.log('✅ Verification: gender column exists');
      console.log('   Column details:', verification.rows[0]);
    } else {
      console.log('⚠️  Warning: gender column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

