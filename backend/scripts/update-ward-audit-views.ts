/**
 * Update Ward Audit Views with 90-Day Grace Period
 * This script updates the ward membership audit views to include the 90-day grace period
 */

import { initializeDatabase, closeDatabasePool, executeQuery } from '../src/config/database';
import * as fs from 'fs';
import * as path from 'path';

async function updateWardAuditViews() {
  console.log('🔄 Starting Ward Audit Views Update...\n');

  try {
    // Initialize database connection
    console.log('📊 Connecting to database...');
    await initializeDatabase();
    console.log('✅ Database connected\n');

    // Read the PostgreSQL SQL migration file
    const sqlFilePath = path.join(__dirname, '../database/migrations/update_ward_audit_views_with_grace_period_postgres.sql');
    console.log(`📄 Reading SQL file: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolons to execute each statement separately
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove empty statements and comment-only statements
        if (stmt.length === 0) return false;
        const lines = stmt.split('\n').filter(line => !line.trim().startsWith('--'));
        return lines.join('').trim().length > 0;
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('DROP VIEW') || statement.includes('CREATE VIEW')) {
        const viewName = statement.match(/vw_\w+/)?.[0] || 'unknown';
        const action = statement.includes('DROP VIEW') ? 'Dropping' : 'Creating';
        console.log(`🔄 ${action} view ${i + 1}/${statements.length}: ${viewName}...`);

        try {
          await executeQuery(statement);
          console.log(`✅ Successfully ${action.toLowerCase()}: ${viewName}\n`);
        } catch (error: any) {
          // If DROP VIEW fails because view doesn't exist, that's okay
          if (statement.includes('DROP VIEW') && error.message.includes('does not exist')) {
            console.log(`ℹ️  View ${viewName} doesn't exist, skipping drop\n`);
            continue;
          }
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ All views updated successfully!');
    console.log('\n📊 Updated Views:');
    console.log('  - vw_ward_membership_audit');
    console.log('  - vw_ward_membership_trends');
    console.log('\n🎯 Changes Applied:');
    console.log('  - Active members now include 90-day grace period');
    console.log('  - Formula: expiry_date >= CURDATE() - INTERVAL 90 DAY');
    console.log('  - This matches the business rule for active membership status\n');

  } catch (error: any) {
    console.error('\n❌ Error updating ward audit views:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabasePool();
    console.log('✅ Database connection closed');
  }
}

// Run the update
updateWardAuditViews()
  .then(() => {
    console.log('\n🎉 Ward Audit Views Update Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

