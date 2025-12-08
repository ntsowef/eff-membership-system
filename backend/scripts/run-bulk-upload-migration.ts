import { getPool, initializeDatabase } from '../src/config/database-hybrid';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Initializing database connection...');
    await initializeDatabase();

    console.log('🔄 Running bulk_upload_jobs table migration...');

    const pool = getPool();
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_bulk_upload_jobs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify table was created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'bulk_upload_jobs'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table bulk_upload_jobs exists');

      // Show table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'bulk_upload_jobs'
        ORDER BY ordinal_position
      `);

      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('❌ Table bulk_upload_jobs was not created');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

