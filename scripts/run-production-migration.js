/**
 * Production Database Migration Script
 * Applies member_renewal_log and provincial_admin_performance_metrics tables to production
 * Production server: 69.164.245.173 (api.effmemberportal.org)
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const PRODUCTION_HOST = '69.164.245.173';

const pool = new Pool({
  host: PRODUCTION_HOST,
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database',
  connectionTimeoutMillis: 10000,
  ssl: false
});

async function runProductionMigration() {
  console.log(`\n🚀 Connecting to PRODUCTION database at ${PRODUCTION_HOST}...`);
  
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to production database successfully\n');
  } catch (connErr) {
    console.error(`❌ Failed to connect to production database at ${PRODUCTION_HOST}:5432`);
    console.error(`   Error: ${connErr.message}`);
    console.error('\n   Possible issues:');
    console.error('   - Production server may not allow remote PostgreSQL connections');
    console.error('   - Firewall may be blocking port 5432');
    console.error('   - pg_hba.conf may not allow remote connections');
    process.exit(1);
  }

  try {
    // First check if tables already exist
    console.log('🔍 Checking if tables already exist on production...');
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('member_renewal_log', 'provincial_admin_performance_metrics')
      ORDER BY table_name;
    `);
    
    if (existingTables.rows.length > 0) {
      console.log('   Existing tables found:');
      existingTables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log('   No existing tables found - proceeding with fresh creation');
    }

    // Run member_renewal_log migration
    console.log('\n🔄 Running member_renewal_log migration on PRODUCTION...');
    const sql1 = fs.readFileSync(
      path.join(__dirname, '..', 'database-recovery', 'create_member_renewal_log.sql'),
      'utf8'
    );
    await client.query(sql1);
    console.log('✅ member_renewal_log table created/verified on production');

    // Run provincial_admin_performance_metrics migration
    console.log('\n🔄 Running provincial_admin_performance_metrics migration on PRODUCTION...');
    const sql2 = fs.readFileSync(
      path.join(__dirname, '..', 'database-recovery', 'create_provincial_admin_performance_metrics.sql'),
      'utf8'
    );
    await client.query(sql2);
    console.log('✅ provincial_admin_performance_metrics table created/verified on production');

    // Verify tables exist
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('member_renewal_log', 'provincial_admin_performance_metrics')
      ORDER BY table_name;
    `);
    console.log('\n📊 Verified tables on PRODUCTION:');
    verifyResult.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));

    // Show column counts for verification
    const cols1 = await client.query(`
      SELECT COUNT(*) as col_count FROM information_schema.columns 
      WHERE table_name = 'member_renewal_log'
    `);
    const cols2 = await client.query(`
      SELECT COUNT(*) as col_count FROM information_schema.columns 
      WHERE table_name = 'provincial_admin_performance_metrics'
    `);
    console.log(`\n📋 member_renewal_log: ${cols1.rows[0].col_count} columns`);
    console.log(`📋 provincial_admin_performance_metrics: ${cols2.rows[0].col_count} columns`);

    // Show index counts
    const idx = await client.query(`
      SELECT tablename, COUNT(*) as idx_count
      FROM pg_indexes 
      WHERE tablename IN ('member_renewal_log', 'provincial_admin_performance_metrics')
      GROUP BY tablename
      ORDER BY tablename
    `);
    console.log('\n📈 Indexes created:');
    idx.rows.forEach(row => console.log(`  ${row.tablename}: ${row.idx_count} indexes`));

    console.log('\n🎉 Production migration completed successfully!');
    console.log(`   Server: ${PRODUCTION_HOST} (api.effmemberportal.org)`);
    console.log('   Database: eff_membership_database');
  } catch (error) {
    console.error('\n❌ Production migration FAILED:', error.message);
    console.error('   Full error:', error);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runProductionMigration().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});

