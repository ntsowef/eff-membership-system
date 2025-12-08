/**
 * Script to run the unified financial transactions view migration
 * This creates the necessary views for the financial transaction query system
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eff_membership_db',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting unified financial transactions view migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/021_unified_financial_transactions_view_corrected.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing migration SQL...\n');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the views were created
    console.log('🔍 Verifying created views...\n');
    
    const viewsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'unified_financial_transactions',
        'financial_transactions_summary',
        'pending_financial_reviews',
        'financial_audit_trail_view'
      )
      ORDER BY table_name;
    `;
    
    const result = await client.query(viewsQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully created the following views:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('⚠️  Warning: No views found after migration');
    }
    
    // Test the main view
    console.log('🧪 Testing unified_financial_transactions view...\n');
    const testQuery = 'SELECT COUNT(*) as count FROM unified_financial_transactions';
    const testResult = await client.query(testQuery);
    console.log(`✅ View is accessible. Total transactions: ${testResult.rows[0].count}\n`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

