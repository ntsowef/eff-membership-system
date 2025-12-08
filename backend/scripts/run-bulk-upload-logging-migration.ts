/**
 * Run Bulk Upload Logging Tables Migration
 * 
 * Creates the bulk_upload_logs and bulk_upload_performance_metrics tables
 * for comprehensive logging and audit trail
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'eff_membership',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

async function runMigration() {
  const pool = new Pool(dbConfig);

  try {
    console.log('🔄 Starting bulk upload logging tables migration...');
    console.log(`   Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_bulk_upload_logging_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - bulk_upload_logs');
    console.log('   - bulk_upload_performance_metrics');

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bulk_upload_logs', 'bulk_upload_performance_metrics')
      ORDER BY table_name
    `);

    console.log('\n✅ Verified tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Get table details
    console.log('\n📋 Table details:');

    // bulk_upload_logs
    const logsColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bulk_upload_logs'
      ORDER BY ordinal_position
    `);
    console.log('\n   bulk_upload_logs:');
    console.log(`   Columns: ${logsColumnsResult.rows.length}`);

    // bulk_upload_performance_metrics
    const metricsColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bulk_upload_performance_metrics'
      ORDER BY ordinal_position
    `);
    console.log('\n   bulk_upload_performance_metrics:');
    console.log(`   Columns: ${metricsColumnsResult.rows.length}`);

    // Get indexes
    const indexesResult = await pool.query(`
      SELECT 
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('bulk_upload_logs', 'bulk_upload_performance_metrics')
      ORDER BY tablename, indexname
    `);

    console.log('\n📑 Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.tablename}.${row.indexname}`);
    });

    console.log('\n✅ Migration verification complete!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();

