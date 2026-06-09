const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--confirm');

  console.log('='.repeat(70));
  console.log('🗳️  DELETE & ARCHIVE UNREGISTERED VOTERS CLEANUP SCRIPT');
  console.log('='.repeat(70));
  console.log(`Target Host:    ${pool.options.host}`);
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY RUN (No changes will be applied)' : '🚀 ACTIVE MODE (Archive & Deletions will be executed)'}`);
  if (isDryRun && !args.includes('--dry-run')) {
    console.log('💡 Note: Defaulted to DRY RUN. Pass --confirm to execute changes.');
  }
  console.log('='.repeat(70));

  try {
    // 1. Count target members in members_consolidated
    const consolidatedCountRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members_consolidated 
      WHERE is_registered_voter = false
    `);
    const consolidatedCount = parseInt(consolidatedCountRes.rows[0].count, 10);
    console.log(`Target unregistered members in 'members_consolidated': ${consolidatedCount.toLocaleString()}`);

    // 2. Count matching members in legacy members table (by id_number)
    const legacyCountRes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM members m
      JOIN members_consolidated mc ON m.id_number = mc.id_number
      WHERE mc.is_registered_voter = false
    `);
    const legacyCount = parseInt(legacyCountRes.rows[0].count, 10);
    console.log(`Matching target members in legacy 'members' table: ${legacyCount.toLocaleString()}`);

    if (consolidatedCount === 0) {
      console.log('\n✅ No unregistered voters (is_registered_voter = false) found in the database. Nothing to clean up.');
      return;
    }

    if (isDryRun) {
      console.log('\n🔍 DRY RUN SUMMARY:');
      console.log(`- Would archive ${consolidatedCount.toLocaleString()} members to 'members_unregistered_archive'.`);
      console.log(`- Would delete ${consolidatedCount.toLocaleString()} members from 'members_consolidated'.`);
      console.log(`- Would delete ${legacyCount.toLocaleString()} members from legacy 'members'.`);
      console.log('- Would cascade/set-null dependent records in referencing tables.');
      console.log('- Would pre-emptively delete referencing rows in whatsapp_bot_logs, whatsapp_bot_sessions, and whatsapp_notification_queue.');
      console.log('- Would refresh all 6 materialized views.');
      console.log('\nRun with --confirm to execute the archive and deletion.');
      return;
    }

    // ACTIVE MODE EXECUTION
    console.log('\n⚠️ Starting active archive and deletion in database. Initializing transaction...');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Step 1: Create the archive table if it doesn't exist
      console.log('[*] Preparing archive table members_unregistered_archive...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS members_unregistered_archive (
          LIKE members_consolidated INCLUDING DEFAULTS
        )
      `);
      
      // Step 2: Add archived_at column to archive table if it doesn't exist
      await client.query(`
        ALTER TABLE members_unregistered_archive 
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NOW()
      `);

      // Step 3: Get columns dynamically from members_consolidated to perform a safe explicit copy
      const colsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'members_consolidated' 
        ORDER BY ordinal_position
      `);
      const columns = colsRes.rows.map(r => r.column_name);
      const columnsStr = columns.join(', ');

      // Step 4: Copy records to archive table
      console.log(`[*] Copying ${consolidatedCount.toLocaleString()} unregistered members to members_unregistered_archive...`);
      const copyQuery = `
        INSERT INTO members_unregistered_archive (${columnsStr}, archived_at)
        SELECT ${columnsStr}, NOW()
        FROM members_consolidated mc
        WHERE mc.is_registered_voter = false
          AND NOT EXISTS (
            SELECT 1 FROM members_unregistered_archive loa 
            WHERE loa.member_id = mc.member_id
          )
      `;
      const copyRes = await client.query(copyQuery);
      console.log(`   Archived ${copyRes.rowCount} rows.`);

      // Step 4.5: Clean up NO ACTION / RESTRICT referencing tables to prevent foreign key errors on remote server
      console.log(`[*] Pre-emptively deleting referencing records in whatsapp_bot_logs, whatsapp_bot_sessions, and whatsapp_notification_queue...`);
      
      const waLogsDeleteRes = await client.query(`
        DELETE FROM whatsapp_bot_logs 
        WHERE member_id IN (
          SELECT member_id 
          FROM members_consolidated 
          WHERE is_registered_voter = false
        )
      `);
      console.log(`   Deleted ${waLogsDeleteRes.rowCount} rows from 'whatsapp_bot_logs'.`);

      const waSessionsDeleteRes = await client.query(`
        DELETE FROM whatsapp_bot_sessions 
        WHERE member_id IN (
          SELECT member_id 
          FROM members_consolidated 
          WHERE is_registered_voter = false
        )
      `);
      console.log(`   Deleted ${waSessionsDeleteRes.rowCount} rows from 'whatsapp_bot_sessions'.`);

      const waQueueDeleteRes = await client.query(`
        DELETE FROM whatsapp_notification_queue 
        WHERE member_id IN (
          SELECT member_id 
          FROM members_consolidated 
          WHERE is_registered_voter = false
        )
      `);
      console.log(`   Deleted ${waQueueDeleteRes.rowCount} rows from 'whatsapp_notification_queue'.`);

      // Step 5: Delete from legacy members table first
      console.log(`[*] Deleting ${legacyCount.toLocaleString()} matching records from legacy 'members' table...`);
      const legacyDeleteRes = await client.query(`
        DELETE FROM members 
        WHERE id_number IN (
          SELECT id_number 
          FROM members_consolidated 
          WHERE is_registered_voter = false
        )
      `);
      console.log(`   Deleted ${legacyDeleteRes.rowCount} rows from 'members' table.`);

      // Step 6: Delete from members_consolidated table
      console.log(`[*] Deleting ${consolidatedCount.toLocaleString()} records from 'members_consolidated' table...`);
      const consolidatedDeleteRes = await client.query(`
        DELETE FROM members_consolidated 
        WHERE is_registered_voter = false
      `);
      console.log(`   Deleted ${consolidatedDeleteRes.rowCount} rows from 'members_consolidated' table.`);

      await client.query('COMMIT');
      console.log('✅ Database transaction committed successfully! Archive and deletion completed.');

    } catch (txError) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back due to error:', txError);
      throw txError;
    } finally {
      client.release();
    }

    // Step 7: Refresh Materialized Views
    console.log('\n🔄 Refreshing materialized views (this may take a few minutes)...');
    const views = [
      'mv_hierarchical_dashboard_stats',
      'mv_membership_analytics_summary',
      'mv_geographic_performance',
      'mv_membership_growth_monthly',
      'mv_voting_district_compliance',
      'mv_ward_compliance_summary'
    ];

    for (const view of views) {
      console.log(`[*] Refreshing view: ${view}...`);
      const start = Date.now();
      await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`   Refreshed in ${duration}s.`);
    }

    console.log('\n🎉 ALL OPERATIONS COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
