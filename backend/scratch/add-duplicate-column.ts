import { initializeDatabase, executeUpdate } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    console.log('🚀 Starting database update...');
    await initializeDatabase();
    
    // Check if column already exists
    // (Note: executeUpdate is for non-SELECT queries)
    
    // 1. Add column if it doesn't exist
    // PostgreSQL ADD COLUMN IF NOT EXISTS is available in PG 9.6+
    console.log('--- Adding is_duplicate column ---');
    await executeUpdate(`
      ALTER TABLE members_consolidated 
      ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE
    `);
    
    // 2. Add index if it doesn't exist
    console.log('--- Adding index on is_duplicate ---');
    // CREATE INDEX IF NOT EXISTS is available in PG 9.5+
    await executeUpdate(`
      CREATE INDEX IF NOT EXISTS idx_members_consolidated_is_duplicate 
      ON members_consolidated(is_duplicate)
    `);
    
    console.log('✅ Database update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update database:', error);
    process.exit(1);
  }
}

main();
