const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // Run member_renewal_log migration
    console.log('🔄 Running member_renewal_log migration...');
    const sql1 = fs.readFileSync(
      path.join(__dirname, '..', 'database-recovery', 'create_member_renewal_log.sql'),
      'utf8'
    );
    await client.query(sql1);
    console.log('✅ member_renewal_log table created successfully');

    // Run provincial_admin_performance_metrics migration
    console.log('🔄 Running provincial_admin_performance_metrics migration...');
    const sql2 = fs.readFileSync(
      path.join(__dirname, '..', 'database-recovery', 'create_provincial_admin_performance_metrics.sql'),
      'utf8'
    );
    await client.query(sql2);
    console.log('✅ provincial_admin_performance_metrics table created successfully');

    // Verify tables exist
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('member_renewal_log', 'provincial_admin_performance_metrics')
      ORDER BY table_name;
    `);
    console.log('\n📊 Verified tables:');
    verifyResult.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));

    // Show column details for member_renewal_log
    const cols1 = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'member_renewal_log' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 member_renewal_log columns:');
    cols1.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(25)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Show column details for provincial_admin_performance_metrics
    const cols2 = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'provincial_admin_performance_metrics' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 provincial_admin_performance_metrics columns:');
    cols2.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(35)} ${row.data_type.padEnd(25)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

