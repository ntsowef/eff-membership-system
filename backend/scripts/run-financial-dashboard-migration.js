/**
 * Script to run the financial dashboard summary tables migration
 * This creates the necessary tables for the financial dashboard system
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
    console.log('🚀 Starting financial dashboard summary tables migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/023_financial_dashboard_summary_tables_corrected.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing migration SQL...\n');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the tables were created
    console.log('🔍 Verifying created tables...\n');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'daily_financial_summary',
        'monthly_financial_summary',
        'financial_reviewer_performance',
        'payment_method_summary',
        'financial_kpi_tracking'
      )
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully created the following tables:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('⚠️  Warning: No tables found after migration');
    }
    
    // Test the financial_kpi_tracking table
    console.log('🧪 Testing financial_kpi_tracking table...\n');
    const testQuery = 'SELECT COUNT(*) as count FROM financial_kpi_tracking';
    const testResult = await client.query(testQuery);
    console.log(`✅ Table is accessible. Total KPI records: ${testResult.rows[0].count}\n`);
    
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

