const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'eff_membership_database',
  });

  try {
    console.log('🚀 Running migration to fix vw_member_details view...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'fix-vw-member-details-use-consolidated.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the counts
    const viewCountQuery = 'SELECT COUNT(*) as count FROM vw_member_details';
    const viewCountResult = await pool.query(viewCountQuery);
    console.log(`📊 Count in vw_member_details (after fix): ${viewCountResult.rows[0].count}`);

    const consolidatedCountQuery = 'SELECT COUNT(*) as count FROM members_consolidated';
    const consolidatedCountResult = await pool.query(consolidatedCountQuery);
    console.log(`📊 Count in members_consolidated: ${consolidatedCountResult.rows[0].count}`);

    if (viewCountResult.rows[0].count === consolidatedCountResult.rows[0].count) {
      console.log('\n✅ SUCCESS! Counts match - the view is now using members_consolidated!');
    } else {
      console.log('\n⚠️  WARNING: Counts do not match. Please investigate.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runMigration();

